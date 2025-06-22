import { ConvexHttpClient } from "convex/browser";
import { Id } from "../../convex/_generated/dataModel";
import { AgentConfig, AgentType, Skill } from "./types";
import { createDoctorAgent, initializeDoctorAgent } from "./doctorAgent";
import { createPatientAgent, initializePatientAgent } from "./patientAgent";
import { createASI1Agent, initializeASI1Agent } from "./asi1Agent";
import {
  initializeMessageSystem,
  initializeConvexClient,
} from "./communication";

/**
 * MediBuddy Agent System
 *
 * This module provides a centralized interface to the agent-based communication
 * system, implementing the Fetch.ai ASI-1 framework for autonomous agent communication.
 */

// Keep track of initialized agents
const activeAgents: Record<string, AgentConfig> = {};

// Cleanup function for the message system
let messageSystemCleanup: (() => void) | null = null;

/**
 * Initialize the agent system
 *
 * @param convexClient The Convex HTTP client for database operations
 * @returns A cleanup function to shut down the agent system
 */
export function initializeAgentSystem(
  convexClient: ConvexHttpClient
): () => void {
  console.log("Initializing MediBuddy agent system...");

  // Initialize the Convex client for all agent modules
  initializeConvexClient(convexClient);
  initializeDoctorAgent(convexClient);
  initializePatientAgent(convexClient);
  initializeASI1Agent(convexClient);

  // Start the message delivery system
  messageSystemCleanup = initializeMessageSystem();

  console.log("MediBuddy agent system initialized successfully");

  // Return a cleanup function
  return () => {
    if (messageSystemCleanup) {
      messageSystemCleanup();
      messageSystemCleanup = null;
    }

    // Clear active agents
    Object.keys(activeAgents).forEach((agentId) => {
      delete activeAgents[agentId];
    });

    console.log("MediBuddy agent system shut down");
  };
}

/**
 * Get or create a doctor agent
 *
 * @param doctorId The doctor's user ID
 * @returns The doctor agent configuration
 */
export function getDoctorAgent(doctorId: Id<"users">): AgentConfig {
  const agentId = `doctor-${doctorId}`;

  if (activeAgents[agentId]) {
    return activeAgents[agentId];
  }

  const agent = createDoctorAgent(doctorId);
  activeAgents[agentId] = agent;

  return agent;
}

/**
 * Get or create a patient agent
 *
 * @param patientId The patient's user ID
 * @returns The patient agent configuration
 */
export function getPatientAgent(patientId: Id<"users">): AgentConfig {
  const agentId = `patient-${patientId}`;

  if (activeAgents[agentId]) {
    return activeAgents[agentId];
  }

  const agent = createPatientAgent(patientId);
  activeAgents[agentId] = agent;

  return agent;
}

/**
 * Execute a skill on an agent
 *
 * @param agent The agent configuration
 * @param skillId The ID of the skill to execute
 * @param params The parameters for the skill
 * @returns The result of the skill execution
 */
export async function executeAgentSkill(
  agent: AgentConfig,
  skillId: string,
  params: Record<string, any>,
  userId?: Id<"users">
) {
  const skill = agent.skills.find((s) => s.id === skillId);

  if (!skill) {
    throw new Error(`Skill ${skillId} not found on agent ${agent.id}`);
  }

  return await skill.execute({
    agent,
    params,
    userId,
  });
}

/**
 * Get all active agents
 *
 * @returns Record of active agents
 */
export function getActiveAgents(): Record<string, AgentConfig> {
  return { ...activeAgents };
}

/**
 * Process transcription with doctor agent
 *
 * Helper function to easily process a transcription
 *
 * @param doctorId The doctor's user ID
 * @param consultationId The consultation ID
 * @returns The result of the transcription processing
 */
export async function processTranscriptionWithAgent(
  doctorId: Id<"users">,
  consultationId: Id<"consultations">
) {
  const doctorAgent = getDoctorAgent(doctorId);

  // Process the transcription
  const result = await executeAgentSkill(
    doctorAgent,
    "process-transcription",
    { consultationId },
    doctorId
  );

  if (!result.success) {
    console.error("Failed to process transcription:", result.error);
    return result;
  }

  // Find trial matches
  const matchesResult = await executeAgentSkill(
    doctorAgent,
    "find-trial-matches",
    { consultationId },
    doctorId
  );

  if (!matchesResult.success) {
    console.error("Failed to find trial matches:", matchesResult.error);
    return matchesResult;
  }

  // Analyze the matches
  const analysisResult = await executeAgentSkill(
    doctorAgent,
    "analyze-matches",
    {
      matches: matchesResult.data.matches,
      patientId: matchesResult.data.patientId,
    },
    doctorId
  );

  if (!analysisResult.success) {
    console.error("Failed to analyze matches:", analysisResult.error);
    return analysisResult;
  }

  return {
    success: true,
    data: {
      transcription: result.data,
      matches: matchesResult.data,
      analysis: analysisResult.data,
    },
  };
}

/**
 * Send trial matches to patient with doctor agent
 *
 * Helper function to notify a patient about trial matches
 *
 * @param doctorId The doctor's user ID
 * @param analyzedMatches The analyzed trial matches
 * @param patientId The patient's user ID
 * @param consultationId The consultation ID
 * @param doctorNotes Optional notes from the doctor
 * @returns The result of the notification
 */
export async function sendTrialMatchesToPatient(
  doctorId: Id<"users">,
  analyzedMatches: any[],
  patientId: Id<"users">,
  consultationId: Id<"consultations">,
  doctorNotes?: string
) {
  const doctorAgent = getDoctorAgent(doctorId);

  return await executeAgentSkill(
    doctorAgent,
    "notify-patient",
    {
      analyzedMatches,
      patientId,
      consultationId,
      doctorNotes,
    },
    doctorId
  );
}

/**
 * Update patient consent for a trial match
 *
 * Helper function for a patient to update their consent status
 *
 * @param patientId The patient's user ID
 * @param matchId The trial match ID
 * @param consentStatus The consent status
 * @param patientResponse Optional response from the patient
 * @returns The result of the consent update
 */
export async function updatePatientConsentWithAgent(
  patientId: Id<"users">,
  matchId: Id<"trialMatches">,
  consentStatus: "approved" | "declined" | "pending" | "enrolled",
  patientResponse?: string
) {
  const patientAgent = getPatientAgent(patientId);

  return await executeAgentSkill(
    patientAgent,
    "manage-consent",
    {
      matchId,
      consentStatus,
      patientResponse,
    },
    patientId
  );
}

/**
 * Ask a question about a trial match
 *
 * Helper function for a patient to ask a question about a trial
 *
 * @param patientId The patient's user ID
 * @param matchId The trial match ID
 * @param question The question text
 * @param requiredByDate Optional date by which a response is needed
 * @returns The result of asking the question
 */
export async function askTrialQuestionWithAgent(
  patientId: Id<"users">,
  matchId: Id<"trialMatches">,
  question: string,
  requiredByDate?: number
) {
  const patientAgent = getPatientAgent(patientId);

  return await executeAgentSkill(
    patientAgent,
    "ask-questions",
    {
      matchId,
      question,
      requiredByDate,
    },
    patientId
  );
}

/**
 * Get patient notifications with enhanced agent processing
 *
 * Helper function to get prioritized notifications for a patient
 *
 * @param patientId The patient's user ID
 * @returns Prioritized notifications and counts
 */
export async function getPatientNotificationsWithAgent(patientId: Id<"users">) {
  const patientAgent = getPatientAgent(patientId);

  return await executeAgentSkill(
    patientAgent,
    "process-notifications",
    { patientId },
    patientId
  );
}

/**
 * Get or create an ASI1 enhancement agent
 *
 * @param agentId The unique identifier for the ASI1 agent
 * @returns The ASI1 agent configuration
 */
export function getASI1Agent(agentId: string = "main"): AgentConfig {
  const fullAgentId = `asi1-${agentId}`;

  if (activeAgents[fullAgentId]) {
    return activeAgents[fullAgentId];
  }

  const agent = createASI1Agent(agentId);
  activeAgents[fullAgentId] = agent;

  return agent;
}

/**
 * Enhanced transcription processing with ASI1 integration
 *
 * @param doctorId The doctor's user ID
 * @param consultationId The consultation ID
 * @returns The result of the enhanced transcription processing
 */
export async function processTranscriptionWithASI1Enhancement(
  doctorId: Id<"users">,
  consultationId: Id<"consultations">
) {
  const doctorAgent = getDoctorAgent(doctorId);
  const asi1Agent = getASI1Agent();

  // Process the transcription with the doctor agent
  const result = await executeAgentSkill(
    doctorAgent,
    "process-transcription",
    { consultationId },
    doctorId
  );

  if (!result.success) {
    console.error("Failed to process transcription:", result.error);
    return result;
  }

  // Enhance with ASI1 reasoning
  const enhancedResult = await executeAgentSkill(
    asi1Agent,
    "enhance-medical-reasoning",
    {
      consultationId,
      extractedEntities: result.data.structuredData,
    }
  );

  if (!enhancedResult.success) {
    console.error("Failed to enhance with ASI1:", enhancedResult.error);
    // Continue with original result if ASI1 enhancement fails
    return result;
  }

  // Find trial matches with real-time data
  const matchesResult = await executeAgentSkill(
    asi1Agent,
    "optimize-trial-matching",
    { consultationId }
  );

  if (!matchesResult.success) {
    console.error(
      "Failed to find optimized trial matches:",
      matchesResult.error
    );
  }

  return {
    success: true,
    data: {
      transcription: result.data,
      asi1Enhancement: enhancedResult.data,
      optimizedMatches: matchesResult.success ? matchesResult.data : null,
    },
  };
}

/**
 * Enhanced trial matching with ASI1 analysis
 *
 * @param doctorId The doctor's user ID
 * @param consultationId The consultation ID
 * @param trialMatches The trial matches to analyze
 * @returns Enhanced trial analysis results
 */
export async function analyzeTrialMatchesWithASI1(
  doctorId: Id<"users">,
  consultationId: Id<"consultations">,
  trialMatches: any[]
) {
  const asi1Agent = getASI1Agent();

  // Get consultation and patient data for context
  const consultation = await executeAgentSkill(
    asi1Agent,
    "analyze-trial-compatibility",
    {
      consultationId,
      trialMatches,
      medicalContext: {
        consultationId,
        trialMatches,
      },
    }
  );

  if (!consultation.success) {
    console.error("Failed to analyze trials with ASI1:", consultation.error);
    return consultation;
  }

  // Generate personalized recommendations
  const recommendations = await executeAgentSkill(
    asi1Agent,
    "generate-personalized-recommendations",
    {
      patientProfile: consultation.data.patientProfile,
      trialMatches,
      preferences: {},
    }
  );

  return {
    success: true,
    data: {
      trialAnalysis: consultation.data,
      personalizedRecommendations: recommendations.success
        ? recommendations.data
        : null,
    },
  };
}

/**
 * Get comprehensive patient insights using ASI1
 *
 * @param patientId The patient's user ID
 * @param consultationId The consultation ID
 * @returns Comprehensive patient insights
 */
export async function getPatientInsightsWithASI1(
  patientId: Id<"users">,
  consultationId: Id<"consultations">
) {
  const asi1Agent = getASI1Agent();

  // Get enhanced medical reasoning
  const medicalInsights = await executeAgentSkill(
    asi1Agent,
    "enhance-medical-reasoning",
    { consultationId }
  );

  // Get risk-benefit assessment
  const riskAssessment = await executeAgentSkill(
    asi1Agent,
    "assess-risk-benefit",
    {
      patientProfile: { patientId },
      trialData: {},
    }
  );

  return {
    success: true,
    data: {
      medicalInsights: medicalInsights.success ? medicalInsights.data : null,
      riskAssessment: riskAssessment.success ? riskAssessment.data : null,
      timestamp: Date.now(),
    },
  };
}

// Export all types and functions from the agent system
export * from "./types";
export * from "./communication";
export * from "./asi1Agent";
