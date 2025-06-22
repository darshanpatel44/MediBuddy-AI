import { api } from "../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import {
  AgentConfig,
  AgentType,
  Skill,
  SkillContext,
  SkillResult,
  MessageType,
  TranscriptAnalysisMessage,
  TrialMatchMessage,
} from "./types";
import {
  registerAgent,
  createAndSendMessage,
  sendMessage,
} from "./communication";
import { Id } from "../../convex/_generated/dataModel";

/**
 * Doctor Agent Implementation
 *
 * This agent represents a doctor in the MediBuddy system. It has skills for:
 * - Processing transcriptions from consultations
 * - Finding and analyzing trial matches
 * - Communicating with patient agents
 */

// Convex client for database operations
let convexClient: ConvexHttpClient | null = null;

export function initializeDoctorAgent(client: ConvexHttpClient): void {
  convexClient = client;
}

/**
 * Create a new doctor agent configuration
 *
 * @param doctorId The doctor's user ID
 * @returns The doctor agent configuration
 */
export function createDoctorAgent(doctorId: Id<"users">): AgentConfig {
  // Create the agent configuration
  const agentConfig: AgentConfig = {
    id: `doctor-${doctorId}`,
    name: "Doctor Agent",
    description:
      "Intelligent agent that assists doctors with consultations and trial matching",
    type: AgentType.DOCTOR,
    skills: [
      processTranscriptionSkill,
      findTrialMatchesSkill,
      analyzePotentialMatches,
      notifyPatientAgent,
      respondToPatientQuestions,
    ],
  };

  // Register the agent to receive messages
  registerAgent(agentConfig.id, async (message) => {
    // Message handler for the doctor agent
    console.log(`Doctor agent ${agentConfig.id} received message:`, message);

    // Process different message types
    switch (message.type) {
      case MessageType.PATIENT_QUESTION:
        // Handle patient questions
        await handlePatientQuestion(agentConfig, message);
        break;

      case MessageType.PATIENT_CONSENT:
        // Handle patient consent responses
        await handlePatientConsent(agentConfig, message);
        break;

      default:
        console.log(
          `Doctor agent received unhandled message type: ${message.type}`
        );
    }
  });

  return agentConfig;
}

/**
 * Process Transcription Skill
 *
 * This skill processes a consultation transcription and extracts medical entities.
 */
const processTranscriptionSkill: Skill = {
  id: "process-transcription",
  name: "Process Consultation Transcription",
  description: "Extract medical entities from consultation transcriptions",
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

      // Call the medical entity extraction function
      const structuredData = await convexClient.action(
        api.medicalEntityExtraction.extractMedicalEntities,
        { consultationId }
      );

      // Get the consultation to access the transcription
      const consultation = await convexClient.query(api.consultations.get, {
        id: consultationId,
      });

      if (!consultation) {
        return {
          success: false,
          error: "Consultation not found",
        };
      }

      // Create an analysis of the transcription
      const analysis = {
        summary: generateConsultationSummary(structuredData),
        followUpRecommendations:
          generateFollowUpRecommendations(structuredData),
        riskFactors: identifyRiskFactors(structuredData),
      };

      // Create a transcript analysis message
      const transcriptAnalysis: TranscriptAnalysisMessage = {
        consultationId,
        transcription: consultation.transcription || "",
        structuredData,
        analysis,
      };

      // Return the result
      return {
        success: true,
        data: {
          structuredData,
          analysis,
          message: transcriptAnalysis,
        },
      };
    } catch (error) {
      console.error("Error in processTranscriptionSkill:", error);
      return {
        success: false,
        error: `Failed to process transcription: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

/**
 * Find Trial Matches Skill
 *
 * This skill finds potential clinical trial matches for a patient based on consultation data.
 */
const findTrialMatchesSkill: Skill = {
  id: "find-trial-matches",
  name: "Find Trial Matches",
  description: "Find potential clinical trial matches for a patient",
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

      // Call the trial matching function
      const matchResults = await convexClient.action(
        api.trialMatching.findMatchingTrials,
        { consultationId }
      );

      // Get the consultation to access the patient ID
      const consultation = await convexClient.query(api.consultations.get, {
        id: consultationId,
      });

      if (!consultation) {
        return {
          success: false,
          error: "Consultation not found",
        };
      }

      return {
        success: true,
        data: {
          matches: matchResults.matchedTrials,
          matchCount: matchResults.matchCount,
          patientId: consultation.patientId,
        },
      };
    } catch (error) {
      console.error("Error in findTrialMatchesSkill:", error);
      return {
        success: false,
        error: `Failed to find trial matches: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

/**
 * Analyze Potential Matches Skill
 *
 * This skill analyzes potential trial matches and provides insights and recommendations.
 */
const analyzePotentialMatches: Skill = {
  id: "analyze-matches",
  name: "Analyze Trial Matches",
  description: "Analyze potential trial matches and provide recommendations",
  execute: async (context: SkillContext): Promise<SkillResult> => {
    try {
      const { matches, patientId } = context.params;

      if (!matches || !Array.isArray(matches) || !patientId) {
        return {
          success: false,
          error: "Matches array and patient ID are required",
        };
      }

      // Analyze each match and add recommendations
      const analyzedMatches = matches.map((match) => {
        // Generate personalized insights for this match
        const insights = generateMatchInsights(match);

        // Generate recommendations based on the match data
        const recommendations = generateMatchRecommendations(match);

        return {
          ...match,
          insights,
          recommendations,
        };
      });

      // Sort matches by priority (most relevant first)
      analyzedMatches.sort((a, b) => {
        // Sort by relevance score
        return b.relevanceScore - a.relevanceScore;
      });

      return {
        success: true,
        data: {
          analyzedMatches,
          topRecommendations: analyzedMatches.slice(0, 3), // Top 3 recommendations
        },
      };
    } catch (error) {
      console.error("Error in analyzePotentialMatches:", error);
      return {
        success: false,
        error: `Failed to analyze matches: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

/**
 * Notify Patient Agent Skill
 *
 * This skill sends notifications to patient agents about trial matches.
 */
const notifyPatientAgent: Skill = {
  id: "notify-patient",
  name: "Notify Patient Agent",
  description: "Send notifications to patient agents about trial matches",
  execute: async (context: SkillContext): Promise<SkillResult> => {
    try {
      const { analyzedMatches, patientId, consultationId, doctorNotes } =
        context.params;

      if (
        !analyzedMatches ||
        !Array.isArray(analyzedMatches) ||
        !patientId ||
        !consultationId
      ) {
        return {
          success: false,
          error:
            "Analyzed matches, patient ID, and consultation ID are required",
        };
      }

      const sentMessages = [];

      // Send a message to the patient agent for each match
      for (const match of analyzedMatches) {
        // Create a trial match message
        const trialMatchMessage: TrialMatchMessage = {
          consultationId,
          patientId,
          trialId: match.trial._id,
          matchId: match.matchId,
          relevanceScore: match.relevanceScore,
          matchReasons: match.matchingFactors || [],
          doctorNotes: doctorNotes || match.recommendations?.join(", ") || "",
        };

        // Send the message to the patient agent
        const sentMessage = await createAndSendMessage(
          context.agent.id,
          AgentType.DOCTOR,
          `patient-${patientId}`,
          AgentType.PATIENT,
          trialMatchMessage,
          MessageType.TRIAL_MATCH,
          { priority: match.relevanceScore > 85 ? "high" : "normal" }
        );

        sentMessages.push(sentMessage);
      }

      return {
        success: true,
        data: {
          sentMessages,
          notificationCount: sentMessages.length,
        },
      };
    } catch (error) {
      console.error("Error in notifyPatientAgent:", error);
      return {
        success: false,
        error: `Failed to notify patient agent: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

/**
 * Respond to Patient Questions Skill
 *
 * This skill allows the doctor agent to respond to questions from patient agents.
 */
const respondToPatientQuestions: Skill = {
  id: "respond-to-questions",
  name: "Respond to Patient Questions",
  description: "Generate responses to patient questions about clinical trials",
  execute: async (context: SkillContext): Promise<SkillResult> => {
    try {
      const { questionMessage, matchId } = context.params;

      if (!questionMessage || !matchId) {
        return {
          success: false,
          error: "Question message and match ID are required",
        };
      }

      // Generate a response to the patient's question
      const response = await generateResponseToPatientQuestion(
        questionMessage,
        matchId
      );

      // Send the response back to the patient agent
      const sentMessage = await createAndSendMessage(
        context.agent.id,
        AgentType.DOCTOR,
        questionMessage.senderId,
        AgentType.PATIENT,
        {
          matchId,
          responseToQuestionId: questionMessage.id,
          response: response.answer,
          additionalResources: response.resources,
        },
        MessageType.DOCTOR_RESPONSE
      );

      return {
        success: true,
        data: {
          sentMessage,
          response,
        },
      };
    } catch (error) {
      console.error("Error in respondToPatientQuestions:", error);
      return {
        success: false,
        error: `Failed to respond to patient question: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

/**
 * Handler for patient questions
 */
async function handlePatientQuestion(
  agent: AgentConfig,
  message: any
): Promise<void> {
  try {
    // Execute the respond to patient questions skill
    await respondToPatientQuestions.execute({
      agent,
      params: {
        questionMessage: message,
        matchId: message.content.matchId,
      },
    });
  } catch (error) {
    console.error("Error handling patient question:", error);
  }
}

/**
 * Handler for patient consent responses
 */
async function handlePatientConsent(
  agent: AgentConfig,
  message: any
): Promise<void> {
  try {
    // Update the trial match with the patient's consent status
    if (convexClient) {
      await convexClient.mutation(api.notifications.updatePatientConsent, {
        matchId: message.content.matchId,
        consentStatus: message.content.consentStatus,
        patientResponse: message.content.patientResponse,
      });
    }

    console.log(
      `Updated consent status for match ${message.content.matchId} to ${message.content.consentStatus}`
    );
  } catch (error) {
    console.error("Error handling patient consent:", error);
  }
}

/**
 * Helper functions for generating analysis and recommendations
 */

function generateConsultationSummary(structuredData: any): string {
  // In a real implementation, this would generate a summary based on the structured data
  // For now, return a placeholder
  const conditionsList = structuredData.conditions
    .map((c) => `${c.name} (${c.severity})`)
    .join(", ");

  return (
    `Patient presents with ${conditionsList}. ` +
    `Currently taking ${structuredData.medications.length} medications. ` +
    `Has ${structuredData.allergies.length} known allergies.`
  );
}

function generateFollowUpRecommendations(structuredData: any): string[] {
  // In a real implementation, this would generate recommendations based on the structured data
  // For now, return placeholders
  return [
    "Schedule follow-up appointment in 2 weeks",
    "Recommend additional lab tests",
    "Consider referral to specialist",
  ];
}

function identifyRiskFactors(structuredData: any): string[] {
  // In a real implementation, this would identify risk factors based on the structured data
  // For now, return placeholders
  return [
    "Family history of heart disease",
    "Sedentary lifestyle",
    "High stress levels",
  ];
}

function generateMatchInsights(match: any): string[] {
  // In a real implementation, this would generate insights based on the match data
  // For now, return placeholders
  return [
    `Trial has a ${match.relevanceScore}% match with patient's condition`,
    `Trial is currently in ${match.trial.phase}`,
    `Trial requires ${match.trial.eligibilityCriteria.length} eligibility criteria to be met`,
  ];
}

function generateMatchRecommendations(match: any): string[] {
  // In a real implementation, this would generate recommendations based on the match data
  // For now, return placeholders
  return [
    "Review patient's comorbidities before recommending",
    "Check for potential drug interactions with current medications",
    "Consider patient's proximity to trial location",
  ];
}

async function generateResponseToPatientQuestion(
  questionMessage: any,
  matchId: Id<"trialMatches">
): Promise<{ answer: string; resources: string[] }> {
  // In a real implementation, this would generate a response based on the question
  // For now, return a placeholder
  return {
    answer:
      "Thank you for your question. This clinical trial is designed to test the efficacy of a new treatment approach. Based on your medical profile, you appear to be a good candidate for this study.",
    resources: [
      "https://clinicaltrials.gov",
      "Patient information brochure",
      "Consent form details",
    ],
  };
}
