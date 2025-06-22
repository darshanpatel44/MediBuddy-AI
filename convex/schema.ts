import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  audioRecordings: defineTable({
    // Relationship fields
    consultationId: v.id("consultations"),

    // File metadata
    fileId: v.string(), // ID from Convex Storage
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    duration: v.optional(v.number()), // in seconds

    // Processing status
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),

    // Processing details
    uploadTime: v.number(), // Unix timestamp
    transcriptionTime: v.optional(v.number()), // Unix timestamp
    errorDetails: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(), // Unix timestamp
    updatedAt: v.optional(v.number()), // Unix timestamp
  })
    .index("by_consultation", ["consultationId"])
    .index("by_status", ["status"]),

  users: defineTable({
    // Basic user information
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    tokenIdentifier: v.string(),
    role: v.union(v.literal("doctor"), v.literal("patient")),

    // Doctor-specific fields
    specialization: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),

    // Patient-specific fields
    dateOfBirth: v.optional(v.string()),
    age: v.optional(v.number()),
    gender: v.optional(v.string()),
    location: v.optional(v.string()),

    // Enhanced patient medical information
    // Previous field for backward compatibility
    medicalHistory: v.optional(v.array(v.string())),

    // New fields with enhanced structure
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
    comorbidities: v.optional(v.array(v.string())),
    labResults: v.optional(v.record(v.string(), v.string())),

    // Comprehensive Medical Profile for Clinical Trial Matching
    medicalProfile: v.optional(
      v.object({
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
      })
    ),

    // Timestamps
    createdAt: v.optional(v.number()), // Unix timestamp
    updatedAt: v.optional(v.number()), // Unix timestamp
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_role", ["role"]),

  consultations: defineTable({
    // Relationship fields
    doctorId: v.id("users"),
    patientId: v.id("users"),
    meetingId: v.optional(v.id("meetings")), // Link to the appointment/meeting

    // Consultation data
    transcription: v.optional(v.string()),
    audioRecordingId: v.optional(v.id("audioRecordings")),

    // Previous field for backward compatibility
    medicalEntities: v.optional(
      v.object({
        conditions: v.array(v.string()),
        medications: v.array(v.string()),
        allergies: v.array(v.string()),
      })
    ),

    // Enhanced structured medical data
    structuredData: v.optional(
      v.object({
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
        labResults: v.optional(v.record(v.string(), v.string())),
        comorbidities: v.optional(v.array(v.string())),
        vitals: v.optional(v.record(v.string(), v.string())),
        symptoms: v.optional(v.array(v.string())),
      })
    ),

    // Gemini extracted medical data with enhanced structure
    geminiExtractedData: v.optional(
      v.object({
        conditions: v.array(
          v.object({
            name: v.string(),
            severity: v.optional(
              v.union(
                v.literal("mild"),
                v.literal("moderate"),
                v.literal("severe")
              )
            ),
            status: v.optional(
              v.union(
                v.literal("active"),
                v.literal("resolved"),
                v.literal("chronic")
              )
            ),
          })
        ),
        medications: v.array(
          v.object({
            name: v.string(),
            dosage: v.optional(v.string()),
            frequency: v.optional(v.string()),
            route: v.optional(v.string()),
          })
        ),
        allergies: v.array(
          v.object({
            allergen: v.string(),
            reaction: v.optional(v.string()),
            severity: v.optional(
              v.union(
                v.literal("mild"),
                v.literal("moderate"),
                v.literal("severe")
              )
            ),
          })
        ),
        symptoms: v.array(
          v.object({
            name: v.string(),
            severity: v.optional(
              v.union(
                v.literal("mild"),
                v.literal("moderate"),
                v.literal("severe")
              )
            ),
            duration: v.optional(v.string()),
            onset: v.optional(v.string()),
          })
        ),
        comorbidities: v.array(
          v.object({
            name: v.string(),
            status: v.optional(
              v.union(
                v.literal("active"),
                v.literal("resolved"),
                v.literal("chronic")
              )
            ),
          })
        ),
        vitals: v.optional(v.record(v.string(), v.any())),
        labResults: v.optional(v.record(v.string(), v.any())),
      })
    ),

    // Track matched trials from this consultation
    matchedTrialIds: v.optional(v.array(v.id("clinicalTrials"))),

    // Medical report fields
    medicalReport: v.optional(v.string()),
    reportGeneratedAt: v.optional(v.number()),

    // Report sharing fields
    sharedWithPatient: v.optional(v.boolean()),
    sharedAt: v.optional(v.number()),

    // Consultation status and timing
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    startTime: v.number(),
    endTime: v.optional(v.number()),

    // Timestamps
    createdAt: v.optional(v.number()), // Unix timestamp
    updatedAt: v.optional(v.number()), // Unix timestamp
  })
    .index("by_doctor", ["doctorId"])
    .index("by_patient", ["patientId"])
    .index("by_meeting", ["meetingId"]),

  clinicalTrials: defineTable({
    // Basic trial information
    title: v.string(),
    description: v.string(),
    sponsor: v.string(),
    phase: v.string(),
    status: v.union(
      v.literal("recruiting"),
      v.literal("active"),
      v.literal("completed")
    ),
    nctId: v.optional(v.string()), // NCT identifier for ClinicalTrials.gov

    // Previous fields for backward compatibility
    eligibilityCriteria: v.array(v.string()),
    exclusionCriteria: v.array(v.string()),
    location: v.string(),
    contactInfo: v.string(),

    // Enhanced eligibility criteria fields
    targetConditions: v.array(v.string()),
    inclusionCriteria: v.optional(v.array(v.string())),
    ageRange: v.optional(
      v.object({
        min: v.number(),
        max: v.number(),
      })
    ),
    genderRestriction: v.optional(v.string()),

    // Enhanced location and contact information
    locations: v.optional(v.array(v.string())),
    enhancedContactInfo: v.optional(v.record(v.string(), v.string())),

    // Trial dates
    startDate: v.optional(v.number()), // Unix timestamp
    endDate: v.optional(v.number()), // Unix timestamp

    // Timestamps
    createdAt: v.optional(v.number()), // Unix timestamp
    updatedAt: v.optional(v.number()), // Unix timestamp
  })
    .index("by_status", ["status"])
    .index("by_condition", ["targetConditions"]),

  trialMatches: defineTable({
    // Relationship fields
    patientId: v.id("users"),
    trialId: v.id("clinicalTrials"),
    consultationId: v.id("consultations"),

    // Match details
    relevanceScore: v.number(), // Renamed from matchScore for backward compatibility
    matchReason: v.optional(v.string()),

    // Existing field for backward compatibility
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("enrolled")
    ),

    // New notification status tracking
    notificationStatus: v.optional(
      v.union(v.literal("pending"), v.literal("sent"), v.literal("viewed"))
    ),

    // New consent status tracking (separate from old status field)
    consentStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("declined"),
        v.literal("enrolled")
      )
    ),

    // Detailed consent status history tracking
    consentStatusHistory: v.optional(
      v.array(
        v.object({
          status: v.union(
            v.literal("pending"),
            v.literal("approved"),
            v.literal("declined"),
            v.literal("enrolled")
          ),
          timestamp: v.number(),
          changedBy: v.union(
            v.literal("doctor"),
            v.literal("patient"),
            v.literal("system")
          ),
          userId: v.optional(v.id("users")),
          note: v.optional(v.string()),
        })
      )
    ),

    // Additional information
    doctorNotes: v.optional(v.string()),
    patientResponse: v.optional(v.string()),
    matchDate: v.optional(v.number()),
    responseDate: v.optional(v.number()),

    // Timestamps
    createdAt: v.optional(v.number()), // Unix timestamp
    updatedAt: v.optional(v.number()), // Unix timestamp
  })
    .index("by_patient", ["patientId"])
    .index("by_trial", ["trialId"])
    .index("by_consultation", ["consultationId"])
    .index("by_notification_status", ["notificationStatus"])
    .index("by_consent_status", ["consentStatus"]),

  meetings: defineTable({
    // Relationship fields
    doctorId: v.id("users"),
    patientId: v.id("users"),

    // Meeting details
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    scheduledDate: v.number(), // Unix timestamp for the scheduled date/time
    duration: v.optional(v.number()), // Duration in minutes

    // Meeting status
    status: v.union(
      v.literal("scheduled"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no-show")
    ),

    // Meeting type
    type: v.optional(
      v.union(
        v.literal("consultation"),
        v.literal("follow-up"),
        v.literal("check-up"),
        v.literal("other")
      )
    ),

    // Additional information
    notes: v.optional(v.string()),
    location: v.optional(v.string()), // Physical location or "virtual"
    meetingLink: v.optional(v.string()), // For virtual meetings

    // Timestamps
    createdAt: v.number(), // Unix timestamp
    updatedAt: v.optional(v.number()), // Unix timestamp
  })
    .index("by_doctor", ["doctorId"])
    .index("by_patient", ["patientId"])
    .index("by_status", ["status"])
    .index("by_scheduled_date", ["scheduledDate"]),

  asi1Interactions: defineTable({
    // Relationship fields
    consultationId: v.id("consultations"),
    patientId: v.id("users"),

    // ASI1 request and response data
    request: v.any(), // ASI1Request object
    response: v.any(), // ASI1Response object

    // Performance metrics
    processingTime: v.number(), // Processing time in milliseconds
    confidence: v.number(), // Confidence score from ASI1

    // Timestamps
    timestamp: v.number(), // Unix timestamp
  })
    .index("by_consultation", ["consultationId"])
    .index("by_patient", ["patientId"])
    .index("by_timestamp", ["timestamp"]),
});
