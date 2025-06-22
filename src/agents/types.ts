import { Id } from "../../convex/_generated/dataModel";

/**
 * Agent Configuration Types
 */

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  skills: Skill[];
}

export enum AgentType {
  DOCTOR = "doctor",
  PATIENT = "patient",
  ASI1 = "asi1",
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  execute: (context: SkillContext) => Promise<SkillResult>;
}

export interface SkillContext {
  agent: AgentConfig;
  params: Record<string, any>;
  userId?: Id<"users">;
  messageHistory?: AgentMessage[];
}

export interface SkillResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Agent Communication Types
 */

export interface AgentMessage {
  id: string;
  senderId: string;
  senderType: AgentType;
  recipientId: string;
  recipientType: AgentType;
  content: any;
  timestamp: number;
  type: MessageType;
  status: MessageStatus;
  metadata?: Record<string, any>;
}

export enum MessageType {
  TRANSCRIPT_ANALYSIS = "transcript_analysis",
  TRIAL_MATCH = "trial_match",
  PATIENT_CONSENT = "patient_consent",
  PATIENT_QUESTION = "patient_question",
  DOCTOR_RESPONSE = "doctor_response",
  SYSTEM_NOTIFICATION = "system_notification",
}

export enum MessageStatus {
  PENDING = "pending",
  DELIVERED = "delivered",
  READ = "read",
  PROCESSED = "processed",
  FAILED = "failed",
}

/**
 * Domain-specific types for MediBuddy agent system
 */

export interface TranscriptAnalysisMessage {
  consultationId: Id<"consultations">;
  transcription: string;
  structuredData?: {
    conditions: Array<{ name: string; severity: string }>;
    medications: string[];
    allergies: string[];
    symptoms?: string[];
    labResults?: Record<string, any>;
    comorbidities?: string[];
    vitals?: Record<string, any>;
  };
  analysis?: {
    summary: string;
    followUpRecommendations?: string[];
    riskFactors?: string[];
  };
}

export interface TrialMatchMessage {
  consultationId: Id<"consultations">;
  patientId: Id<"users">;
  trialId: Id<"clinicalTrials">;
  matchId: Id<"trialMatches">;
  relevanceScore: number;
  matchReasons: string[];
  doctorNotes?: string;
}

export interface PatientConsentMessage {
  matchId: Id<"trialMatches">;
  consentStatus: "approved" | "declined" | "pending" | "enrolled";
  patientResponse?: string;
}

export interface PatientQuestionMessage {
  matchId: Id<"trialMatches">;
  question: string;
  requiredByDate?: number; // timestamp
}

export interface DoctorResponseMessage {
  matchId: Id<"trialMatches">;
  responseToQuestionId: string; // ID of the question message
  response: string;
  additionalResources?: string[];
}

export interface SystemNotificationMessage {
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}

/**
 * Helper function to create a new agent message
 */
export function createAgentMessage(
  senderId: string,
  senderType: AgentType,
  recipientId: string,
  recipientType: AgentType,
  content: any,
  type: MessageType,
  metadata?: Record<string, any>
): AgentMessage {
  return {
    id: generateId(),
    senderId,
    senderType,
    recipientId,
    recipientType,
    content,
    timestamp: Date.now(),
    type,
    status: MessageStatus.PENDING,
    metadata,
  };
}

/**
 * Helper function to generate a unique ID
 */
function generateId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}
