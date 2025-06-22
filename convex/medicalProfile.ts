import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get medical profile for a patient
export const getMedicalProfile = query({
  args: { patientId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.patientId);
    if (!user || user.role !== "patient") {
      throw new Error("Patient not found");
    }
    return user.medicalProfile || null;
  },
});

// Update medical profile
export const updateMedicalProfile = mutation({
  args: {
    patientId: v.id("users"),
    medicalProfile: v.object({
      // Demographics
      ethnicity: v.optional(v.string()),
      race: v.optional(v.string()),

      // Physical characteristics
      height: v.optional(v.number()), // in cm
      weight: v.optional(v.number()), // in kg
      bmi: v.optional(v.number()),
      bloodType: v.optional(v.string()),

      // Lifestyle factors
      smokingStatus: v.optional(v.string()),
      alcoholConsumption: v.optional(v.string()),
      exerciseFrequency: v.optional(v.string()),

      // Medical history
      familyHistory: v.optional(v.array(v.string())),
      surgicalHistory: v.optional(v.array(v.string())),
      previousTreatments: v.optional(v.array(v.string())),

      // Current health status
      currentSymptoms: v.optional(v.array(v.string())),
      functionalStatus: v.optional(v.string()),
      painLevel: v.optional(v.number()), // 0-10 scale

      // Insurance and contact
      insuranceProvider: v.optional(v.string()),
      emergencyContact: v.optional(
        v.object({
          name: v.string(),
          relationship: v.string(),
          phone: v.string(),
        })
      ),

      // Trial preferences
      willingToTravel: v.optional(v.boolean()),
      maxTravelDistance: v.optional(v.number()), // in miles
      availableTimeSlots: v.optional(v.array(v.string())),

      // Profile completion status
      profileCompleted: v.optional(v.boolean()),
      lastProfileUpdate: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.patientId);
    if (!user || user.role !== "patient") {
      throw new Error("Patient not found");
    }

    // Calculate BMI if height and weight are provided
    let updatedProfile = { ...args.medicalProfile };
    if (updatedProfile.height && updatedProfile.weight) {
      const heightInMeters = updatedProfile.height / 100;
      updatedProfile.bmi =
        Math.round(
          (updatedProfile.weight / (heightInMeters * heightInMeters)) * 10
        ) / 10;
    }

    // Set completion status and update timestamp
    updatedProfile.profileCompleted = true;
    updatedProfile.lastProfileUpdate = Date.now();

    await ctx.db.patch(args.patientId, {
      medicalProfile: updatedProfile,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Check if medical profile is complete
export const isProfileComplete = query({
  args: { patientId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.patientId);
    if (!user || user.role !== "patient") {
      return false;
    }

    const profile = user.medicalProfile;
    if (!profile) return false;

    // Check required fields for clinical trial matching
    const requiredFields = [
      "ethnicity",
      "height",
      "weight",
      "smokingStatus",
      "alcoholConsumption",
      "functionalStatus",
    ];

    return requiredFields.every(
      (field) =>
        profile[field] !== undefined &&
        profile[field] !== null &&
        profile[field] !== ""
    );
  },
});

// Get profile completion percentage
export const getProfileCompletionPercentage = query({
  args: { patientId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.patientId);
    if (!user || user.role !== "patient") {
      return 0;
    }

    const profile = user.medicalProfile;
    if (!profile) return 0;

    const allFields = [
      "ethnicity",
      "race",
      "height",
      "weight",
      "bloodType",
      "smokingStatus",
      "alcoholConsumption",
      "exerciseFrequency",
      "familyHistory",
      "currentSymptoms",
      "functionalStatus",
      "painLevel",
      "insuranceProvider",
      "emergencyContact",
      "willingToTravel",
      "maxTravelDistance",
      "availableTimeSlots",
    ];

    const completedFields = allFields.filter((field) => {
      const value = profile[field];
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== undefined && value !== null && value !== "";
    });

    return Math.round((completedFields.length / allFields.length) * 100);
  },
});
