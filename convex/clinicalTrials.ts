import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

// ClinicalTrials.gov API Configuration
interface ClinicalTrialsConfig {
  baseUrl: string;
  rateLimit: {
    requestsPerMinute: number;
    burstLimit: number;
  };
  cacheConfig: {
    ttl: number; // Time to live in seconds
    maxSize: number;
  };
}

// Trial Search Parameters
interface TrialSearchParams {
  conditions: string[];
  ageRange?: { min: number; max: number };
  gender?: string;
  location?: string;
  status?: "recruiting" | "active" | "completed" | "not_yet_recruiting";
  phase?: string[];
  studyType?: string;
  maxResults?: number;
}

// ClinicalTrials.gov API Response Structure
interface ClinicalTrialsApiResponse {
  studies: ClinicalTrialStudy[];
  totalCount: number;
  nextPageToken?: string;
}

interface ClinicalTrialStudy {
  protocolSection: {
    identificationModule: {
      nctId: string;
      briefTitle: string;
      officialTitle?: string;
    };
    statusModule: {
      overallStatus: string;
      lastUpdateDate: string;
      studyFirstSubmitDate: string;
    };
    descriptionModule?: {
      briefSummary?: string;
      detailedDescription?: string;
    };
    conditionsModule?: {
      conditions: string[];
    };
    designModule?: {
      studyType: string;
      phases?: string[];
      designInfo?: {
        allocation?: string;
        interventionModel?: string;
        primaryPurpose?: string;
        maskingInfo?: {
          masking?: string;
        };
      };
    };
    armsInterventionsModule?: {
      interventions?: Array<{
        type: string;
        name: string;
        description?: string;
      }>;
    };
    eligibilityModule?: {
      eligibilityCriteria?: string;
      healthyVolunteers?: boolean;
      sex?: string;
      minimumAge?: string;
      maximumAge?: string;
      stdAges?: string[];
    };
    contactsLocationsModule?: {
      locations?: Array<{
        facility?: string;
        city?: string;
        state?: string;
        country?: string;
        zip?: string;
        geoPoint?: {
          lat: number;
          lon: number;
        };
      }>;
      centralContacts?: Array<{
        name?: string;
        role?: string;
        phone?: string;
        email?: string;
      }>;
    };
    sponsorCollaboratorsModule?: {
      leadSponsor?: {
        name: string;
        class: string;
      };
      collaborators?: Array<{
        name: string;
        class: string;
      }>;
    };
  };
}

// Mapped Clinical Trial for MediBuddy
interface MappedClinicalTrial {
  nctId: string;
  title: string;
  description: string;
  sponsor: string;
  phase: string;
  status: string;
  conditions: string[];
  eligibilityCriteria: string[];
  exclusionCriteria: string[];
  locations: string[];
  ageRange?: {
    min: number;
    max: number;
  };
  genderRestriction?: string;
  studyType: string;
  lastUpdated: number;
  sourceUrl: string;
}

// Rate limiting state
const rateLimitState = {
  requests: [] as number[],
  lastReset: Date.now(),
};

// Configuration
const CONFIG: ClinicalTrialsConfig = {
  baseUrl: "https://clinicaltrials.gov/api/v2",
  rateLimit: {
    requestsPerMinute: 100,
    burstLimit: 10,
  },
  cacheConfig: {
    ttl: 3600, // 1 hour
    maxSize: 1000,
  },
};

/**
 * Rate limiting function
 */
function checkRateLimit(): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Clean old requests
  rateLimitState.requests = rateLimitState.requests.filter(
    (timestamp) => timestamp > oneMinuteAgo
  );

  // Check if we're within limits
  if (rateLimitState.requests.length >= CONFIG.rateLimit.requestsPerMinute) {
    return false;
  }

  // Add current request
  rateLimitState.requests.push(now);
  return true;
}

/**
 * Parse age string to number
 */
function parseAge(ageString?: string): number | undefined {
  if (!ageString) return undefined;

  const match = ageString.match(/(\d+)/);
  return match ? parseInt(match[1]) : undefined;
}

/**
 * Extract medical conditions from transcription text using pattern matching
 */
function extractConditionsFromTranscription(transcription: string): string[] {
  const conditions: string[] = [];
  const text = transcription.toLowerCase();

  // Common medical condition patterns and keywords
  const conditionPatterns = [
    // Specific conditions
    /\b(diabetes|diabetic)\b/g,
    /\b(hypertension|high blood pressure)\b/g,
    /\b(asthma|asthmatic)\b/g,
    /\b(cancer|carcinoma|tumor|malignancy)\b/g,
    /\b(heart disease|cardiac|cardiovascular)\b/g,
    /\b(arthritis|joint pain)\b/g,
    /\b(depression|anxiety|mental health)\b/g,
    /\b(migraine|headache)\b/g,
    /\b(obesity|overweight)\b/g,
    /\b(pneumonia|lung infection)\b/g,
    /\b(stroke|cerebrovascular)\b/g,
    /\b(kidney disease|renal)\b/g,
    /\b(liver disease|hepatic)\b/g,
    /\b(epilepsy|seizure)\b/g,
    /\b(copd|chronic obstructive)\b/g,
    /\b(fibromyalgia|chronic pain)\b/g,
    /\b(osteoporosis|bone loss)\b/g,
    /\b(thyroid|hyperthyroid|hypothyroid)\b/g,
    /\b(alzheimer|dementia)\b/g,
    /\b(parkinson|parkinsons)\b/g,
  ];

  // Contextual patterns for diagnosis
  const diagnosisPatterns = [
    /diagnosed with ([a-zA-Z\s]+)/g,
    /has ([a-zA-Z\s]+)/g,
    /suffering from ([a-zA-Z\s]+)/g,
    /condition is ([a-zA-Z\s]+)/g,
    /patient has ([a-zA-Z\s]+)/g,
  ];

  // Extract conditions using specific patterns
  conditionPatterns.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        const condition = match.trim();
        // Map common variations to standard terms
        let standardCondition = condition;
        if (condition.includes("diabetic") || condition.includes("diabetes")) {
          standardCondition = "diabetes";
        } else if (
          condition.includes("hypertension") ||
          condition.includes("high blood pressure")
        ) {
          standardCondition = "hypertension";
        } else if (
          condition.includes("heart") ||
          condition.includes("cardiac") ||
          condition.includes("cardiovascular")
        ) {
          standardCondition = "heart disease";
        } else if (
          condition.includes("cancer") ||
          condition.includes("carcinoma") ||
          condition.includes("tumor")
        ) {
          standardCondition = "cancer";
        }

        if (standardCondition && !conditions.includes(standardCondition)) {
          conditions.push(standardCondition);
        }
      });
    }
  });

  // Extract conditions from diagnostic context
  diagnosisPatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const condition = match[1].trim();
      // Filter out common non-conditions
      if (
        condition &&
        condition.length > 2 &&
        condition.length < 50 &&
        !condition.includes("appointment") &&
        !condition.includes("medication") &&
        !condition.includes("treatment") &&
        !conditions.includes(condition)
      ) {
        conditions.push(condition);
      }
    }
  });

  return conditions.filter((condition) => condition.length > 0);
}

/**
 * Map ClinicalTrials.gov study to MediBuddy format
 */
function mapStudyToTrial(study: ClinicalTrialStudy): MappedClinicalTrial {
  const protocol = study.protocolSection;

  // Extract age range
  const minAge = parseAge(protocol.eligibilityModule?.minimumAge);
  const maxAge = parseAge(protocol.eligibilityModule?.maximumAge);

  // Extract locations
  const locations =
    protocol.contactsLocationsModule?.locations?.map((loc) =>
      `${loc.city || ""}, ${loc.state || ""}, ${loc.country || ""}`.trim()
    ) || [];

  // Extract phases
  const phases = protocol.designModule?.phases || [];
  const phase = phases.length > 0 ? phases.join(", ") : "Not specified";

  // Extract eligibility criteria
  const eligibilityCriteria = protocol.eligibilityModule?.eligibilityCriteria
    ? [protocol.eligibilityModule.eligibilityCriteria]
    : [];

  return {
    nctId: protocol.identificationModule.nctId,
    title: protocol.identificationModule.briefTitle,
    description:
      protocol.descriptionModule?.briefSummary ||
      protocol.descriptionModule?.detailedDescription ||
      "No description available",
    sponsor:
      protocol.sponsorCollaboratorsModule?.leadSponsor?.name || "Unknown",
    phase,
    status: protocol.statusModule.overallStatus.toLowerCase(),
    conditions: protocol.conditionsModule?.conditions || [],
    eligibilityCriteria,
    exclusionCriteria: [], // Would need to parse from eligibility criteria
    locations: locations.filter((loc) => loc.trim() !== ","),
    ageRange: minAge && maxAge ? { min: minAge, max: maxAge } : undefined,
    genderRestriction: protocol.eligibilityModule?.sex?.toLowerCase(),
    studyType: protocol.designModule?.studyType || "Unknown",
    lastUpdated: new Date(protocol.statusModule.lastUpdateDate).getTime(),
    sourceUrl: `https://clinicaltrials.gov/study/${protocol.identificationModule.nctId}`,
  };
}

/**
 * Search clinical trials from ClinicalTrials.gov API
 */
export const searchClinicalTrials = action({
  args: {
    searchParams: v.object({
      conditions: v.array(v.string()),
      ageRange: v.optional(
        v.object({
          min: v.number(),
          max: v.number(),
        })
      ),
      gender: v.optional(v.string()),
      location: v.optional(v.string()),
      status: v.optional(
        v.union(
          v.literal("recruiting"),
          v.literal("active"),
          v.literal("completed"),
          v.literal("not_yet_recruiting")
        )
      ),
      phase: v.optional(v.array(v.string())),
      studyType: v.optional(v.string()),
      maxResults: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    try {
      // Check rate limiting
      if (!checkRateLimit()) {
        throw new ConvexError("Rate limit exceeded. Please try again later.");
      }

      const { searchParams } = args;

      // Build query parameters for ClinicalTrials.gov API v2
      const queryParams = new URLSearchParams();

      // Add conditions using correct API v2 format
      if (searchParams.conditions.length > 0) {
        const conditionQuery = searchParams.conditions
          .map((condition) => condition.trim())
          .join(" OR ");
        queryParams.append("query.cond", conditionQuery);
      }

      // Add status filter using correct parameter name for API v2
      if (searchParams.status) {
        // Use correct status values for API v2
        let apiStatus = searchParams.status;
        if (searchParams.status === "recruiting") {
          apiStatus = "RECRUITING";
        } else if (searchParams.status === "active") {
          apiStatus = "ACTIVE_NOT_RECRUITING";
        } else if (searchParams.status === "completed") {
          apiStatus = "COMPLETED";
        } else if (searchParams.status === "not_yet_recruiting") {
          apiStatus = "NOT_YET_RECRUITING";
        }
        queryParams.append("filter.overallStatus", apiStatus);
      }

      // Add location filter
      if (searchParams.location) {
        queryParams.append("query.locn", searchParams.location);
      }

      // Add study type filter
      if (searchParams.studyType) {
        queryParams.append("query.type", searchParams.studyType);
      }

      // Add result limit
      const maxResults = Math.min(searchParams.maxResults || 50, 100);
      queryParams.append("pageSize", maxResults.toString());

      // Set response format for API v2
      queryParams.append("format", "json");

      const apiUrl = `${CONFIG.baseUrl}/studies?${queryParams.toString()}`;

      console.log("Searching ClinicalTrials.gov with URL:", apiUrl);

      // Make API request
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "MediBuddy-Clinical-Trial-Matcher/1.0",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `ClinicalTrials.gov API error: ${response.status} ${errorText}`
        );
      }

      const data: ClinicalTrialsApiResponse = await response.json();

      // Map studies to MediBuddy format
      const mappedTrials = data.studies.map(mapStudyToTrial);

      // Filter by age if specified
      let filteredTrials = mappedTrials;
      if (searchParams.ageRange) {
        filteredTrials = mappedTrials.filter((trial) => {
          if (!trial.ageRange) return true; // Include trials without age restrictions

          const { min: patientMinAge, max: patientMaxAge } =
            searchParams.ageRange!;
          const { min: trialMinAge, max: trialMaxAge } = trial.ageRange;

          // Check if patient age range overlaps with trial age range
          return patientMinAge <= trialMaxAge && patientMaxAge >= trialMinAge;
        });
      }

      // Filter by gender if specified
      if (searchParams.gender) {
        filteredTrials = filteredTrials.filter((trial) => {
          if (!trial.genderRestriction) return true; // Include trials without gender restrictions

          const normalizedGender = searchParams.gender!.toLowerCase();
          const trialGender = trial.genderRestriction.toLowerCase();

          return (
            trialGender === "all" ||
            trialGender === normalizedGender ||
            (trialGender === "female" && normalizedGender === "f") ||
            (trialGender === "male" && normalizedGender === "m")
          );
        });
      }

      console.log(
        `Found ${filteredTrials.length} matching trials from ClinicalTrials.gov`
      );

      return {
        trials: filteredTrials,
        totalCount: data.totalCount,
        searchParams,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Error searching ClinicalTrials.gov:", error);
      throw new ConvexError(
        `Failed to search clinical trials: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

/**
 * Get detailed information about a specific trial by NCT ID
 */
export const getTrialDetails = action({
  args: {
    nctId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Check rate limiting
      if (!checkRateLimit()) {
        throw new ConvexError("Rate limit exceeded. Please try again later.");
      }

      const apiUrl = `${CONFIG.baseUrl}/studies/${args.nctId}?format=json`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "MediBuddy-Clinical-Trial-Matcher/1.0",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `ClinicalTrials.gov API error: ${response.status} ${errorText}`
        );
      }

      const data = await response.json();

      if (!data.studies || data.studies.length === 0) {
        throw new ConvexError(`Trial with NCT ID ${args.nctId} not found`);
      }

      const mappedTrial = mapStudyToTrial(data.studies[0]);

      return mappedTrial;
    } catch (error) {
      console.error("Error getting trial details:", error);
      throw new ConvexError(
        `Failed to get trial details: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

/**
 * Enhanced trial matching with real-time ClinicalTrials.gov data
 */
export const findMatchingTrialsRealTime = action({
  args: {
    consultationId: v.id("consultations"),
    useRealTimeData: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      // Get consultation data
      const consultation = await ctx.runQuery(api.consultations.get, {
        id: args.consultationId,
      });

      if (!consultation) {
        throw new ConvexError(
          "Consultation not found. Please ensure the consultation exists."
        );
      }

      // Get patient data
      const patient = await ctx.runQuery(api.users.getById, {
        id: consultation.patientId,
      });

      if (!patient) {
        throw new ConvexError(
          "Patient data not found. Please ensure the patient profile exists."
        );
      }

      // Determine available data and extract conditions
      let conditions: string[] = [];
      let dataSource = "";

      if (
        consultation.structuredData &&
        consultation.structuredData.conditions?.length > 0
      ) {
        // Use structured data if available
        conditions = consultation.structuredData.conditions.map((c) => c.name);
        dataSource = "structured medical entities";
      } else if (consultation.transcription) {
        // Fall back to extracting conditions from transcription
        conditions = extractConditionsFromTranscription(
          consultation.transcription
        );
        dataSource = "transcription analysis";

        if (conditions.length === 0) {
          throw new ConvexError(
            "No medical conditions found in consultation data. Please ensure the consultation contains medical information or extract medical entities first."
          );
        }
      } else {
        throw new ConvexError(
          "No medical data available. Please ensure the consultation has either transcription or extracted medical entities."
        );
      }

      console.log(
        `Extracted ${conditions.length} conditions from ${dataSource}:`,
        conditions
      );

      // Extract search parameters from patient data
      const searchParams: TrialSearchParams = {
        conditions,
        ageRange: patient.age
          ? { min: patient.age - 5, max: patient.age + 5 }
          : undefined,
        gender: patient.gender,
        location: patient.location,
        status: "recruiting",
        maxResults: 50,
      };

      // Search real-time data from ClinicalTrials.gov
      const realTimeResults = await ctx.runAction(
        api.clinicalTrials.searchClinicalTrials,
        {
          searchParams,
        }
      );

      // Also get existing local trials for comparison
      const localTrials = await ctx.runQuery(
        api.trialMatching.listActiveTrials,
        {}
      );

      // Combine and deduplicate results
      const combinedTrials = [...realTimeResults.trials];

      // Add local trials that aren't already in real-time results
      for (const localTrial of localTrials) {
        const existsInRealTime = realTimeResults.trials.some(
          (rt) => rt.nctId && localTrial.title.includes(rt.nctId)
        );

        if (!existsInRealTime) {
          combinedTrials.push({
            nctId: localTrial._id,
            title: localTrial.title,
            description: localTrial.description,
            sponsor: localTrial.sponsor,
            phase: localTrial.phase,
            status: localTrial.status,
            conditions: localTrial.targetConditions,
            eligibilityCriteria: localTrial.eligibilityCriteria,
            exclusionCriteria: localTrial.exclusionCriteria,
            locations: localTrial.locations || [localTrial.location],
            ageRange: localTrial.ageRange,
            genderRestriction: localTrial.genderRestriction,
            studyType: "Local",
            lastUpdated:
              localTrial.updatedAt || localTrial.createdAt || Date.now(),
            sourceUrl: `local://${localTrial._id}`,
          });
        }
      }

      console.log(
        `Combined ${combinedTrials.length} trials (${realTimeResults.trials.length} from ClinicalTrials.gov, ${localTrials.length} local)`
      );

      return {
        trials: combinedTrials,
        realTimeCount: realTimeResults.trials.length,
        localCount: localTrials.length,
        totalCount: combinedTrials.length,
        searchParams,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Error in real-time trial matching:", error);
      throw new ConvexError(
        `Failed to find matching trials: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

/**
 * Save a trial to the database from search results
 */
export const saveTrial = mutation({
  args: {
    nctId: v.string(),
    title: v.string(),
    description: v.string(),
    sponsor: v.string(),
    phase: v.string(),
    status: v.union(
      v.literal("recruiting"),
      v.literal("active"),
      v.literal("completed")
    ),
    targetConditions: v.array(v.string()),
    eligibilityCriteria: v.array(v.string()),
    exclusionCriteria: v.array(v.string()),
    locations: v.optional(v.array(v.string())),
    location: v.string(), // Fallback for single location
    ageRange: v.optional(
      v.object({
        min: v.number(),
        max: v.number(),
      })
    ),
    genderRestriction: v.optional(v.string()),
    contactInfo: v.string(),
    enhancedContactInfo: v.optional(v.record(v.string(), v.string())),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // Check if trial already exists by nctId
      const existingTrial = await ctx.db
        .query("clinicalTrials")
        .filter((q) => q.eq(q.field("title"), args.title))
        .first();

      if (existingTrial) {
        // Update existing trial
        await ctx.db.patch(existingTrial._id, {
          ...args,
          updatedAt: Date.now(),
        });
        return existingTrial._id;
      } else {
        // Create new trial
        const trialId = await ctx.db.insert("clinicalTrials", {
          ...args,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return trialId;
      }
    } catch (error) {
      console.error("Error saving trial:", error);
      throw new ConvexError(`Failed to save trial: ${error}`);
    }
  },
});

/**
 * Save multiple trials from search results
 */
export const saveTrialSearchResults = mutation({
  args: {
    consultationId: v.id("consultations"),
    patientId: v.id("users"),
    trials: v.array(
      v.object({
        nctId: v.string(),
        title: v.string(),
        description: v.string(),
        sponsor: v.string(),
        phase: v.string(),
        status: v.string(),
        conditions: v.array(v.string()),
        sourceUrl: v.string(),
        locations: v.array(v.string()),
        relevanceScore: v.optional(v.number()),
        ageRange: v.optional(
          v.object({
            min: v.number(),
            max: v.number(),
          })
        ),
        genderRestriction: v.optional(v.string()),
        eligibilityCriteria: v.optional(v.array(v.string())),
        exclusionCriteria: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    try {
      const savedTrialIds: Id<"clinicalTrials">[] = [];
      const matchIds: Id<"trialMatches">[] = [];

      for (const trial of args.trials) {
        // Convert status to match schema enum
        let trialStatus: "recruiting" | "active" | "completed" = "recruiting";
        const statusLower = trial.status.toLowerCase();
        if (
          statusLower.includes("active") ||
          statusLower.includes("recruiting")
        ) {
          trialStatus = "recruiting";
        } else if (statusLower.includes("completed")) {
          trialStatus = "completed";
        } else {
          trialStatus = "active";
        }

        // Save the trial
        const trialId = await ctx.db.insert("clinicalTrials", {
          title: trial.title,
          description: trial.description,
          sponsor: trial.sponsor,
          phase: trial.phase,
          status: trialStatus,
          nctId: trial.nctId, // Save NCT ID directly
          targetConditions: trial.conditions,
          eligibilityCriteria: trial.eligibilityCriteria || [],
          exclusionCriteria: trial.exclusionCriteria || [],
          locations: trial.locations,
          location: trial.locations[0] || "Not specified",
          ageRange: trial.ageRange,
          genderRestriction: trial.genderRestriction,
          contactInfo: trial.sourceUrl,
          enhancedContactInfo: {
            sourceUrl: trial.sourceUrl,
            nctId: trial.nctId,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        savedTrialIds.push(trialId);

        // Create a trial match record
        const matchId = await ctx.db.insert("trialMatches", {
          patientId: args.patientId,
          trialId: trialId,
          consultationId: args.consultationId,
          relevanceScore: trial.relevanceScore || 0.5,
          matchReason: `Matched from real-time search on ${new Date().toISOString()}`,
          status: "pending",
          notificationStatus: "pending",
          consentStatus: "pending",
          matchDate: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          consentStatusHistory: [
            {
              status: "pending",
              timestamp: Date.now(),
              changedBy: "system",
              note: "Initial match from real-time search",
            },
          ],
        });

        matchIds.push(matchId);
      }

      // Update consultation with matched trial IDs
      await ctx.db.patch(args.consultationId, {
        matchedTrialIds: savedTrialIds,
        updatedAt: Date.now(),
      });

      return {
        savedTrialIds,
        matchIds,
        totalSaved: savedTrialIds.length,
      };
    } catch (error) {
      console.error("Error saving trial search results:", error);
      throw new ConvexError(`Failed to save trial search results: ${error}`);
    }
  },
});

/**
 * Cache management for trial data
 */
export const clearTrialCache = action({
  args: {},
  handler: async (ctx, args) => {
    // In a real implementation, this would clear Redis cache
    // For now, we'll just reset the rate limiting state
    rateLimitState.requests = [];
    rateLimitState.lastReset = Date.now();

    return { success: true, message: "Trial cache cleared" };
  },
});

/**
 * Get API usage statistics
 */
export const getApiStats = action({
  args: {},
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentRequests = rateLimitState.requests.filter(
      (timestamp) => timestamp > oneMinuteAgo
    );

    return {
      requestsInLastMinute: recentRequests.length,
      rateLimitRemaining:
        CONFIG.rateLimit.requestsPerMinute - recentRequests.length,
      lastReset: rateLimitState.lastReset,
      config: CONFIG,
    };
  },
});

/**
 * Get saved trials for a consultation
 */
export const getSavedTrialsForConsultation = query({
  args: {
    consultationId: v.id("consultations"),
  },
  handler: async (ctx, args) => {
    try {
      // Get trial matches for this consultation
      const matches = await ctx.db
        .query("trialMatches")
        .withIndex("by_consultation", (q) =>
          q.eq("consultationId", args.consultationId)
        )
        .collect();

      // Get trial details for each match
      const trialsWithMatches = await Promise.all(
        matches.map(async (match) => {
          const trial = await ctx.db.get(match.trialId);
          if (!trial) return null;

          return {
            match,
            trial,
          };
        })
      );

      return trialsWithMatches.filter(Boolean);
    } catch (error) {
      console.error("Error getting saved trials:", error);
      throw new ConvexError(`Failed to get saved trials: ${error}`);
    }
  },
});
