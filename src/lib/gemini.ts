import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(
  import.meta.env.VITE_GOOGLE_GEMINI_API_KEY || ""
);

/**
 * Extract medical entities from transcription using Google Gemini
 * @param transcription - The medical transcription text
 * @returns Promise with extracted medical entities
 */
export async function extractMedicalEntitiesWithGemini(transcription: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are a medical entity extraction assistant specialized in clinical notes analysis. 
Extract comprehensive medical entities from the following doctor-patient transcription.

Please analyze the transcription and extract medical entities in the following JSON format:
{
  "conditions": [
    {
      "name": "condition name",
      "severity": "mild" | "moderate" | "severe",
      "status": "active" | "resolved" | "chronic"
    }
  ],
  "medications": [
    {
      "name": "medication name",
      "dosage": "dosage if mentioned",
      "frequency": "frequency if mentioned",
      "route": "route if mentioned"
    }
  ],
  "allergies": [
    {
      "allergen": "allergen name",
      "reaction": "reaction type if mentioned",
      "severity": "mild" | "moderate" | "severe"
    }
  ],
  "symptoms": [
    {
      "name": "symptom description",
      "severity": "mild" | "moderate" | "severe",
      "duration": "duration if mentioned",
      "onset": "onset if mentioned"
    }
  ],
  "comorbidities": [
    {
      "name": "comorbidity name",
      "status": "active" | "resolved" | "chronic"
    }
  ],
  "vitals": {
    "bloodPressure": "value if mentioned",
    "heartRate": "value if mentioned",
    "temperature": "value if mentioned",
    "respiratoryRate": "value if mentioned",
    "oxygenSaturation": "value if mentioned",
    "weight": "value if mentioned",
    "height": "value if mentioned"
  },
  "labResults": {
    "testName": "result value"
  }
}

Only extract information that is explicitly mentioned in the transcription. If a category has no relevant information, return an empty array or object.

Transcription:
${transcription}

Please respond with only the JSON object, no additional text.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    try {
      const entities = JSON.parse(text);
      return normalizeGeminiEntities(entities);
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      // Try to extract JSON from the response if it's wrapped in markdown
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const entities = JSON.parse(jsonMatch[1]);
        return normalizeGeminiEntities(entities);
      }
      throw new Error("Failed to parse Gemini response as JSON");
    }
  } catch (error) {
    console.error("Error extracting medical entities with Gemini:", error);
    throw new Error(
      `Gemini extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Normalize Gemini entities to match our expected format
 */
function normalizeGeminiEntities(entities: any) {
  return {
    conditions: Array.isArray(entities.conditions)
      ? entities.conditions.map((condition: any) => ({
          name: condition.name || condition,
          severity: condition.severity || "moderate",
          status: condition.status || "active",
        }))
      : [],
    medications: Array.isArray(entities.medications)
      ? entities.medications.map((med: any) => ({
          name: med.name || med,
          dosage: med.dosage || "",
          frequency: med.frequency || "",
          route: med.route || "",
        }))
      : [],
    allergies: Array.isArray(entities.allergies)
      ? entities.allergies.map((allergy: any) => ({
          allergen: allergy.allergen || allergy.name || allergy,
          reaction: allergy.reaction || "",
          severity: allergy.severity || "moderate",
        }))
      : [],
    symptoms: Array.isArray(entities.symptoms)
      ? entities.symptoms.map((symptom: any) => ({
          name: symptom.name || symptom,
          severity: symptom.severity || "moderate",
          duration: symptom.duration || "",
          onset: symptom.onset || "",
        }))
      : [],
    comorbidities: Array.isArray(entities.comorbidities)
      ? entities.comorbidities.map((comorbidity: any) => ({
          name: comorbidity.name || comorbidity,
          status: comorbidity.status || "active",
        }))
      : [],
    vitals: entities.vitals || {},
    labResults: entities.labResults || {},
  };
}

export default genAI;
