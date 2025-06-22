import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get a consultation by ID
export const get = query({
  args: {
    id: v.id("consultations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new consultation
export const create = mutation({
  args: {
    doctorId: v.id("users"),
    patientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const consultationId = await ctx.db.insert("consultations", {
      doctorId: args.doctorId,
      patientId: args.patientId,
      status: "active",
      startTime: Date.now(),
      createdAt: Date.now(),
    });
    return consultationId;
  },
});

// Update consultation transcription directly
export const updateTranscription = mutation({
  args: {
    id: v.id("consultations"),
    transcription: v.string(),
  },
  handler: async (ctx, args) => {
    const consultation = await ctx.db.get(args.id);
    if (!consultation) {
      throw new Error("Consultation not found");
    }

    await ctx.db.patch(args.id, {
      transcription: args.transcription,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// Complete a consultation
export const complete = mutation({
  args: {
    id: v.id("consultations"),
  },
  handler: async (ctx, args) => {
    const consultation = await ctx.db.get(args.id);
    if (!consultation) {
      throw new Error("Consultation not found");
    }

    await ctx.db.patch(args.id, {
      status: "completed",
      endTime: Date.now(),
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// Update structured data for a consultation
export const updateStructuredData = mutation({
  args: {
    id: v.id("consultations"),
    structuredData: v.object({
      conditions: v.array(
        v.object({
          name: v.string(),
          severity: v.union(
            v.literal("mild"),
            v.literal("moderate"),
            v.literal("severe")
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
    const consultation = await ctx.db.get(args.id);
    if (!consultation) {
      throw new Error("Consultation not found");
    }

    await ctx.db.patch(args.id, {
      structuredData: args.structuredData,
      // Also update the legacy medicalEntities field for backward compatibility
      medicalEntities: {
        conditions: args.structuredData.conditions.map((c) => c.name),
        medications: args.structuredData.medications,
        allergies: args.structuredData.allergies,
      },
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// List consultations for a doctor
export const listForDoctor = query({
  args: {
    doctorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("consultations")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .collect();
  },
});

// List consultations for a patient
export const listConsultationsForPatient = query({
  args: {
    patientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("consultations")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});

// Share consultation report with patient
export const shareWithPatient = mutation({
  args: {
    id: v.id("consultations"),
    doctorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const consultation = await ctx.db.get(args.id);
    if (!consultation) {
      throw new Error("Consultation not found");
    }

    // Verify the doctor owns this consultation
    if (consultation.doctorId !== args.doctorId) {
      throw new Error(
        "Unauthorized: You can only share your own consultations"
      );
    }

    // Check if medical report exists
    if (!consultation.medicalReport) {
      throw new Error("Medical report must be generated before sharing");
    }

    await ctx.db.patch(args.id, {
      sharedWithPatient: true,
      sharedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// List shared consultations for a patient
export const listSharedConsultationsForPatient = query({
  args: {
    patientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("consultations")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .filter((q) => q.eq(q.field("sharedWithPatient"), true))
      .collect();
  },
});

// Find existing consultation for a specific doctor-patient pair
export const findExistingConsultation = query({
  args: {
    doctorId: v.id("users"),
    patientId: v.id("users"),
    startTimeAfter: v.optional(v.number()), // Optional: find consultations after a specific time
  },
  handler: async (ctx, args) => {
    // Get all consultations for this doctor-patient pair
    let consultationsQuery = ctx.db
      .query("consultations")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .filter((q) => q.eq(q.field("patientId"), args.patientId));

    // If we have a start time, only look for consultations after that time
    if (args.startTimeAfter) {
      consultationsQuery = consultationsQuery.filter((q) =>
        q.gte(q.field("startTime"), args.startTimeAfter!)
      );
    }

    const consultations = await consultationsQuery.collect();

    // Return the most recent consultation that's still active
    const activeConsultation = consultations
      .filter((c) => c.status === "active")
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))[0];

    return activeConsultation || null;
  },
});

// Find consultation by meeting ID
export const getConsultationByMeeting = query({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const consultation = await ctx.db
      .query("consultations")
      .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
      .first();

    return consultation;
  },
});

// Create or get existing consultation for a doctor-patient pair
export const createOrGetConsultation = mutation({
  args: {
    doctorId: v.id("users"),
    patientId: v.id("users"),
    meetingId: v.optional(v.id("meetings")),
  },
  handler: async (ctx, args) => {
    // First, if we have a meetingId, check if there's already a consultation for this meeting
    if (args.meetingId) {
      const existingByMeeting = await ctx.db
        .query("consultations")
        .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
        .first();

      if (existingByMeeting) {
        return existingByMeeting._id;
      }
    }

    // Second, check if there's an existing active consultation for this doctor-patient pair
    const existingConsultations = await ctx.db
      .query("consultations")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .filter((q) =>
        q.and(
          q.eq(q.field("patientId"), args.patientId),
          q.eq(q.field("status"), "active")
        )
      )
      .collect();

    // If we find an active consultation, return it
    if (existingConsultations.length > 0) {
      // Return the most recent active consultation
      const mostRecent = existingConsultations.sort(
        (a, b) => (b.startTime || 0) - (a.startTime || 0)
      )[0];
      return mostRecent._id;
    }

    // If no active consultation exists, create a new one
    const consultationId = await ctx.db.insert("consultations", {
      doctorId: args.doctorId,
      patientId: args.patientId,
      meetingId: args.meetingId,
      status: "active",
      startTime: Date.now(),
      createdAt: Date.now(),
    });

    return consultationId;
  },
});

// Utility function to clean up duplicate active consultations for the same doctor-patient pair
export const cleanupDuplicateConsultations = mutation({
  args: {
    doctorId: v.id("users"),
    patientId: v.id("users"),
    keepConsultationId: v.id("consultations"), // The consultation to keep
  },
  handler: async (ctx, args) => {
    // Find all active consultations for this doctor-patient pair
    const duplicateConsultations = await ctx.db
      .query("consultations")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .filter((q) =>
        q.and(
          q.eq(q.field("patientId"), args.patientId),
          q.eq(q.field("status"), "active"),
          q.neq(q.field("_id"), args.keepConsultationId)
        )
      )
      .collect();

    // Mark duplicates as cancelled
    const cancelledIds = [];
    for (const consultation of duplicateConsultations) {
      await ctx.db.patch(consultation._id, {
        status: "cancelled",
        endTime: Date.now(),
        updatedAt: Date.now(),
      });
      cancelledIds.push(consultation._id);
    }

    return {
      cancelledCount: cancelledIds.length,
      cancelledIds,
    };
  },
});

// Admin function to find duplicate active consultations
export const findDuplicateConsultations = query({
  args: {},
  handler: async (ctx, args) => {
    // Get all active consultations
    const activeConsultations = await ctx.db
      .query("consultations")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Group by doctor-patient pair
    const groupedConsultations = new Map();

    for (const consultation of activeConsultations) {
      const key = `${consultation.doctorId}-${consultation.patientId}`;
      if (!groupedConsultations.has(key)) {
        groupedConsultations.set(key, []);
      }
      groupedConsultations.get(key).push(consultation);
    }

    // Find groups with more than one consultation (duplicates)
    const duplicates = [];
    for (const [key, consultations] of groupedConsultations.entries()) {
      if (consultations.length > 1) {
        // Sort by startTime, newest first
        consultations.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));

        duplicates.push({
          doctorPatientKey: key,
          doctorId: consultations[0].doctorId,
          patientId: consultations[0].patientId,
          totalCount: consultations.length,
          keepConsultation: consultations[0], // Keep the newest one
          duplicateConsultations: consultations.slice(1), // Mark others as duplicates
        });
      }
    }

    return duplicates;
  },
});
