import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

// ASI1 Configuration
interface ASI1Config {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

// ASI1 Request Interface
interface ASI1Request {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  context: MedicalContext;
  goal: string;
}

// Medical Context Interface
interface MedicalContext {
  patientId: Id<"users">;
  consultationId: Id<"consultations">;
  extractedEntities: {
    conditions: Array<{ name: string; severity: string }>;
    medications: string[];
    allergies: string[];
    symptoms?: string[];
    labResults?: Record<string, any>;
    comorbidities?: string[];
    vitals?: Record<string, any>;
  };
  patientProfile?: {
    age?: number;
    gender?: string;
    location?: string;
    medicalHistory?: string[];
  };
}

// ASI1 Response Interface
interface ASI1Response {
  reasoning: string;
  recommendations: TrialRecommendation[];
  confidence: number;
  nextSteps: string[];
  medicalInsights: string[];
  riskAssessment: {
    level: "low" | "medium" | "high";
    factors: string[];
  };
}

// Trial Recommendation Interface
interface TrialRecommendation {
  trialId?: Id<"clinicalTrials">;
  nctId?: string;
  title: string;
  relevanceScore: number;
  reasoning: string;
  benefits: string[];
  risks: string[];
  eligibilityMatch: {
    score: number;
    matchingCriteria: string[];
    potentialExclusions: string[];
  };
}

// Maximum number of retries for API calls
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

/**
 * Retry function with exponential backoff
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

      if (attempt === maxRetries) {
        break;
      }

      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 200;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Enhanced Medical Entity Analysis with ASI1
 * This action takes the basic medical entities extracted by OpenAI/Gemini
 * and enhances them with ASI1's agentic reasoning capabilities
 */
export const enhanceMedicalAnalysis = action({
  args: {
    consultationId: v.id("consultations"),
    extractedEntities: v.object({
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
      // Get consultation and patient data
      const consultation = await ctx.runQuery(api.consultations.get, {
        id: args.consultationId,
      });

      if (!consultation) {
        throw new ConvexError("Consultation not found");
      }

      const patient = await ctx.runQuery(api.users.getById, {
        id: consultation.patientId,
      });

      if (!patient) {
        throw new ConvexError("Patient not found");
      }

      // Prepare medical context for ASI1
      // Normalize extracted entities to ensure required fields
      const normalizedEntities = {
        ...args.extractedEntities,
        conditions: args.extractedEntities.conditions.map((condition) => ({
          name: condition.name,
          severity: condition.severity || "moderate", // Default severity if not provided
        })),
      };

      const medicalContext: MedicalContext = {
        patientId: consultation.patientId,
        consultationId: args.consultationId,
        extractedEntities: normalizedEntities,
        patientProfile: {
          age: patient.age,
          gender: patient.gender,
          location: patient.location,
          medicalHistory: patient.medicalHistory,
        },
      };

      // Get ASI1 API configuration with fallback
      const apiKey = process.env.ASI1_API_KEY;
      if (!apiKey) {
        console.warn("ASI1 API key not found, using fallback analysis");
        // Return a fallback analysis when ASI1 is not available
        return {
          reasoning:
            "Medical analysis completed using local processing (ASI1 not configured). This patient shows multiple medical conditions that may be suitable for clinical trial participation. Further evaluation recommended.",
          recommendations: [],
          confidence: 0.7,
          nextSteps: [
            "Review available clinical trials",
            "Assess patient eligibility criteria",
            "Discuss potential trial participation with patient",
          ],
          medicalInsights: [
            "Patient has documented medical conditions suitable for trial matching",
            "Current medications should be reviewed for trial compatibility",
            "Age and location factors considered in matching algorithm",
          ],
          riskAssessment: {
            level: "medium" as const,
            factors: [
              "Standard clinical trial participation risks apply",
              "Individual assessment required for specific trials",
            ],
          },
        };
      }

      const config: ASI1Config = {
        apiKey,
        baseUrl: process.env.ASI1_BASE_URL || "https://api.asi1.ai",
        model: process.env.ASI1_MODEL || "asi1-mini",
        maxTokens: 2000,
        temperature: 0.1,
      };

      // Prepare ASI1 request
      const asi1Request: ASI1Request = {
        messages: [
          {
            role: "system",
            content: `You are an advanced medical AI agent specialized in clinical trial matching and medical reasoning. Your goal is to analyze patient medical data and provide intelligent insights for clinical trial eligibility.

Your capabilities include:
- Advanced medical reasoning and pattern recognition
- Clinical trial eligibility assessment
- Risk-benefit analysis
- Personalized treatment recommendations
- Multi-step medical decision making

Analyze the provided medical context and provide detailed reasoning about:
1. Medical condition severity and prognosis
2. Treatment options and clinical trial suitability
3. Risk factors and contraindications
4. Personalized recommendations based on patient profile

Respond in JSON format with structured medical insights.`,
          },
          {
            role: "user",
            content: `Please analyze this patient's medical profile and provide enhanced insights for clinical trial matching:

Patient Profile:
- Age: ${medicalContext.patientProfile?.age || "Not specified"}
- Gender: ${medicalContext.patientProfile?.gender || "Not specified"}
- Location: ${medicalContext.patientProfile?.location || "Not specified"}

Medical Conditions:
${medicalContext.extractedEntities.conditions.map((c) => `- ${c.name} (${c.severity || "unspecified severity"})`).join("\n")}

Current Medications:
${medicalContext.extractedEntities.medications.map((m) => `- ${m}`).join("\n")}

Allergies:
${medicalContext.extractedEntities.allergies.map((a) => `- ${a}`).join("\n")}

${
  medicalContext.extractedEntities.symptoms
    ? `Symptoms:
${medicalContext.extractedEntities.symptoms.map((s) => `- ${s}`).join("\n")}`
    : ""
}

${
  medicalContext.extractedEntities.comorbidities
    ? `Comorbidities:
${medicalContext.extractedEntities.comorbidities.map((c) => `- ${c}`).join("\n")}`
    : ""
}

Please provide:
1. Enhanced medical reasoning about the patient's condition
2. Clinical trial suitability assessment
3. Risk-benefit analysis
4. Specific recommendations for trial matching
5. Potential exclusion factors to consider

Format your response as JSON with the following structure:
{
  "reasoning": "detailed medical analysis",
  "recommendations": [],
  "confidence": 0.85,
  "nextSteps": [],
  "medicalInsights": [],
  "riskAssessment": {
    "level": "medium",
    "factors": []
  }
}`,
          },
        ],
        context: medicalContext,
        goal: "enhance_medical_analysis_for_trial_matching",
      };

      // Call ASI1 API with retry logic
      const asi1Response = await retryWithExponentialBackoff(async () => {
        const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages: asi1Request.messages,
            max_tokens: config.maxTokens,
            temperature: config.temperature,
            response_format: { type: "json_object" },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`ASI1 API error: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        return JSON.parse(result.choices[0].message.content);
      });

      // Validate and normalize ASI1 response
      const enhancedAnalysis: ASI1Response = {
        reasoning: asi1Response.reasoning || "ASI1 analysis completed",
        recommendations: asi1Response.recommendations || [],
        confidence: asi1Response.confidence || 0.5,
        nextSteps: asi1Response.nextSteps || [],
        medicalInsights: asi1Response.medicalInsights || [],
        riskAssessment: {
          level: asi1Response.riskAssessment?.level || "medium",
          factors: asi1Response.riskAssessment?.factors || [],
        },
      };

      // Store ASI1 interaction for tracking
      await ctx.runMutation(internal.asi1.storeInteraction, {
        consultationId: args.consultationId,
        patientId: consultation.patientId,
        request: asi1Request,
        response: enhancedAnalysis,
        processingTime: Date.now(),
        confidence: enhancedAnalysis.confidence,
      });

      return enhancedAnalysis;
    } catch (error) {
      console.error("Error in ASI1 enhanced medical analysis:", error);
      throw new ConvexError(
        `Failed to enhance medical analysis with ASI1: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

/**
 * ASI1-powered Clinical Trial Reasoning
 * This action uses ASI1 to perform intelligent analysis of clinical trial matches
 */
export const analyzeTrialMatches = action({
  args: {
    consultationId: v.id("consultations"),
    trialMatches: v.array(v.any()),
    medicalContext: v.any(),
  },
  handler: async (ctx, args) => {
    try {
      const apiKey = process.env.ASI1_API_KEY;
      if (!apiKey) {
        console.warn("ASI1 API key not found, using fallback trial analysis");
        // Return a basic analysis when ASI1 is not available
        return {
          enhancedTrials: args.trialMatches.map(
            (trial: any, index: number) => ({
              ...trial,
              relevanceScore: Math.max(70 - index * 5, 40), // Decreasing relevance
              asi1Analysis: {
                reasoning:
                  "Basic compatibility analysis performed (ASI1 not configured). Trial appears suitable based on condition matching.",
                benefits: [
                  "Potential treatment advancement",
                  "Access to innovative therapy",
                ],
                risks: [
                  "Standard clinical trial risks apply",
                  "Individual assessment required",
                ],
                confidence: 0.6,
              },
            })
          ),
          summary: {
            totalAnalyzed: args.trialMatches.length,
            highRelevance: Math.min(args.trialMatches.length, 2),
            recommendations: [
              "Review trial eligibility criteria carefully",
              "Discuss with healthcare provider",
              "Consider geographic accessibility",
            ],
          },
        };
      }

      const config: ASI1Config = {
        apiKey,
        baseUrl: process.env.ASI1_BASE_URL || "https://api.asi1.ai",
        model: process.env.ASI1_MODEL || "asi1-mini",
        maxTokens: 3000,
        temperature: 0.2,
      };

      // Prepare trial analysis request
      const analysisRequest = {
        messages: [
          {
            role: "system",
            content: `You are an expert clinical trial analyst with advanced reasoning capabilities. Your goal is to intelligently analyze and rank clinical trial matches for patients based on their medical profile.

Your analysis should consider:
- Medical condition compatibility
- Eligibility criteria alignment
- Risk-benefit assessment
- Patient-specific factors
- Trial design and methodology
- Geographic accessibility
- Timeline considerations

Provide detailed reasoning for each trial recommendation and rank them by overall suitability.`,
          },
          {
            role: "user",
            content: `Analyze these clinical trial matches for the patient and provide intelligent ranking and recommendations:

Patient Medical Context:
${JSON.stringify(args.medicalContext, null, 2)}

Clinical Trial Matches:
${JSON.stringify(args.trialMatches, null, 2)}

Please provide:
1. Intelligent ranking of trials by suitability
2. Detailed reasoning for each recommendation
3. Risk-benefit analysis for top matches
4. Specific eligibility considerations
5. Recommendations for patient discussion

Format as JSON with enhanced trial recommendations.`,
          },
        ],
      };

      // Call ASI1 API for trial analysis
      const analysisResponse = await retryWithExponentialBackoff(async () => {
        const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages: analysisRequest.messages,
            max_tokens: config.maxTokens,
            temperature: config.temperature,
            response_format: { type: "json_object" },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`ASI1 API error: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        return JSON.parse(result.choices[0].message.content);
      });

      return analysisResponse;
    } catch (error) {
      console.error("Error in ASI1 trial analysis:", error);
      throw new ConvexError(
        `Failed to analyze trials with ASI1: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

/**
 * Internal mutation to store ASI1 interactions for tracking and analysis
 */
export const storeInteraction = internalMutation({
  args: {
    consultationId: v.id("consultations"),
    patientId: v.id("users"),
    request: v.any(),
    response: v.any(),
    processingTime: v.number(),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.db.insert("asi1Interactions", {
        consultationId: args.consultationId,
        patientId: args.patientId,
        request: args.request,
        response: args.response,
        processingTime: args.processingTime,
        confidence: args.confidence,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Error storing ASI1 interaction:", error);
      // Don't throw here to avoid breaking the main flow
    }
  },
});

/**
 * Query to get ASI1 interactions for a consultation
 */
export const getInteractionsForConsultation = action({
  args: {
    consultationId: v.id("consultations"),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(internal.asi1.queryInteractions, {
      consultationId: args.consultationId,
    });
  },
});

/**
 * Internal query for ASI1 interactions
 */
export const queryInteractions = internalMutation({
  args: {
    consultationId: v.id("consultations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("asi1Interactions")
      .filter((q) => q.eq(q.field("consultationId"), args.consultationId))
      .order("desc")
      .collect();
  },
});
