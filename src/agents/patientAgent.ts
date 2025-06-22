import { api } from "../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import {
  AgentConfig,
  AgentType,
  Skill,
  SkillContext,
  SkillResult,
  MessageType,
  TrialMatchMessage,
  PatientConsentMessage,
  PatientQuestionMessage,
} from "./types";
import {
  registerAgent,
  createAndSendMessage,
  sendMessage,
} from "./communication";
import { Id } from "../../convex/_generated/dataModel";

/**
 * Patient Agent Implementation
 *
 * This agent represents a patient in the MediBuddy system. It has skills for:
 * - Receiving and processing trial matches
 * - Managing patient consent
 * - Asking questions about trials
 * - Managing patient notifications
 */

// Convex client for database operations
let convexClient: ConvexHttpClient | null = null;

export function initializePatientAgent(client: ConvexHttpClient): void {
  convexClient = client;
}

/**
 * Create a new patient agent configuration
 *
 * @param patientId The patient's user ID
 * @returns The patient agent configuration
 */
export function createPatientAgent(patientId: Id<"users">): AgentConfig {
  // Create the agent configuration
  const agentConfig: AgentConfig = {
    id: `patient-${patientId}`,
    name: "Patient Agent",
    description:
      "Intelligent agent that assists patients with trial matching and consent management",
    type: AgentType.PATIENT,
    skills: [
      processTrialMatchSkill,
      managePatientConsentSkill,
      askTrialQuestionsSkill,
      processNotificationsSkill,
    ],
  };

  // Register the agent to receive messages
  registerAgent(agentConfig.id, async (message) => {
    // Message handler for the patient agent
    console.log(`Patient agent ${agentConfig.id} received message:`, message);

    // Process different message types
    switch (message.type) {
      case MessageType.TRIAL_MATCH:
        // Handle trial match notifications
        await handleTrialMatch(agentConfig, message);
        break;

      case MessageType.DOCTOR_RESPONSE:
        // Handle responses from the doctor agent
        await handleDoctorResponse(agentConfig, message);
        break;

      default:
        console.log(
          `Patient agent received unhandled message type: ${message.type}`
        );
    }
  });

  return agentConfig;
}

/**
 * Process Trial Match Skill
 *
 * This skill processes trial match notifications from the doctor agent.
 */
const processTrialMatchSkill: Skill = {
  id: "process-trial-match",
  name: "Process Trial Match",
  description: "Process trial match notifications from the doctor agent",
  execute: async (context: SkillContext): Promise<SkillResult> => {
    if (!convexClient) {
      return {
        success: false,
        error: "Convex client not initialized",
      };
    }

    try {
      const { trialMatchMessage } = context.params;

      if (!trialMatchMessage) {
        return {
          success: false,
          error: "Trial match message is required",
        };
      }

      // Extract data from the message
      const { matchId, patientId, trialId, relevanceScore, doctorNotes } =
        trialMatchMessage;

      // Create a notification in the system
      // This integrates with the existing notification system
      if (matchId) {
        // In this case, the match already exists, so we just need to update the notification status
        const result = await convexClient.mutation(
          api.notifications.markNotificationViewed,
          { notificationId: matchId }
        );

        console.log(`Updated notification status for match ${matchId}`);
      }

      // Calculate personalized relevance
      const personalizedRelevance = await calculatePersonalizedRelevance(
        patientId,
        trialId,
        relevanceScore
      );

      // Generate patient-friendly summary
      const summary = generatePatientFriendlySummary(trialMatchMessage);

      return {
        success: true,
        data: {
          matchId,
          personalizedRelevance,
          summary,
        },
      };
    } catch (error) {
      console.error("Error in processTrialMatchSkill:", error);
      return {
        success: false,
        error: `Failed to process trial match: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

/**
 * Manage Patient Consent Skill
 *
 * This skill manages patient consent for clinical trials.
 */
const managePatientConsentSkill: Skill = {
  id: "manage-consent",
  name: "Manage Patient Consent",
  description: "Manage patient consent for clinical trials",
  execute: async (context: SkillContext): Promise<SkillResult> => {
    if (!convexClient) {
      return {
        success: false,
        error: "Convex client not initialized",
      };
    }

    try {
      const { matchId, consentStatus, patientResponse } = context.params;

      if (!matchId || !consentStatus) {
        return {
          success: false,
          error: "Match ID and consent status are required",
        };
      }

      // Update the consent status in the database
      await convexClient.mutation(api.notifications.updatePatientConsent, {
        matchId,
        consentStatus,
        patientResponse,
      });

      // Create a consent message to send to the doctor agent
      const consentMessage: PatientConsentMessage = {
        matchId,
        consentStatus,
        patientResponse,
      };

      // Get the match to find the doctor ID
      const match = await convexClient.query(api.trialMatching.getMatchById, {
        id: matchId,
      });

      if (!match) {
        return {
          success: false,
          error: "Match not found",
        };
      }

      // Get the consultation to find the doctor ID
      const consultation = await convexClient.query(api.consultations.get, {
        id: match.consultationId,
      });

      if (!consultation) {
        return {
          success: false,
          error: "Consultation not found",
        };
      }

      // Send the consent message to the doctor agent
      const sentMessage = await createAndSendMessage(
        context.agent.id,
        AgentType.PATIENT,
        `doctor-${consultation.doctorId}`,
        AgentType.DOCTOR,
        consentMessage,
        MessageType.PATIENT_CONSENT
      );

      return {
        success: true,
        data: {
          updatedConsent: consentStatus,
          sentMessage,
        },
      };
    } catch (error) {
      console.error("Error in managePatientConsentSkill:", error);
      return {
        success: false,
        error: `Failed to manage consent: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

/**
 * Ask Trial Questions Skill
 *
 * This skill allows patients to ask questions about clinical trials.
 */
const askTrialQuestionsSkill: Skill = {
  id: "ask-questions",
  name: "Ask Trial Questions",
  description: "Ask questions about clinical trials to doctor agent",
  execute: async (context: SkillContext): Promise<SkillResult> => {
    if (!convexClient) {
      return {
        success: false,
        error: "Convex client not initialized",
      };
    }

    try {
      const { matchId, question, requiredByDate } = context.params;

      if (!matchId || !question) {
        return {
          success: false,
          error: "Match ID and question are required",
        };
      }

      // Create a question message
      const questionMessage: PatientQuestionMessage = {
        matchId,
        question,
        requiredByDate,
      };

      // Get the match to find the doctor ID
      const match = await convexClient.query(api.trialMatching.getMatchById, {
        id: matchId,
      });

      if (!match) {
        return {
          success: false,
          error: "Match not found",
        };
      }

      // Get the consultation to find the doctor ID
      const consultation = await convexClient.query(api.consultations.get, {
        id: match.consultationId,
      });

      if (!consultation) {
        return {
          success: false,
          error: "Consultation not found",
        };
      }

      // Send the question to the doctor agent
      const sentMessage = await createAndSendMessage(
        context.agent.id,
        AgentType.PATIENT,
        `doctor-${consultation.doctorId}`,
        AgentType.DOCTOR,
        questionMessage,
        MessageType.PATIENT_QUESTION
      );

      return {
        success: true,
        data: {
          sentMessage,
          estimatedResponseTime: "24-48 hours",
        },
      };
    } catch (error) {
      console.error("Error in askTrialQuestionsSkill:", error);
      return {
        success: false,
        error: `Failed to ask question: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

/**
 * Process Notifications Skill
 *
 * This skill processes system notifications for the patient.
 */
const processNotificationsSkill: Skill = {
  id: "process-notifications",
  name: "Process Notifications",
  description: "Process system notifications for the patient",
  execute: async (context: SkillContext): Promise<SkillResult> => {
    if (!convexClient) {
      return {
        success: false,
        error: "Convex client not initialized",
      };
    }

    try {
      const { patientId } = context.params;

      if (!patientId) {
        return {
          success: false,
          error: "Patient ID is required",
        };
      }

      // Get notifications for the patient
      const notifications = await convexClient.query(
        api.notifications.getPatientNotifications,
        { patientId }
      );

      // Get unread notification count
      const unreadCount = await convexClient.query(
        api.notifications.getUnreadNotificationCount,
        { patientId }
      );

      // Get action required notification count
      const actionRequiredCount = await convexClient.query(
        api.notifications.getActionRequiredNotificationCount,
        { patientId }
      );

      // Prioritize notifications
      const prioritizedNotifications = prioritizeNotifications(notifications);

      return {
        success: true,
        data: {
          notifications: prioritizedNotifications,
          unreadCount,
          actionRequiredCount,
          topPriority: prioritizedNotifications[0] || null,
        },
      };
    } catch (error) {
      console.error("Error in processNotificationsSkill:", error);
      return {
        success: false,
        error: `Failed to process notifications: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

/**
 * Handler for trial match messages
 */
async function handleTrialMatch(
  agent: AgentConfig,
  message: any
): Promise<void> {
  try {
    // Execute the process trial match skill
    await processTrialMatchSkill.execute({
      agent,
      params: {
        trialMatchMessage: message.content,
      },
    });
  } catch (error) {
    console.error("Error handling trial match:", error);
  }
}

/**
 * Handler for doctor response messages
 */
async function handleDoctorResponse(
  agent: AgentConfig,
  message: any
): Promise<void> {
  try {
    // In a real implementation, this would update the UI or send a notification to the patient
    console.log(
      `Received response from doctor for question ${message.content.responseToQuestionId}`
    );
    console.log(`Response: ${message.content.response}`);

    // If there are additional resources, log them
    if (
      message.content.additionalResources &&
      message.content.additionalResources.length > 0
    ) {
      console.log("Additional resources:", message.content.additionalResources);
    }
  } catch (error) {
    console.error("Error handling doctor response:", error);
  }
}

/**
 * Helper functions for trial match processing
 */

async function calculatePersonalizedRelevance(
  patientId: Id<"users">,
  trialId: Id<"clinicalTrials">,
  baseRelevance: number
): Promise<number> {
  // In a real implementation, this would calculate a personalized relevance score
  // based on the patient's preferences, location, and other factors

  // For now, just adjust the base relevance slightly
  const adjustment = Math.random() * 10 - 5; // Random adjustment between -5 and +5
  return Math.min(100, Math.max(0, baseRelevance + adjustment));
}

function generatePatientFriendlySummary(
  trialMatchMessage: TrialMatchMessage
): string {
  // In a real implementation, this would generate a patient-friendly summary
  // based on the trial match data

  // For now, return a placeholder
  return `You've been matched with a clinical trial with a ${trialMatchMessage.relevanceScore}% match to your medical profile. This trial may be relevant to your condition.`;
}

function prioritizeNotifications(notifications: any[]): any[] {
  if (!notifications || notifications.length === 0) {
    return [];
  }

  // Sort notifications by priority:
  // 1. Action required (pending consent)
  // 2. Unread (notification status is "sent")
  // 3. Recently updated
  return [...notifications].sort((a, b) => {
    // First priority: Action required
    if (a.consentStatus === "pending" && b.consentStatus !== "pending") {
      return -1;
    }
    if (a.consentStatus !== "pending" && b.consentStatus === "pending") {
      return 1;
    }

    // Second priority: Unread
    if (a.notificationStatus === "sent" && b.notificationStatus !== "sent") {
      return -1;
    }
    if (a.notificationStatus !== "sent" && b.notificationStatus === "sent") {
      return 1;
    }

    // Third priority: Relevance score
    if (a.relevanceScore !== b.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }

    // Fourth priority: Recent updates
    return (b.updatedAt || b.matchDate) - (a.updatedAt || a.matchDate);
  });
}
