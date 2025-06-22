import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getUserByToken = query({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Check if we've already stored this identity before
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (user !== null) {
      return user;
    }

    return null;
  },
});

export const getById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const createOrUpdateUser = mutation({
  args: {
    role: v.optional(v.union(v.literal("doctor"), v.literal("patient"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (existingUser) {
      // Update if needed
      if (
        existingUser.name !== identity.name ||
        existingUser.email !== identity.email
      ) {
        await ctx.db.patch(existingUser._id, {
          name: identity.name,
          email: identity.email,
        });
      }
      return existingUser;
    }

    // Create new user with role (default to patient if not specified)
    const userId = await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      tokenIdentifier: identity.subject,
      role: args.role || "patient",
    });

    return await ctx.db.get(userId);
  },
});

export const updateUserRole = mutation({
  args: {
    role: v.union(v.literal("doctor"), v.literal("patient")),
    specialization: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    gender: v.optional(v.string()),
    age: v.optional(v.number()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const updateData: any = { role: args.role };

    if (args.role === "doctor") {
      if (args.specialization) updateData.specialization = args.specialization;
      if (args.licenseNumber) updateData.licenseNumber = args.licenseNumber;
    } else if (args.role === "patient") {
      if (args.dateOfBirth) updateData.dateOfBirth = args.dateOfBirth;
      if (args.gender) updateData.gender = args.gender;
      if (args.age) updateData.age = args.age;
      if (args.location) updateData.location = args.location;
    }

    await ctx.db.patch(user._id, updateData);
    return await ctx.db.get(user._id);
  },
});

// Get all patients for doctor scheduling
export const getAllPatients = query({
  args: {},
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "patient"))
      .collect();
  },
});

// Get multiple users by their IDs
export const getUsersByIds = query({
  args: { ids: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const users = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    return users.filter(Boolean); // Remove any null results
  },
});

// Update basic medical information
export const updateBasicMedicalInfo = mutation({
  args: {
    patientId: v.id("users"),
    conditions: v.optional(
      v.array(
        v.object({
          name: v.string(),
          severity: v.union(
            v.literal("mild"),
            v.literal("moderate"),
            v.literal("severe")
          ),
        })
      )
    ),
    medications: v.optional(v.array(v.string())),
    allergies: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.patientId);
    if (!user || user.role !== "patient") {
      throw new Error("Patient not found");
    }

    const updateData: any = {};
    if (args.conditions !== undefined) updateData.conditions = args.conditions;
    if (args.medications !== undefined)
      updateData.medications = args.medications;
    if (args.allergies !== undefined) updateData.allergies = args.allergies;

    await ctx.db.patch(args.patientId, updateData);
    return await ctx.db.get(args.patientId);
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    return user;
  },
});
