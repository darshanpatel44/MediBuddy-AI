import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Maximum number of retries for API calls
const MAX_RETRIES = 3;
// Base delay for exponential backoff (in milliseconds)
const BASE_DELAY = 1000;

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param baseDelay Base delay for exponential backoff in milliseconds
 * @returns Result of the function
 */
async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = BASE_DELAY
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // If this was our last attempt, don't wait, just throw
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff and some randomness
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 200;

      // Wait for the calculated delay
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Action to extract medical entities from transcription
export const extractMedicalEntities = action({
  args: {
    consultationId: v.id("consultations"),
  },
  handler: async (ctx, args) => {
    // Get consultation with transcription
    const consultation = await ctx.runQuery(api.consultations.get, {
      id: args.consultationId,
    });

    if (!consultation) {
      throw new ConvexError("Consultation not found");
    }

    if (!consultation.transcription) {
      throw new ConvexError("No transcription found for this consultation");
    }

    try {
      // Get the OpenAI API key from environment variables
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OpenAI API key not found");
      }

      // Extract medical entities with retry logic
      const entities = await retryWithExponentialBackoff(async () => {
        // Call OpenAI API to extract medical entities
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a medical entity extraction assistant specialized in clinical notes analysis. " +
                    "Extract comprehensive medical entities from the transcription including detailed information about " +
                    "conditions, medications (including dosage and frequency when mentioned), allergies, symptoms, lab results, " +
                    "vitals, and comorbidities. Your goal is to identify all medically relevant information that could be " +
                    "useful for matching patients with clinical trials. Provide a structured response in JSON format.",
                },
                {
                  role: "user",
                  content:
                    "Extract medical entities from the following doctor-patient transcription. " +
                    "Format as JSON with these keys:\n" +
                    "- 'conditions': array of objects with 'name' (string) and 'severity' ('mild', 'moderate', or 'severe')\n" +
                    "- 'medications': array of strings with medication names (include dosage if available)\n" +
                    "- 'allergies': array of strings with allergy names\n" +
                    "- 'symptoms': array of strings with symptom descriptions\n" +
                    "- 'labResults': object with test names as keys and results as values\n" +
                    "- 'comorbidities': array of strings with comorbidity names\n" +
                    "- 'vitals': object with vital names as keys and values as measurements\n\n" +
                    "The transcription is:\n\n" +
                    consultation.transcription,
                },
              ],
              response_format: { type: "json_object" },
              temperature: 0.1, // Lower temperature for more consistent results
              max_tokens: 2000, // Ensure enough tokens for comprehensive analysis
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        return JSON.parse(result.choices[0].message.content);
      });

      // Validate and normalize the extracted entities
      const normalizedEntities = normalizeEntities(entities);

      // Update the consultation with extracted entities
      await ctx.runMutation(
        internal.medicalEntityExtraction.updateConsultationWithEntities,
        {
          consultationId: args.consultationId,
          structuredData: normalizedEntities,
        }
      );

      // Enhance with ASI1 reasoning
      let enhancedAnalysis = null;
      try {
        console.log(
          "Enhancing medical analysis with ASI1 for consultation:",
          args.consultationId
        );
        enhancedAnalysis = await ctx.runAction(
          api.asi1.enhanceMedicalAnalysis,
          {
            consultationId: args.consultationId,
            extractedEntities: normalizedEntities,
          }
        );
        console.log(
          "ASI1 enhancement completed with confidence:",
          enhancedAnalysis.confidence
        );
      } catch (asi1Error) {
        // Log the error but don't fail the extraction process
        console.error("Error during ASI1 enhancement:", asi1Error);
      }

      // Trigger enhanced trial matching after successful entity extraction
      try {
        console.log(
          "Triggering enhanced trial matching for consultation:",
          args.consultationId
        );

        // Use real-time ClinicalTrials.gov data for matching
        const realTimeMatches = await ctx.runAction(
          api.clinicalTrials.findMatchingTrialsRealTime,
          {
            consultationId: args.consultationId,
            useRealTimeData: true,
          }
        );

        // If we have ASI1 analysis, use it to enhance the trial matching
        if (enhancedAnalysis && realTimeMatches.trials.length > 0) {
          const medicalContext = {
            patientId: consultation.patientId,
            consultationId: args.consultationId,
            extractedEntities: normalizedEntities,
            asi1Analysis: enhancedAnalysis,
          };

          const enhancedMatches = await ctx.runAction(
            api.asi1.analyzeTrialMatches,
            {
              consultationId: args.consultationId,
              trialMatches: realTimeMatches.trials,
              medicalContext,
            }
          );

          console.log(
            "ASI1 trial analysis completed for",
            realTimeMatches.trials.length,
            "trials"
          );
        }

        // Also run the original trial matching for comparison
        await ctx.runAction(api.trialMatching.runMatchingAfterExtraction, {
          consultationId: args.consultationId,
        });
      } catch (matchError) {
        // Log the error but don't fail the extraction process
        console.error("Error during enhanced trial matching:", matchError);
      }

      return {
        ...normalizedEntities,
        asi1Enhancement: enhancedAnalysis,
      };
    } catch (error) {
      console.error("Error extracting medical entities:", error);
      throw new ConvexError(
        `Failed to extract medical entities: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});

/**
 * Normalize and validate extracted entities to ensure they match the expected schema
 * @param entities Raw entities extracted from the API
 * @returns Normalized entities matching the database schema
 */
function normalizeEntities(entities: any) {
  // Ensure all required fields exist with default values
  const normalized = {
    conditions: Array.isArray(entities.conditions) ? entities.conditions : [],
    medications: Array.isArray(entities.medications)
      ? entities.medications
      : [],
    allergies: Array.isArray(entities.allergies) ? entities.allergies : [],
    symptoms: Array.isArray(entities.symptoms) ? entities.symptoms : [],
    labResults:
      entities.labResults && typeof entities.labResults === "object"
        ? entities.labResults
        : {},
    comorbidities: Array.isArray(entities.comorbidities)
      ? entities.comorbidities
      : [],
    vitals:
      entities.vitals && typeof entities.vitals === "object"
        ? entities.vitals
        : {},
  };

  // Normalize conditions to ensure they all have the required format
  normalized.conditions = normalized.conditions.map((condition) => {
    if (typeof condition === "string") {
      return { name: condition, severity: "moderate" };
    } else if (typeof condition === "object" && condition !== null) {
      return {
        name: condition.name || "Unknown condition",
        severity: ["mild", "moderate", "severe"].includes(condition.severity)
          ? condition.severity
          : "moderate",
      };
    }
    return { name: "Unknown condition", severity: "moderate" };
  });

  return normalized;
}

// Internal mutation to update consultation with extracted entities
export const updateConsultationWithEntities = internalMutation({
  args: {
    consultationId: v.id("consultations"),
    structuredData: v.object({
      conditions: v.array(
        v.object({
          name: v.string(),
          severity: v.optional(
            v.union(
              v.literal("mild"),
              v.literal("moderate"),
              v.literal("severe")
            )
          ),
        })
      ),
      medications: v.array(v.string()),
      allergies: v.array(v.string()),
      symptoms: v.optional(v.array(v.string())),
      labResults: v.optional(v.record(v.string(), v.any())),
      comorbidities: v.optional(v.array(v.string())),
      vitals: v.optional(v.record(v.string(), v.any())),
    }),
  },
  handler: async (ctx, args) => {
    try {
      // Normalize conditions to ensure severity is always present
      const normalizedData = {
        ...args.structuredData,
        conditions: args.structuredData.conditions.map((condition) => ({
          name: condition.name,
          severity: condition.severity || "moderate", // Default severity if not provided
        })),
      };

      await ctx.db.patch(args.consultationId, {
        structuredData: normalizedData,
        // Also update the legacy medicalEntities field for backward compatibility
        medicalEntities: {
          conditions: normalizedData.conditions.map((c) => c.name),
          medications: normalizedData.medications,
          allergies: normalizedData.allergies,
        },
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error("Error updating consultation with entities:", error);
      throw new Error(
        `Failed to update consultation: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});

// Helper function to extract entities from a transcription
export const extractEntitiesFromTranscription = action({
  args: {
    transcription: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Get the OpenAI API key from environment variables
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OpenAI API key not found");
      }

      // Extract entities with retry logic
      return await retryWithExponentialBackoff(async () => {
        // Call OpenAI API to extract medical entities
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a medical entity extraction assistant specialized in clinical notes analysis. " +
                    "Extract comprehensive medical entities from the transcription including detailed information about " +
                    "conditions, medications (including dosage and frequency when mentioned), allergies, symptoms, lab results, " +
                    "vitals, and comorbidities. Your goal is to identify all medically relevant information that could be " +
                    "useful for matching patients with clinical trials. Provide a structured response in JSON format.",
                },
                {
                  role: "user",
                  content:
                    "Extract medical entities from the following doctor-patient transcription. " +
                    "Format as JSON with these keys:\n" +
                    "- 'conditions': array of objects with 'name' (string) and 'severity' ('mild', 'moderate', or 'severe')\n" +
                    "- 'medications': array of strings with medication names (include dosage if available)\n" +
                    "- 'allergies': array of strings with allergy names\n" +
                    "- 'symptoms': array of strings with symptom descriptions\n" +
                    "- 'labResults': object with test names as keys and results as values\n" +
                    "- 'comorbidities': array of strings with comorbidity names\n" +
                    "- 'vitals': object with vital names as keys and values as measurements\n\n" +
                    "The transcription is:\n\n" +
                    args.transcription,
                },
              ],
              response_format: { type: "json_object" },
              temperature: 0.1, // Lower temperature for more consistent results
              max_tokens: 2000, // Ensure enough tokens for comprehensive analysis
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        const entities = JSON.parse(result.choices[0].message.content);

        // Normalize and validate the extracted entities
        return normalizeEntities(entities);
      });
    } catch (error) {
      console.error("Error extracting medical entities:", error);
      throw new ConvexError(
        `Failed to extract medical entities: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});

// Function to manually re-process a consultation's transcription
export const reprocessTranscription = action({
  args: {
    consultationId: v.id("consultations"),
  },
  handler: async (ctx, args) => {
    // Get consultation with transcription
    const consultation = await ctx.runQuery(api.consultations.get, {
      id: args.consultationId,
    });

    if (!consultation) {
      throw new ConvexError("Consultation not found");
    }

    if (!consultation.transcription) {
      throw new ConvexError("No transcription found for this consultation");
    }

    // Re-extract entities from the transcription
    const entities = await ctx.runAction(
      api.medicalEntityExtraction.extractEntitiesFromTranscription,
      {
        transcription: consultation.transcription,
      }
    );

    // Update the consultation with the newly extracted entities
    await ctx.runMutation(
      internal.medicalEntityExtraction.updateConsultationWithEntities,
      {
        consultationId: args.consultationId,
        structuredData: entities,
      }
    );

    return entities;
  },
});

// Action to extract medical entities using Google Gemini
export const extractMedicalEntitiesWithGemini = action({
  args: {
    consultationId: v.id("consultations"),
  },
  handler: async (ctx, args) => {
    // Get consultation with transcription
    const consultation = await ctx.runQuery(api.consultations.get, {
      id: args.consultationId,
    });

    if (!consultation) {
      throw new ConvexError("Consultation not found");
    }

    if (!consultation.transcription) {
      throw new ConvexError("No transcription found for this consultation");
    }

    try {
      // Get the Google Gemini API key from environment variables
      const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Google Gemini API key not found");
      }

      // Initialize Google Gemini AI
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Extract medical entities with retry logic
      const entities = await retryWithExponentialBackoff(async () => {
        const prompt = `
You are a medical entity extraction assistant specialized in clinical notes analysis.
Extract comprehensive medical entities from the following doctor-patient transcription.

Please analyze the transcription and extract medical entities in the following JSON format:
{
  "conditions": [
    {
      "name": "condition name",
      "severity": "mild" | "moderate" | "severe",
      "status": "active" | "resolved" | "chronic"
    }
  ],
  "medications": [
    {
      "name": "medication name",
      "dosage": "dosage if mentioned",
      "frequency": "frequency if mentioned",
      "route": "route if mentioned"
    }
  ],
  "allergies": [
    {
      "allergen": "allergen name",
      "reaction": "reaction type if mentioned",
      "severity": "mild" | "moderate" | "severe"
    }
  ],
  "symptoms": [
    {
      "name": "symptom description",
      "severity": "mild" | "moderate" | "severe",
      "duration": "duration if mentioned",
      "onset": "onset if mentioned"
    }
  ],
  "comorbidities": [
    {
      "name": "comorbidity name",
      "status": "active" | "resolved" | "chronic"
    }
  ],
  "vitals": {
    "bloodPressure": "value if mentioned",
    "heartRate": "value if mentioned",
    "temperature": "value if mentioned",
    "respiratoryRate": "value if mentioned",
    "oxygenSaturation": "value if mentioned",
    "weight": "value if mentioned",
    "height": "value if mentioned"
  },
  "labResults": {
    "testName": "result value"
  }
}

Only extract information that is explicitly mentioned in the transcription. If a category has no relevant information, return an empty array or object.

Transcription:
${consultation.transcription}

Please respond with only the JSON object, no additional text.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the JSON response
        try {
          const entities = JSON.parse(text);
          return normalizeGeminiEntities(entities);
        } catch (parseError) {
          console.error("Error parsing Gemini response:", parseError);
          // Try to extract JSON from the response if it's wrapped in markdown
          const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            const entities = JSON.parse(jsonMatch[1]);
            return normalizeGeminiEntities(entities);
          }
          throw new Error("Failed to parse Gemini response as JSON");
        }
      });

      // Update the consultation with extracted entities
      await ctx.runMutation(
        internal.medicalEntityExtraction.updateConsultationWithGeminiEntities,
        {
          consultationId: args.consultationId,
          structuredData: entities,
        }
      );

      // Trigger trial matching after successful entity extraction
      try {
        console.log(
          "Triggering trial matching for consultation:",
          args.consultationId
        );
        await ctx.runAction(api.trialMatching.runMatchingAfterExtraction, {
          consultationId: args.consultationId,
        });
      } catch (matchError) {
        // Log the error but don't fail the extraction process
        console.error("Error during trial matching:", matchError);
      }

      return entities;
    } catch (error) {
      console.error("Error extracting medical entities with Gemini:", error);
      throw new ConvexError(
        `Failed to extract medical entities with Gemini: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});

/**
 * Normalize Gemini entities to match our expected format
 */
function normalizeGeminiEntities(entities: any) {
  return {
    conditions: Array.isArray(entities.conditions)
      ? entities.conditions.map((condition: any) => ({
          name: condition.name || condition,
          severity: condition.severity || "moderate",
          status: condition.status || "active",
        }))
      : [],
    medications: Array.isArray(entities.medications)
      ? entities.medications.map((med: any) => ({
          name: med.name || med,
          dosage: med.dosage || "",
          frequency: med.frequency || "",
          route: med.route || "",
        }))
      : [],
    allergies: Array.isArray(entities.allergies)
      ? entities.allergies.map((allergy: any) => ({
          allergen: allergy.allergen || allergy.name || allergy,
          reaction: allergy.reaction || "",
          severity: allergy.severity || "moderate",
        }))
      : [],
    symptoms: Array.isArray(entities.symptoms)
      ? entities.symptoms.map((symptom: any) => ({
          name: symptom.name || symptom,
          severity: symptom.severity || "moderate",
          duration: symptom.duration || "",
          onset: symptom.onset || "",
        }))
      : [],
    comorbidities: Array.isArray(entities.comorbidities)
      ? entities.comorbidities.map((comorbidity: any) => ({
          name: comorbidity.name || comorbidity,
          status: comorbidity.status || "active",
        }))
      : [],
    vitals: entities.vitals || {},
    labResults: entities.labResults || {},
  };
}

// Internal mutation to update consultation with Gemini extracted entities
export const updateConsultationWithGeminiEntities = internalMutation({
  args: {
    consultationId: v.id("consultations"),
    structuredData: v.object({
      conditions: v.array(
        v.object({
          name: v.string(),
          severity: v.optional(
            v.union(
              v.literal("mild"),
              v.literal("moderate"),
              v.literal("severe")
            )
          ),
          status: v.optional(
            v.union(
              v.literal("active"),
              v.literal("resolved"),
              v.literal("chronic")
            )
          ),
        })
      ),
      medications: v.array(
        v.object({
          name: v.string(),
          dosage: v.optional(v.string()),
          frequency: v.optional(v.string()),
          route: v.optional(v.string()),
        })
      ),
      allergies: v.array(
        v.object({
          allergen: v.string(),
          reaction: v.optional(v.string()),
          severity: v.optional(
            v.union(
              v.literal("mild"),
              v.literal("moderate"),
              v.literal("severe")
            )
          ),
        })
      ),
      symptoms: v.array(
        v.object({
          name: v.string(),
          severity: v.optional(
            v.union(
              v.literal("mild"),
              v.literal("moderate"),
              v.literal("severe")
            )
          ),
          duration: v.optional(v.string()),
          onset: v.optional(v.string()),
        })
      ),
      comorbidities: v.array(
        v.object({
          name: v.string(),
          status: v.optional(
            v.union(
              v.literal("active"),
              v.literal("resolved"),
              v.literal("chronic")
            )
          ),
        })
      ),
      vitals: v.optional(v.record(v.string(), v.any())),
      labResults: v.optional(v.record(v.string(), v.any())),
    }),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.db.patch(args.consultationId, {
        geminiExtractedData: args.structuredData,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error("Error updating consultation with Gemini entities:", error);
      throw new Error(
        `Failed to update consultation: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});
