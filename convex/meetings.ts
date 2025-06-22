import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new meeting
export const createMeeting = mutation({
  args: {
    doctorId: v.id("users"),
    patientId: v.id("users"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    scheduledDate: v.number(),
    duration: v.optional(v.number()),
    type: v.optional(
      v.union(
        v.literal("consultation"),
        v.literal("follow-up"),
        v.literal("check-up"),
        v.literal("emergency"),
        v.literal("other")
      )
    ),
    notes: v.optional(v.string()),
    location: v.optional(v.string()),
    meetingLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const meetingId = await ctx.db.insert("meetings", {
      doctorId: args.doctorId,
      patientId: args.patientId,
      title: args.title || "Medical Appointment",
      description: args.description,
      scheduledDate: args.scheduledDate,
      duration: args.duration || 30, // Default 30 minutes
      status: "scheduled",
      type: args.type || "consultation",
      notes: args.notes,
      location: args.location || "virtual",
      meetingLink: args.meetingLink,
      createdAt: now,
    });

    return await ctx.db.get(meetingId);
  },
});

// Get a meeting by ID
export const getMeetingById = query({
  args: {
    id: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get meetings for a doctor
export const getMeetingsForDoctor = query({
  args: {
    doctorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("meetings")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .order("desc")
      .collect();
  },
});

// Get meetings for a patient
export const getMeetingsForPatient = query({
  args: {
    patientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("meetings")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});

// Get upcoming meetings for a doctor
export const getUpcomingMeetingsForDoctor = query({
  args: {
    doctorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db
      .query("meetings")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .filter((q) =>
        q.and(
          q.gte(q.field("scheduledDate"), now),
          q.eq(q.field("status"), "scheduled")
        )
      )
      .order("asc")
      .collect();
  },
});

// Get upcoming meetings for a patient
export const getUpcomingMeetingsForPatient = query({
  args: {
    patientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db
      .query("meetings")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .filter((q) =>
        q.and(
          q.gte(q.field("scheduledDate"), now),
          q.eq(q.field("status"), "scheduled")
        )
      )
      .order("asc")
      .collect();
  },
});

// Update meeting status
export const updateMeetingStatus = mutation({
  args: {
    meetingId: v.id("meetings"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no-show")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.meetingId, {
      status: args.status,
      notes: args.notes,
      updatedAt: now,
    });

    return await ctx.db.get(args.meetingId);
  },
});

// Delete a meeting
export const deleteMeeting = mutation({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.meetingId);
    return { success: true };
  },
});
