import { api } from "../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import {
  AgentConfig,
  AgentType,
  Skill,
  SkillContext,
  SkillResult,
  MessageType,
} from "./types";
import { registerAgent, createAndSendMessage } from "./communication";
import { Id } from "../../convex/_generated/dataModel";

/**
 * ASI1 Enhancement Agent Implementation
 *
 * This agent provides advanced agentic reasoning capabilities using fetch.ai's ASI1
 * It enhances the existing medical entity extraction and trial matching with:
 * - Advanced medical reasoning
 * - Intelligent trial analysis
 * - Risk-benefit assessment
 * - Personalized recommendations
 */

// Convex client for database operations
let convexClient: ConvexHttpClient | null = null;

export function initializeASI1Agent(client: ConvexHttpClient): void {
  convexClient = client;
}

/**
 * Create a new ASI1 enhancement agent configuration
 */
export function createASI1Agent(agentId: string): AgentConfig {
  const agentConfig: AgentConfig = {
    id: `asi1-${agentId}`,
    name: "ASI1 Enhancement Agent",
    description:
      "Advanced agentic AI that provides intelligent medical reasoning and clinical trial analysis using fetch.ai's ASI1",
    type: AgentType.ASI1, // Dedicated ASI1 agent type
    skills: [
      enhanceMedicalReasoningSkill,
      analyzeTrialCompatibilitySkill,
      assessRiskBenefitSkill,
      generatePersonalizedRecommendationsSkill,
      optimizeTrialMatchingSkill,
    ],
  };

  // Register the agent to receive messages
  registerAgent(agentConfig.id, async (message) => {
    console.log(`ASI1 agent ${agentConfig.id} received message:`, message);

    // Process different message types
    switch (message.type) {
      case MessageType.TRANSCRIPT_ANALYSIS:
        await handleTranscriptAnalysis(agentConfig, message);
        break;

      case MessageType.TRIAL_MATCH:
        await handleTrialMatchAnalysis(agentConfig, message);
        break;

      default:
        console.log(
          `ASI1 agent received unhandled message type: ${message.type}`
        );
    }
  });

  return agentConfig;
}

/**
 * Enhanced Medical Reasoning Skill
 * Uses ASI1 to provide advanced medical reasoning on patient data
 */
const enhanceMedicalReasoningSkill: Skill = {
  id: "enhance-medical-reasoning",
  name: "Enhanced Medical Reasoning",
  description:
    "Provide advanced medical reasoning using ASI1 agentic capabilities",
  execute: async (context: SkillContext): Promise<SkillResult> => {
    if (!convexClient) {
      return {
        success: false,
        error: "Convex client not initialized",
      };
    }

    try {
      const { consultationId, extractedEntities } = context.params;

      if (!consultationId || !extractedEntities) {
        return {
          success: false,
          error: "Consultation ID and extracted entities are required",
        };
      }

      // Call ASI1 enhanced medical analysis
      const enhancedAnalysis = await convexClient.action(
        api.asi1.enhanceMedicalAnalysis,
        {
          consultationId,
          extractedEntities,
        }
      );

      return {
        success: true,
        data: {
          enhancedAnalysis,
          reasoning: enhancedAnalysis.reasoning,
          confidence: enhancedAnalysis.confidence,
          medicalInsights: enhancedAnalysis.medicalInsights,
          riskAssessment: enhancedAnalysis.riskAssessment,
        },
      };
    } catch (error) {
      console.error("Error in enhanced medical reasoning:", error);
      return {
        success: false,
        error: `Failed to enhance medical reasoning: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
};

/**
 * Trial Compatibility Analysis Skill
 * Analyzes clinical trial compatibility using ASI1 reasoning
 */
const analyzeTrialCompatibilitySkill: Skill = {
  id: "analyze-trial-compatibility",
  name: "Analyze Trial Compatibility",
  description:
    "Analyze clinical trial compatibility using ASI1 intelligent reasoning",
  execute: async (context: SkillContext): Promise<SkillResult> => {
    if (!convexClient) {
      return {
        success: false,
        error: "Convex client not initialized",
      };
    }

    try {
      const { consultationId, trialMatches, medicalContext } = context.params;

      if (!consultationId || !trialMatches || !medicalContext) {
        return {
          success: false,
          error:
            "Consultation ID, trial matches, and medical context are required",
        };
      }

      // Call ASI1 trial analysis
      const trialAnalysis = await convexClient.action(
        api.asi1.analyzeTrialMatches,
        {
          consultationId,
          trialMatches,
          medicalContext,
        }
      );

      return {
        success: true,
        data: {
          trialAnalysis,
          rankedTrials: trialAnalysis.rankedTrials || trialMatches,
          recommendations: trialAnalysis.recommendations || [],
        },
      };
    } catch (error) {
      console.error("Error in trial compatibility analysis:", error);
      return {
        success: false,
        error: `Failed to analyze trial compatibility: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
};

/**
 * Risk-Benefit Assessment Skill
 * Provides intelligent risk-benefit analysis for clinical trials
 */
const assessRiskBenefitSkill: Skill = {
  id: "assess-risk-benefit",
  name: "Risk-Benefit Assessment",
  description: "Assess risk-benefit ratio for clinical trial participation",
  execute: async (context: SkillContext): Promise<SkillResult> => {
    try {
      const { patientProfile, trialData, medicalHistory } = context.params;

      if (!patientProfile || !trialData) {
        return {
          success: false,
          error: "Patient profile and trial data are required",
        };
      }

      // Generate risk-benefit assessment using ASI1 reasoning
      const riskFactors = identifyRiskFactors(
        patientProfile,
        trialData,
        medicalHistory
      );
      const benefits = identifyPotentialBenefits(patientProfile, trialData);
      const overallAssessment = calculateRiskBenefitRatio(
        riskFactors,
        benefits
      );

      return {
        success: true,
        data: {
          riskFactors,
          benefits,
          overallAssessment,
          recommendation: generateRiskBenefitRecommendation(overallAssessment),
        },
      };
    } catch (error) {
      console.error("Error in risk-benefit assessment:", error);
      return {
        success: false,
        error: `Failed to assess risk-benefit: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
};

/**
 * Personalized Recommendations Skill
 * Generates personalized recommendations using ASI1 capabilities
 */
const generatePersonalizedRecommendationsSkill: Skill = {
  id: "generate-personalized-recommendations",
  name: "Generate Personalized Recommendations",
  description:
    "Generate personalized clinical trial recommendations using ASI1",
  execute: async (context: SkillContext): Promise<SkillResult> => {
    try {
      const { patientProfile, trialMatches, preferences } = context.params;

      if (!patientProfile || !trialMatches) {
        return {
          success: false,
          error: "Patient profile and trial matches are required",
        };
      }

      // Generate personalized recommendations
      const personalizedRecommendations = generateRecommendations(
        patientProfile,
        trialMatches,
        preferences
      );

      return {
        success: true,
        data: {
          recommendations: personalizedRecommendations,
          priorityOrder: rankRecommendationsByPriority(
            personalizedRecommendations
          ),
          patientSpecificFactors: extractPatientSpecificFactors(patientProfile),
        },
      };
    } catch (error) {
      console.error("Error generating personalized recommendations:", error);
      return {
        success: false,
        error: `Failed to generate recommendations: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
};

/**
 * Optimize Trial Matching Skill
 * Uses ASI1 to optimize the trial matching algorithm
 */
const optimizeTrialMatchingSkill: Skill = {
  id: "optimize-trial-matching",
  name: "Optimize Trial Matching",
  description: "Optimize trial matching using ASI1 intelligent algorithms",
  execute: async (context: SkillContext): Promise<SkillResult> => {
    if (!convexClient) {
      return {
        success: false,
        error: "Convex client not initialized",
      };
    }

    try {
      const { consultationId } = context.params;

      if (!consultationId) {
        return {
          success: false,
          error: "Consultation ID is required",
        };
      }

      // Get real-time trial data
      const realTimeMatches = await convexClient.action(
        api.clinicalTrials.findMatchingTrialsRealTime,
        {
          consultationId,
          useRealTimeData: true,
        }
      );

      // Optimize matching using ASI1
      const optimizedMatches = await optimizeMatchingAlgorithm(
        realTimeMatches.trials,
        consultationId
      );

      return {
        success: true,
        data: {
          optimizedMatches,
          realTimeCount: realTimeMatches.realTimeCount,
          localCount: realTimeMatches.localCount,
          totalOptimized: optimizedMatches.length,
        },
      };
    } catch (error) {
      console.error("Error optimizing trial matching:", error);
      return {
        success: false,
        error: `Failed to optimize trial matching: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
};

/**
 * Message Handlers
 */

async function handleTranscriptAnalysis(
  agent: AgentConfig,
  message: any
): Promise<void> {
  try {
    // Execute enhanced medical reasoning
    await enhanceMedicalReasoningSkill.execute({
      agent,
      params: {
        consultationId: message.content.consultationId,
        extractedEntities: message.content.structuredData,
      },
    });
  } catch (error) {
    console.error("Error handling transcript analysis:", error);
  }
}

async function handleTrialMatchAnalysis(
  agent: AgentConfig,
  message: any
): Promise<void> {
  try {
    // Execute trial compatibility analysis
    await analyzeTrialCompatibilitySkill.execute({
      agent,
      params: {
        consultationId: message.content.consultationId,
        trialMatches: message.content.trialMatches,
        medicalContext: message.content.medicalContext,
      },
    });
  } catch (error) {
    console.error("Error handling trial match analysis:", error);
  }
}

/**
 * Helper Functions
 */

function identifyRiskFactors(
  patientProfile: any,
  trialData: any,
  medicalHistory?: any
): string[] {
  const riskFactors: string[] = [];

  // Age-related risks
  if (patientProfile.age && patientProfile.age > 65) {
    riskFactors.push("Advanced age may increase treatment risks");
  }

  // Comorbidity risks
  if (patientProfile.comorbidities && patientProfile.comorbidities.length > 0) {
    riskFactors.push("Multiple comorbidities may complicate treatment");
  }

  // Medication interaction risks
  if (patientProfile.medications && patientProfile.medications.length > 3) {
    riskFactors.push("Multiple medications may increase interaction risks");
  }

  return riskFactors;
}

function identifyPotentialBenefits(
  patientProfile: any,
  trialData: any
): string[] {
  const benefits: string[] = [];

  // Access to novel treatments
  benefits.push("Access to cutting-edge treatment options");

  // Close monitoring
  benefits.push("Enhanced medical monitoring and care");

  // Potential for improved outcomes
  if (trialData.phase && ["Phase 2", "Phase 3"].includes(trialData.phase)) {
    benefits.push("Participation in advanced-stage clinical research");
  }

  return benefits;
}

function calculateRiskBenefitRatio(
  riskFactors: string[],
  benefits: string[]
): {
  ratio: number;
  assessment: string;
} {
  const riskScore = riskFactors.length;
  const benefitScore = benefits.length;
  const ratio = benefitScore / Math.max(riskScore, 1);

  let assessment: string;
  if (ratio > 1.5) {
    assessment = "Favorable risk-benefit ratio";
  } else if (ratio > 1.0) {
    assessment = "Balanced risk-benefit ratio";
  } else {
    assessment = "Careful consideration required";
  }

  return { ratio, assessment };
}

function generateRiskBenefitRecommendation(assessment: {
  ratio: number;
  assessment: string;
}): string {
  if (assessment.ratio > 1.5) {
    return "Strongly recommend discussing trial participation with patient";
  } else if (assessment.ratio > 1.0) {
    return "Recommend discussing trial participation with detailed risk explanation";
  } else {
    return "Recommend careful evaluation and patient counseling before proceeding";
  }
}

function generateRecommendations(
  patientProfile: any,
  trialMatches: any[],
  preferences?: any
): any[] {
  return trialMatches.map((trial, index) => ({
    trial,
    priority: index + 1,
    reasoning: `Trial matches patient profile based on ${trial.conditions?.join(", ") || "medical conditions"}`,
    personalizedFactors: extractPersonalizedFactors(patientProfile, trial),
  }));
}

function rankRecommendationsByPriority(recommendations: any[]): any[] {
  return recommendations.sort((a, b) => a.priority - b.priority);
}

function extractPatientSpecificFactors(patientProfile: any): string[] {
  const factors: string[] = [];

  if (patientProfile.age) {
    factors.push(`Age: ${patientProfile.age} years`);
  }

  if (patientProfile.location) {
    factors.push(`Location: ${patientProfile.location}`);
  }

  if (patientProfile.medicalHistory) {
    factors.push(
      `Medical history: ${patientProfile.medicalHistory.length} conditions`
    );
  }

  return factors;
}

function extractPersonalizedFactors(patientProfile: any, trial: any): string[] {
  const factors: string[] = [];

  // Location compatibility
  if (trial.locations && patientProfile.location) {
    const hasNearbyLocation = trial.locations.some((loc: string) =>
      loc.toLowerCase().includes(patientProfile.location.toLowerCase())
    );
    if (hasNearbyLocation) {
      factors.push("Trial location accessible to patient");
    }
  }

  // Age compatibility
  if (trial.ageRange && patientProfile.age) {
    if (
      patientProfile.age >= trial.ageRange.min &&
      patientProfile.age <= trial.ageRange.max
    ) {
      factors.push("Patient age within trial criteria");
    }
  }

  return factors;
}

async function optimizeMatchingAlgorithm(
  trials: any[],
  consultationId: string
): Promise<any[]> {
  // Apply ASI1-powered optimization logic
  // This would use more sophisticated algorithms in a real implementation
  return trials.sort((a, b) => {
    // Prioritize recruiting trials
    if (a.status === "recruiting" && b.status !== "recruiting") return -1;
    if (b.status === "recruiting" && a.status !== "recruiting") return 1;

    // Prioritize trials with more recent updates
    return (b.lastUpdated || 0) - (a.lastUpdated || 0);
  });
}
