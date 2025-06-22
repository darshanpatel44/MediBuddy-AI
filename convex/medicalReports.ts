import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

// Action to generate medical report using Google Gemini
export const generateMedicalReport = action({
  args: {
    consultationId: v.id("consultations"),
  },
  handler: async (ctx, args) => {
    // Get the consultation data
    const consultation = await ctx.runQuery(api.consultations.get, {
      id: args.consultationId,
    });

    if (!consultation) {
      throw new Error("Consultation not found");
    }

    if (!consultation.transcription) {
      throw new Error("No transcription available for this consultation");
    }

    try {
      // Get the Google Gemini API key from environment variables
      const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Google Gemini API key not found");
      }

      // Prepare the prompt for SOAP format medical report
      const prompt = `
You are a medical professional creating a SOAP format medical report. Based on the consultation transcription below, generate ONLY the following sections with actual medical content:

**REQUIRED FORMAT - RESPOND EXACTLY AS SHOWN:**

**S (Subjective):**
[Extract and summarize patient's reported symptoms, complaints, medical history, and concerns from the transcription. Include chief complaint, history of present illness, and relevant past medical history.]

**O (Objective):**
[Document observable findings, vital signs, physical examination results, and any diagnostic test results mentioned in the transcription. If specific vitals aren't mentioned, note "Vital signs: [as documented]" or similar.]

**A (Assessment):**
[Provide medical diagnosis, clinical impression, and differential diagnoses based on the subjective and objective findings. Include severity and clinical reasoning.]

**P (Plan):**
[Detail treatment plan including medications prescribed, procedures recommended, lifestyle modifications, follow-up appointments, and patient education provided.]

**ICD-10 Codes:**
[List relevant ICD-10 diagnostic codes with descriptions for the primary and secondary diagnoses identified]

**IMPORTANT INSTRUCTIONS:**
- Use ONLY the exact section headers shown above with ** formatting
- Each section MUST contain actual medical content based on the transcription
- Do NOT include any introductory text, explanations, or additional sections
- Keep content concise but medically comprehensive
- Use professional medical terminology
- If information is not available in transcription, note appropriately (e.g., "Not documented in this consultation")

**Consultation Transcription:**
${consultation.transcription}

**Structured Medical Data:**
${consultation.structuredData ? JSON.stringify(consultation.structuredData, null, 2) : "No additional structured data"}
`;

      // Call Google Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Google Gemini API error: ${response.status} ${errorText}`
        );
      }

      const result = await response.json();
      const generatedReport = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedReport) {
        throw new Error("No report generated from Gemini API");
      }

      // Store the medical report
      await ctx.runMutation(api.medicalReports.storeMedicalReport, {
        consultationId: args.consultationId,
        reportContent: generatedReport,
        generatedAt: Date.now(),
      });

      return generatedReport;
    } catch (error) {
      console.error("Error generating medical report:", error);
      throw new Error(
        `Failed to generate medical report: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

// Mutation to store the generated medical report
export const storeMedicalReport = mutation({
  args: {
    consultationId: v.id("consultations"),
    reportContent: v.string(),
    generatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Update the consultation with the medical report
    await ctx.db.patch(args.consultationId, {
      medicalReport: args.reportContent,
      reportGeneratedAt: args.generatedAt,
      updatedAt: Date.now(),
    });

    return args.consultationId;
  },
});

// Query to get medical report for a consultation
export const getMedicalReport = query({
  args: {
    consultationId: v.id("consultations"),
  },
  handler: async (ctx, args) => {
    const consultation = await ctx.db.get(args.consultationId);
    if (!consultation) {
      return null;
    }

    return {
      reportContent: consultation.medicalReport,
      generatedAt: consultation.reportGeneratedAt,
    };
  },
});
