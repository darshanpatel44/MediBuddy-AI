import { nanoid } from "nanoid";
import { api } from "../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import {
  AgentMessage,
  MessageStatus,
  AgentType,
  createAgentMessage,
  MessageType,
} from "./types";

/**
 * Agent Communication System
 *
 * This module handles secure message passing between agents in the MediBuddy system.
 * It provides an abstraction over the underlying storage and delivery mechanisms.
 */

// In-memory message queue for development and testing
// In production, this would use a persistent storage solution
const messageQueue: AgentMessage[] = [];

// In-memory agent registry
// Maps agent IDs to their callback functions
const agentRegistry: Record<string, (message: AgentMessage) => Promise<void>> =
  {};

/**
 * Register an agent to receive messages
 *
 * @param agentId The unique ID of the agent
 * @param callback The function to call when a message is received
 */
export function registerAgent(
  agentId: string,
  callback: (message: AgentMessage) => Promise<void>
): void {
  agentRegistry[agentId] = callback;
  console.log(`Agent ${agentId} registered successfully`);
}

/**
 * Unregister an agent
 *
 * @param agentId The unique ID of the agent to unregister
 */
export function unregisterAgent(agentId: string): void {
  if (agentRegistry[agentId]) {
    delete agentRegistry[agentId];
    console.log(`Agent ${agentId} unregistered successfully`);
  }
}

/**
 * Send a message from one agent to another
 *
 * @param message The message to send
 * @returns Promise resolving to the sent message with updated status
 */
export async function sendMessage(
  message: AgentMessage
): Promise<AgentMessage> {
  // Clone the message to avoid reference issues
  const messageToSend = { ...message };

  // Ensure the message has an ID
  if (!messageToSend.id) {
    messageToSend.id = nanoid();
  }

  // Set the timestamp if not provided
  if (!messageToSend.timestamp) {
    messageToSend.timestamp = Date.now();
  }

  try {
    // Store the message in the queue
    messageQueue.push(messageToSend);

    // Update status to delivered
    messageToSend.status = MessageStatus.DELIVERED;

    // Attempt immediate delivery if the recipient is registered
    if (agentRegistry[messageToSend.recipientId]) {
      await agentRegistry[messageToSend.recipientId](messageToSend);
      messageToSend.status = MessageStatus.PROCESSED;
    }

    // In a real system, we would also persist the message to a database
    // await storeMessageInDatabase(messageToSend);

    console.log(
      `Message sent from ${messageToSend.senderId} to ${messageToSend.recipientId}`
    );
    return messageToSend;
  } catch (error) {
    console.error("Error sending message:", error);
    messageToSend.status = MessageStatus.FAILED;
    return messageToSend;
  }
}

/**
 * Get all messages for a specific agent
 *
 * @param agentId The ID of the agent to get messages for
 * @returns Array of messages
 */
export function getMessagesForAgent(agentId: string): AgentMessage[] {
  return messageQueue.filter(
    (message) =>
      message.recipientId === agentId &&
      message.status !== MessageStatus.PROCESSED
  );
}

/**
 * Process all pending messages for an agent
 *
 * @param agentId The ID of the agent to process messages for
 */
export async function processMessages(agentId: string): Promise<void> {
  const messages = getMessagesForAgent(agentId);

  if (messages.length === 0) {
    return;
  }

  if (!agentRegistry[agentId]) {
    console.warn(`Agent ${agentId} not registered, cannot process messages`);
    return;
  }

  for (const message of messages) {
    try {
      await agentRegistry[agentId](message);
      message.status = MessageStatus.PROCESSED;
    } catch (error) {
      console.error(
        `Error processing message ${message.id} for agent ${agentId}:`,
        error
      );
    }
  }
}

/**
 * Initialize the message delivery system
 * Sets up periodic checking for pending messages
 */
export function initializeMessageSystem(): () => void {
  const intervalId = setInterval(async () => {
    for (const agentId in agentRegistry) {
      await processMessages(agentId);
    }
  }, 5000); // Check every 5 seconds

  // Return a cleanup function
  return () => clearInterval(intervalId);
}

/**
 * Database Integration
 *
 * In a production system, these functions would interact with a persistent storage
 * solution. For now, they're mocked for development purposes.
 */

// Create a Convex client for storing messages
let convexClient: ConvexHttpClient | null = null;

export function initializeConvexClient(client: ConvexHttpClient): void {
  convexClient = client;
}

// Mock for storing a message in the database
async function storeMessageInDatabase(message: AgentMessage): Promise<void> {
  if (!convexClient) {
    console.warn(
      "Convex client not initialized, message not stored in database"
    );
    return;
  }

  try {
    // In a real implementation, this would store the message in the Convex database
    // await convexClient.mutation(api.agentMessages.create, { message });
    console.log("Message stored in database:", message.id);
  } catch (error) {
    console.error("Error storing message in database:", error);
  }
}

/**
 * Encryption utilities for secure agent communication
 *
 * In a production system, these would implement proper encryption.
 * For now, they're placeholder functions.
 */

export function encryptMessage(message: AgentMessage): string {
  // In a real system, this would encrypt the message
  return JSON.stringify(message);
}

export function decryptMessage(encryptedMessage: string): AgentMessage {
  // In a real system, this would decrypt the message
  return JSON.parse(encryptedMessage);
}

/**
 * Helper function to create and send a message in one step
 */
export async function createAndSendMessage(
  senderId: string,
  senderType: AgentType,
  recipientId: string,
  recipientType: AgentType,
  content: any,
  type: MessageType,
  metadata?: Record<string, any>
): Promise<AgentMessage> {
  const message = createAgentMessage(
    senderId,
    senderType,
    recipientId,
    recipientType,
    content,
    type,
    metadata
  );

  return sendMessage(message);
}
