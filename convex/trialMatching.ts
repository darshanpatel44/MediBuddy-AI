import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

// Weight factors for different matching criteria (adjustable)
const WEIGHTS = {
  CONDITION_MATCH: 40, // Primary condition match is most important
  AGE_MATCH: 15, // Age range match
  GENDER_MATCH: 10, // Gender criteria match
  MEDICATION_MATCH: 15, // Medication relevance
  COMORBIDITY_MATCH: 10, // Comorbidity considerations
  LOCATION_MATCH: 5, // Location proximity
  ALLERGY_MATCH: 5, // Allergies (typically used for exclusion)
};

/**
 * Find matching trials for a patient based on consultation data
 * This is the main function that orchestrates the matching process
 */
export const findMatchingTrials = action({
  args: {
    consultationId: v.id("consultations"),
  },
  handler: async (ctx, args) => {
    // Get consultation data
    const consultation = await ctx.runQuery(api.consultations.get, {
      id: args.consultationId,
    });

    if (!consultation) {
      throw new ConvexError("Consultation not found");
    }

    if (!consultation.structuredData) {
      throw new ConvexError(
        "No structured medical data found for this consultation"
      );
    }

    // Get patient data (to access age, gender, etc.)
    const patient = await ctx.runQuery(api.users.getById, {
      id: consultation.patientId,
    });

    if (!patient) {
      throw new ConvexError("Patient not found");
    }

    // Get all active/recruiting clinical trials
    const allTrials = await ctx.runQuery(
      api.trialMatching.listActiveTrials,
      {}
    );

    if (allTrials.length === 0) {
      console.log("No active trials found in the database");
      return { matchedTrials: [], matchCount: 0 };
    }

    // Score each trial for the patient
    const scoredTrials = await scoreTrialsForPatient(
      consultation.structuredData,
      patient,
      allTrials
    );

    // Filter trials with a minimum relevance score (e.g., 50%)
    const MIN_RELEVANCE_SCORE = 50;
    const matchedTrials = scoredTrials.filter(
      (trial) => trial.relevanceScore >= MIN_RELEVANCE_SCORE
    );

    // Sort trials by relevance score (highest first)
    matchedTrials.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Store the matches in the database
    await storeTrialMatches(ctx, consultation, patient, matchedTrials);

    // Update the consultation with the matched trial IDs
    const matchedTrialIds = matchedTrials.map((trial) => trial.trial._id);
    await ctx.runMutation(
      internal.trialMatching.updateConsultationWithMatches,
      {
        consultationId: args.consultationId,
        matchedTrialIds,
      }
    );

    return {
      matchedTrials,
      matchCount: matchedTrials.length,
    };
  },
});

/**
 * Score all trials for a specific patient based on their medical data
 */
async function scoreTrialsForPatient(
  patientData: any,
  patient: Doc<"users">,
  trials: Doc<"clinicalTrials">[]
) {
  const scoredTrials = trials.map((trial) => {
    // Initialize the score components
    const scoreComponents: Record<string, { score: number; reason: string }> =
      {};

    // 1. Condition Match (highest weight)
    const conditionScore = scoreConditionMatch(patientData.conditions, trial);
    scoreComponents.conditionMatch = conditionScore;

    // 2. Age Match
    const ageScore = scoreAgeMatch(patient, trial);
    scoreComponents.ageMatch = ageScore;

    // 3. Gender Match
    const genderScore = scoreGenderMatch(patient, trial);
    scoreComponents.genderMatch = genderScore;

    // 4. Medication Match (consider current medications)
    const medicationScore = scoreMedicationMatch(
      patientData.medications,
      trial
    );
    scoreComponents.medicationMatch = medicationScore;

    // 5. Comorbidity Match (check for exclusion criteria)
    const comorbidityScore = scoreComorbidityMatch(
      patientData.comorbidities || [],
      trial
    );
    scoreComponents.comorbidityMatch = comorbidityScore;

    // 6. Allergy Match (mainly for exclusion)
    const allergyScore = scoreAllergyMatch(patientData.allergies, trial);
    scoreComponents.allergyMatch = allergyScore;

    // Calculate the total weighted score
    const totalScore = calculateTotalScore(scoreComponents);

    // Generate matching factors - reasons why this trial matches
    const matchingFactors = generateMatchingFactors(scoreComponents);

    return {
      trial,
      relevanceScore: Math.round(totalScore),
      scoreComponents,
      matchingFactors,
    };
  });

  return scoredTrials;
}

/**
 * Score the match between patient conditions and trial target conditions
 */
function scoreConditionMatch(
  patientConditions: { name: string; severity: string }[],
  trial: Doc<"clinicalTrials">
) {
  // Check if any of the patient's conditions match the trial's target conditions
  const patientConditionNames = patientConditions.map((c) =>
    c.name.toLowerCase()
  );

  // For each target condition, check if the patient has it
  const matchedConditions = trial.targetConditions.filter((condition) =>
    patientConditionNames.some(
      (patientCondition) =>
        patientCondition.includes(condition.toLowerCase()) ||
        condition.toLowerCase().includes(patientCondition)
    )
  );

  if (matchedConditions.length === 0) {
    return { score: 0, reason: "No matching conditions" };
  }

  // Calculate score based on the number of matching conditions
  // and their relevance to the trial's primary focus
  const matchRatio = matchedConditions.length / trial.targetConditions.length;
  const score = WEIGHTS.CONDITION_MATCH * matchRatio;

  return {
    score,
    reason: `Matched ${matchedConditions.length} condition(s): ${matchedConditions.join(", ")}`,
  };
}

/**
 * Score the match between patient age and trial age requirements
 */
function scoreAgeMatch(patient: Doc<"users">, trial: Doc<"clinicalTrials">) {
  // If no age requirements or patient age is missing, return neutral score
  if (!trial.ageRange || !patient.age) {
    return {
      score: WEIGHTS.AGE_MATCH / 2,
      reason: "Age criteria not applicable",
    };
  }

  const patientAge = patient.age;

  // Check if patient age is within trial age range
  if (patientAge >= trial.ageRange.min && patientAge <= trial.ageRange.max) {
    return {
      score: WEIGHTS.AGE_MATCH,
      reason: `Patient age (${patientAge}) within trial range (${trial.ageRange.min}-${trial.ageRange.max})`,
    };
  }

  // Calculate how close the patient is to the age range
  const minDiff = Math.abs(patientAge - trial.ageRange.min);
  const maxDiff = Math.abs(patientAge - trial.ageRange.max);
  const closestDiff = Math.min(minDiff, maxDiff);

  // Score decreases as the difference increases
  const diffPenalty = Math.min(closestDiff / 5, 1); // Cap at 1 (5 years difference)
  const score = Math.max(0, WEIGHTS.AGE_MATCH * (1 - diffPenalty));

  return {
    score,
    reason: `Patient age (${patientAge}) outside trial range (${trial.ageRange.min}-${trial.ageRange.max})`,
  };
}

/**
 * Score the match between patient gender and trial gender requirements
 */
function scoreGenderMatch(patient: Doc<"users">, trial: Doc<"clinicalTrials">) {
  // If no gender requirements or patient gender is missing, return full score
  if (!trial.genderRestriction || !patient.gender) {
    return { score: WEIGHTS.GENDER_MATCH, reason: "No gender restrictions" };
  }

  // Normalize gender values for comparison
  const patientGender = patient.gender.toLowerCase();
  const trialGender = trial.genderRestriction.toLowerCase();

  // Check if the trial accepts the patient's gender
  if (
    trialGender === "any" ||
    trialGender === "all" ||
    patientGender === trialGender ||
    (trialGender === "female" && patientGender === "f") ||
    (trialGender === "male" && patientGender === "m")
  ) {
    return {
      score: WEIGHTS.GENDER_MATCH,
      reason: `Gender criteria met (${patient.gender})`,
    };
  }

  // Gender mismatch is a hard exclusion
  return {
    score: 0,
    reason: `Gender criteria not met (${trial.genderRestriction} required)`,
  };
}

/**
 * Score the relevance of patient medications to the trial
 */
function scoreMedicationMatch(
  patientMedications: string[],
  trial: Doc<"clinicalTrials">
) {
  // For simplicity, we'll check if any medications are mentioned in exclusion criteria
  // In a real system, this would be more sophisticated with medication classes

  if (!patientMedications || patientMedications.length === 0) {
    return {
      score: WEIGHTS.MEDICATION_MATCH / 2,
      reason: "No medication data available",
    };
  }

  // Look for medication mentions in exclusion criteria
  const medicationExclusions = trial.exclusionCriteria.filter((criteria) =>
    patientMedications.some((med) =>
      criteria.toLowerCase().includes(med.toLowerCase())
    )
  );

  if (medicationExclusions.length > 0) {
    // Medications mentioned in exclusion criteria reduce the score
    const penaltyFactor = Math.min(medicationExclusions.length / 2, 1);
    const score = WEIGHTS.MEDICATION_MATCH * (1 - penaltyFactor);

    return {
      score,
      reason: `Some medications may conflict with trial requirements`,
    };
  }

  // No negative medication interactions found
  return {
    score: WEIGHTS.MEDICATION_MATCH,
    reason: "No medication conflicts identified",
  };
}

/**
 * Score the comorbidity match (often used for exclusion)
 */
function scoreComorbidityMatch(
  patientComorbidities: string[],
  trial: Doc<"clinicalTrials">
) {
  if (!patientComorbidities || patientComorbidities.length === 0) {
    return {
      score: WEIGHTS.COMORBIDITY_MATCH,
      reason: "No comorbidities to evaluate",
    };
  }

  // Check for mentions of comorbidities in exclusion criteria
  const comorbidityExclusions = trial.exclusionCriteria.filter((criteria) =>
    patientComorbidities.some((condition) =>
      criteria.toLowerCase().includes(condition.toLowerCase())
    )
  );

  if (comorbidityExclusions.length > 0) {
    // Each comorbidity found in exclusion criteria reduces the score
    const penaltyFactor = Math.min(comorbidityExclusions.length / 2, 1);
    const score = WEIGHTS.COMORBIDITY_MATCH * (1 - penaltyFactor);

    return {
      score,
      reason: `Some comorbidities may conflict with trial eligibility`,
    };
  }

  return {
    score: WEIGHTS.COMORBIDITY_MATCH,
    reason: "No comorbidity conflicts identified",
  };
}

/**
 * Score the allergy match (mainly for exclusion)
 */
function scoreAllergyMatch(
  patientAllergies: string[],
  trial: Doc<"clinicalTrials">
) {
  if (!patientAllergies || patientAllergies.length === 0) {
    return { score: WEIGHTS.ALLERGY_MATCH, reason: "No allergies to evaluate" };
  }

  // Check for mentions of allergies in exclusion criteria
  const allergyExclusions = trial.exclusionCriteria.filter((criteria) =>
    patientAllergies.some((allergy) =>
      criteria.toLowerCase().includes(allergy.toLowerCase())
    )
  );

  if (allergyExclusions.length > 0) {
    // Each allergy found in exclusion criteria reduces the score
    const penaltyFactor = Math.min(allergyExclusions.length / 2, 1);
    const score = WEIGHTS.ALLERGY_MATCH * (1 - penaltyFactor);

    return {
      score,
      reason: `Some allergies may conflict with trial eligibility`,
    };
  }

  return {
    score: WEIGHTS.ALLERGY_MATCH,
    reason: "No allergy conflicts identified",
  };
}

/**
 * Calculate the total weighted score from all components
 */
function calculateTotalScore(
  scoreComponents: Record<string, { score: number; reason: string }>
) {
  const totalWeightedScore = Object.values(scoreComponents).reduce(
    (sum, component) => sum + component.score,
    0
  );

  // Calculate percentage based on total possible score
  const totalPossibleScore = Object.values(WEIGHTS).reduce(
    (sum, weight) => sum + weight,
    0
  );
  const scorePercentage = (totalWeightedScore / totalPossibleScore) * 100;

  return Math.min(100, scorePercentage); // Cap at 100%
}

/**
 * Generate human-readable matching factors based on score components
 */
function generateMatchingFactors(
  scoreComponents: Record<string, { score: number; reason: string }>
) {
  const factors: string[] = [];

  // Add condition match as the primary factor if it exists
  if (scoreComponents.conditionMatch.score > 0) {
    factors.push("Primary condition match");
  }

  // Add age match if it's a good match
  if (scoreComponents.ageMatch.score > WEIGHTS.AGE_MATCH * 0.8) {
    factors.push("Age criteria match");
  }

  // Add gender match
  if (scoreComponents.genderMatch.score > 0) {
    factors.push("Gender criteria match");
  }

  // Add medication compatibility if good
  if (scoreComponents.medicationMatch.score > WEIGHTS.MEDICATION_MATCH * 0.8) {
    factors.push("Medication compatibility");
  }

  // Add comorbidity and allergy factors if they're good matches
  if (
    scoreComponents.comorbidityMatch.score >
    WEIGHTS.COMORBIDITY_MATCH * 0.8
  ) {
    factors.push("No conflicting comorbidities");
  }

  if (scoreComponents.allergyMatch.score > WEIGHTS.ALLERGY_MATCH * 0.8) {
    factors.push("No conflicting allergies");
  }

  return factors;
}

/**
 * Store the trial matches in the database
 */
async function storeTrialMatches(
  ctx: any,
  consultation: Doc<"consultations">,
  patient: Doc<"users">,
  matchedTrials: any[]
) {
  // First, check for existing matches to avoid duplicates
  const existingMatches = await ctx.runQuery(
    api.trialMatching.listMatchesForConsultation,
    {
      consultationId: consultation._id,
    }
  );

  const existingTrialIds = new Set(
    existingMatches.map((match) => match.trialId.toString())
  );

  // Store each match in the database
  for (const match of matchedTrials) {
    // Skip if already exists for this consultation
    if (existingTrialIds.has(match.trial._id.toString())) {
      continue;
    }

    // Create a new trial match record
    await ctx.runMutation(internal.trialMatching.createTrialMatch, {
      patientId: patient._id,
      trialId: match.trial._id,
      consultationId: consultation._id,
      relevanceScore: match.relevanceScore,
      matchReason: match.matchingFactors.join(", "),
      status: "pending",
      notificationStatus: "pending",
      consentStatus: "pending",
      matchDate: Date.now(),
    });
  }
}

/**
 * Internal mutation to update a consultation with matched trial IDs
 */
export const updateConsultationWithMatches = internalMutation({
  args: {
    consultationId: v.id("consultations"),
    matchedTrialIds: v.array(v.id("clinicalTrials")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.consultationId, {
      matchedTrialIds: args.matchedTrialIds,
      updatedAt: Date.now(),
    });

    return args.matchedTrialIds.length;
  },
});

/**
 * Create a trial match record
 */
export const createTrialMatch = internalMutation({
  args: {
    patientId: v.id("users"),
    trialId: v.id("clinicalTrials"),
    consultationId: v.id("consultations"),
    relevanceScore: v.number(),
    matchReason: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("enrolled")
    ),
    notificationStatus: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("viewed")
    ),
    consentStatus: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("enrolled")
    ),
    matchDate: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("trialMatches", {
      patientId: args.patientId,
      trialId: args.trialId,
      consultationId: args.consultationId,
      relevanceScore: args.relevanceScore,
      matchReason: args.matchReason,
      status: args.status,
      notificationStatus: args.notificationStatus,
      consentStatus: args.consentStatus,
      matchDate: args.matchDate,
      createdAt: Date.now(),
    });
  },
});

/**
 * Function to trigger matching after medical entity extraction
 */
export const runMatchingAfterExtraction = action({
  args: {
    consultationId: v.id("consultations"),
  },
  handler: async (ctx, args) => {
    return await ctx.runAction(api.trialMatching.findMatchingTrials, {
      consultationId: args.consultationId,
    });
  },
});

/**
 * Query to list active/recruiting trials
 */
export const listActiveTrials = query({
  args: {},
  handler: async (ctx) => {
    // Query recruiting trials
    const recruitingTrials = await ctx.db
      .query("clinicalTrials")
      .withIndex("by_status", (q) => q.eq("status", "recruiting"))
      .collect();

    // Query active trials
    const activeTrials = await ctx.db
      .query("clinicalTrials")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Combine and return both sets of trials
    return [...recruitingTrials, ...activeTrials];
  },
});

/**
 * Query to list matches for a consultation
 */
export const listMatchesForConsultation = query({
  args: {
    consultationId: v.id("consultations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trialMatches")
      .withIndex("by_consultation", (q) =>
        q.eq("consultationId", args.consultationId)
      )
      .collect();
  },
});

/**
 * Query to list matches for a patient
 */
export const listMatchesForPatient = query({
  args: {
    patientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trialMatches")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});

/**
 * Query to get trial details for matches
 */
export const getTrialDetailsForMatches = query({
  args: {
    matchIds: v.array(v.id("trialMatches")),
  },
  handler: async (ctx, args) => {
    const matches = await Promise.all(
      args.matchIds.map(async (id) => {
        const match = await ctx.db.get(id);
        if (!match) return null;

        const trial = await ctx.db.get(match.trialId);
        const patient = await ctx.db.get(match.patientId);

        if (!trial || !patient) return null;

        return {
          match,
          trial,
          patient: {
            id: patient._id,
            name: patient.name || "Unknown",
            age: patient.age,
            gender: patient.gender,
            conditions: patient.conditions || [],
          },
        };
      })
    );

    return matches.filter(Boolean);
  },
});

/**
 * Mutation to update trial match status
 */
export const updateMatchStatus = mutation({
  args: {
    matchId: v.id("trialMatches"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("enrolled")
    ),
    doctorNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new ConvexError("Trial match not found");
    }

    // Update the match status
    await ctx.db.patch(args.matchId, {
      status: args.status,
      consentStatus: args.status, // Keep in sync for now
      doctorNotes: args.doctorNotes,
      responseDate: Date.now(),
      updatedAt: Date.now(),
      // Add status history
      consentStatusHistory: [
        ...(match.consentStatusHistory || []),
        {
          status: args.status,
          timestamp: Date.now(),
          changedBy: "doctor",
          note: args.doctorNotes,
        },
      ],
    });

    return args.matchId;
  },
});
