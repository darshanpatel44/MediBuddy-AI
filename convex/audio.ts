import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

// Upload a URL for uploading audio
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Generate a URL for uploading
    return await ctx.storage.generateUploadUrl();
  },
});

// Store audio recording metadata
export const storeAudioRecording = mutation({
  args: {
    consultationId: v.id("consultations"),
    storageId: v.string(),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Ensure the consultation exists
    const consultation = await ctx.db.get(args.consultationId);
    if (!consultation) {
      throw new ConvexError("Consultation not found");
    }

    // Create the audio recording record
    const audioRecordingId = await ctx.db.insert("audioRecordings", {
      consultationId: args.consultationId,
      fileId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      duration: args.duration,
      status: "pending",
      uploadTime: Date.now(),
      createdAt: Date.now(),
    });

    // Update the consultation with the audio recording reference
    await ctx.db.patch(args.consultationId, {
      audioRecordingId,
      updatedAt: Date.now(),
    });

    // Trigger the transcription process
    await ctx.scheduler.runAfter(0, internal.audio.transcribeAudio, {
      audioRecordingId,
    });

    return audioRecordingId;
  },
});

// Get audio recording by ID
export const getAudioRecording = query({
  args: {
    audioRecordingId: v.id("audioRecordings"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.audioRecordingId);
  },
});

// Get audio recordings for a consultation
export const getAudioRecordingsForConsultation = query({
  args: {
    consultationId: v.id("consultations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("audioRecordings")
      .withIndex("by_consultation", (q) =>
        q.eq("consultationId", args.consultationId)
      )
      .collect();
  },
});

// Generate a URL for downloading audio
export const generateAudioUrl = query({
  args: {
    audioRecordingId: v.id("audioRecordings"),
  },
  handler: async (ctx, args) => {
    const audioRecording = await ctx.db.get(args.audioRecordingId);
    if (!audioRecording) {
      throw new ConvexError("Audio recording not found");
    }

    return await ctx.storage.getUrl(audioRecording.fileId);
  },
});

// Internal function to transcribe audio using OpenAI Whisper API
export const transcribeAudio = internalMutation({
  args: {
    audioRecordingId: v.id("audioRecordings"),
  },
  handler: async (ctx, args) => {
    // Get the audio recording
    const audioRecording = await ctx.db.get(args.audioRecordingId);
    if (!audioRecording) {
      throw new ConvexError("Audio recording not found");
    }

    // Update the status to processing
    await ctx.db.patch(args.audioRecordingId, {
      status: "processing",
      updatedAt: Date.now(),
    });

    // Schedule the action to perform the actual transcription
    // This is done in an action because it requires calling external APIs
    await ctx.scheduler.runAfter(0, api.audio.performTranscription, {
      audioRecordingId: args.audioRecordingId,
    });
  },
});

// Action to perform the actual transcription using Groq Whisper API
export const performTranscription = action({
  args: {
    audioRecordingId: v.id("audioRecordings"),
  },
  handler: async (ctx, args) => {
    // Get the audio recording
    const audioRecording = await ctx.runQuery(api.audio.getAudioRecording, {
      audioRecordingId: args.audioRecordingId,
    });

    if (!audioRecording) {
      throw new ConvexError("Audio recording not found");
    }

    try {
      // Get the audio URL
      const audioUrl = await ctx.runQuery(api.audio.generateAudioUrl, {
        audioRecordingId: args.audioRecordingId,
      });

      if (!audioUrl) {
        throw new Error("Failed to generate audio URL");
      }

      // Fetch the audio file
      const audioResponse = await fetch(audioUrl);
      const audioBlob = await audioResponse.blob();

      // Create form data for Groq API
      const formData = new FormData();
      formData.append("file", audioBlob, audioRecording.fileName);
      formData.append("model", "whisper-large-v3-turbo");
      formData.append("response_format", "verbose_json");

      // Get the Groq API key from environment variables
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        throw new Error("Groq API key not found");
      }

      // Call the Groq Whisper API
      const response = await fetch(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      const transcription = result.text;

      // Update the audio recording with the transcription
      await ctx.runMutation(internal.audio.updateTranscription, {
        audioRecordingId: args.audioRecordingId,
        transcription,
      });
    } catch (error) {
      // Handle errors
      await ctx.runMutation(internal.audio.markTranscriptionFailed, {
        audioRecordingId: args.audioRecordingId,
        errorDetails: error instanceof Error ? error.message : String(error),
      });
    }
  },
});

// Internal mutation to update the transcription
export const updateTranscription = internalMutation({
  args: {
    audioRecordingId: v.id("audioRecordings"),
    transcription: v.string(),
  },
  handler: async (ctx, args) => {
    const audioRecording = await ctx.db.get(args.audioRecordingId);
    if (!audioRecording) {
      throw new ConvexError("Audio recording not found");
    }

    // Update the audio recording status
    await ctx.db.patch(args.audioRecordingId, {
      status: "completed",
      transcriptionTime: Date.now(),
      updatedAt: Date.now(),
    });

    // Update the consultation with the transcription
    const consultation = await ctx.db.get(audioRecording.consultationId);
    if (consultation) {
      await ctx.db.patch(audioRecording.consultationId, {
        transcription: args.transcription,
        updatedAt: Date.now(),
      });

      // Trigger medical entity extraction
      await ctx.scheduler.runAfter(
        0,
        api.medicalEntityExtraction.extractMedicalEntities,
        {
          consultationId: audioRecording.consultationId,
        }
      );
    }
  },
});

// Internal mutation to mark transcription as failed
export const markTranscriptionFailed = internalMutation({
  args: {
    audioRecordingId: v.id("audioRecordings"),
    errorDetails: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.audioRecordingId, {
      status: "failed",
      errorDetails: args.errorDetails,
      updatedAt: Date.now(),
    });
  },
});
