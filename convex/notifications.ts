import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

/**
 * Query to get all notifications for a patient
 */
export const getPatientNotifications = query({
  args: {
    patientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all trial matches for the patient
    const trialMatches = await ctx.db
      .query("trialMatches")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();

    // For each match, get the trial details
    const notifications = await Promise.all(
      trialMatches.map(async (match) => {
        const trial = await ctx.db.get(match.trialId);

        if (!trial) {
          return null;
        }

        // Build notification object
        return {
          id: match._id,
          trialId: trial._id,
          trialTitle: trial.title,
          trialDescription: trial.description,
          trialPhase: trial.phase,
          trialSponsor: trial.sponsor,
          trialStatus: trial.status,
          nctId: trial.nctId,
          matchDate: match.matchDate,
          relevanceScore: match.relevanceScore,
          notificationStatus: match.notificationStatus || "pending",
          consentStatus: match.consentStatus || "pending",
          matchReason: match.matchReason,
          doctorNotes: match.doctorNotes,
          responseDate: match.responseDate,
          eligibilityCriteria: trial.eligibilityCriteria,
          inclusionCriteria: trial.inclusionCriteria,
          ageRange: trial.ageRange,
          location: trial.location,
          locations: trial.locations,
          contactInfo: trial.contactInfo,
          enhancedContactInfo: trial.enhancedContactInfo,
        };
      })
    );

    // Filter out null values and sort by date (newest first)
    return notifications
      .filter(Boolean)
      .sort((a, b) => (b?.matchDate || 0) - (a?.matchDate || 0));
  },
});

/**
 * Query to get unread notification count for a patient
 */
export const getUnreadNotificationCount = query({
  args: {
    patientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const unreadNotifications = await ctx.db
      .query("trialMatches")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .filter((q) => q.eq(q.field("notificationStatus"), "sent"))
      .collect();

    return unreadNotifications.length;
  },
});

/**
 * Query to get notification count requiring action for a patient
 */
export const getActionRequiredNotificationCount = query({
  args: {
    patientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const actionRequiredNotifications = await ctx.db
      .query("trialMatches")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .filter((q) => q.eq(q.field("consentStatus"), "pending"))
      .collect();

    return actionRequiredNotifications.length;
  },
});

/**
 * Mutation for doctors to send trial notifications to patients
 */
export const sendTrialNotifications = mutation({
  args: {
    matchIds: v.array(v.id("trialMatches")),
    doctorNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const results = await Promise.all(
      args.matchIds.map(async (matchId) => {
        const match = await ctx.db.get(matchId);

        if (!match) {
          return { id: matchId, success: false, error: "Match not found" };
        }

        // Update the match notification status to sent
        await ctx.db.patch(matchId, {
          notificationStatus: "sent",
          doctorNotes: args.doctorNotes,
          updatedAt: Date.now(),
        });

        return { id: matchId, success: true };
      })
    );

    // Count successful and failed operations
    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.length - successCount;

    return {
      success: failedCount === 0,
      successCount,
      failedCount,
      results,
    };
  },
});

/**
 * Mutation for patients to mark a notification as viewed
 */
export const markNotificationViewed = mutation({
  args: {
    notificationId: v.id("trialMatches"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      throw new ConvexError("Notification not found");
    }

    // Only update if the notification status is "sent"
    if (notification.notificationStatus === "sent") {
      await ctx.db.patch(args.notificationId, {
        notificationStatus: "viewed",
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Mutation for patients to update their consent status for a trial
 */
export const updatePatientConsent = mutation({
  args: {
    matchId: v.id("trialMatches"),
    consentStatus: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("enrolled")
    ),
    patientResponse: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);

    if (!match) {
      throw new ConvexError("Trial match not found");
    }

    // Get the patient ID from the match
    const patientId = match.patientId;

    // Update the match with new consent status
    await ctx.db.patch(args.matchId, {
      consentStatus: args.consentStatus,
      status: args.consentStatus, // Keeping in sync for backward compatibility
      patientResponse: args.patientResponse,
      responseDate: Date.now(),
      updatedAt: Date.now(),
      // Add status history
      consentStatusHistory: [
        ...(match.consentStatusHistory || []),
        {
          status: args.consentStatus,
          timestamp: Date.now(),
          changedBy: "patient",
          userId: patientId,
          note: args.patientResponse,
        },
      ],
    });

    return { success: true };
  },
});

/**
 * Query to get trials by patient consent status for doctors
 */
export const getTrialsByConsentStatus = query({
  args: {
    consentStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("declined"),
        v.literal("enrolled")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Query trials with the specified consent status
    let matchesQuery = ctx.db.query("trialMatches");

    if (args.consentStatus) {
      matchesQuery = matchesQuery.withIndex("by_consent_status", (q) =>
        q.eq("consentStatus", args.consentStatus)
      );
    }

    const matches = await matchesQuery.collect();

    // For each match, get the trial and patient details
    const enrichedMatches = await Promise.all(
      matches.map(async (match) => {
        const [trial, patient] = await Promise.all([
          ctx.db.get(match.trialId),
          ctx.db.get(match.patientId),
        ]);

        if (!trial || !patient) {
          return null;
        }

        return {
          match,
          trial,
          patient: {
            id: patient._id,
            name: patient.name,
            age: patient.age,
            gender: patient.gender,
            conditions: patient.conditions || [],
          },
        };
      })
    );

    // Filter out null values and sort by date
    return enrichedMatches
      .filter(Boolean)
      .sort((a, b) => (b?.match.updatedAt || 0) - (a?.match.updatedAt || 0));
  },
});

/**
 * Query to get consent history for a specific trial match
 */
export const getConsentHistory = query({
  args: {
    matchId: v.id("trialMatches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);

    if (!match) {
      throw new ConvexError("Trial match not found");
    }

    // Get the consent history with user details
    const history = match.consentStatusHistory || [];

    // Enrich history with user details
    const enrichedHistory = await Promise.all(
      history.map(async (entry) => {
        if (entry.userId) {
          const user = await ctx.db.get(entry.userId);
          return {
            ...entry,
            userName: user?.name || "Unknown",
            userRole: user?.role || "unknown",
          };
        }
        return entry;
      })
    );

    return enrichedHistory;
  },
});
