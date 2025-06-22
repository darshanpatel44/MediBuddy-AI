import Groq from "groq-sdk";

// Initialize Groq client
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true, // Only for client-side usage in development
});

/**
 * Transcribe audio file using Groq's Whisper API
 * @param audioFile - The audio file to transcribe
 * @param options - Optional configuration
 * @returns Promise<string> - The transcribed text
 */
export async function transcribeAudio(
  audioFile: File,
  options?: {
    model?: string;
    responseFormat?: "json" | "text" | "verbose_json";
    language?: string;
    prompt?: string;
  }
): Promise<string> {
  try {
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: options?.model || "whisper-large-v3-turbo",
      response_format: options?.responseFormat || "verbose_json",
      language: options?.language,
      prompt: options?.prompt,
    });

    // Handle different response formats
    if (typeof transcription === "string") {
      return transcription;
    } else if (
      transcription &&
      typeof transcription === "object" &&
      "text" in transcription
    ) {
      return transcription.text;
    } else {
      throw new Error("Unexpected response format from Groq API");
    }
  } catch (error) {
    console.error("Error transcribing audio with Groq:", error);
    throw new Error(
      `Transcription failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Example usage function (as provided in the task)
 */
export async function exampleTranscription() {
  try {
    // This would work with a file input in a real scenario
    // const transcription = await groq.audio.transcriptions.create({
    //   file: fs.createReadStream("audio.m4a"), // This won't work in browser
    //   model: "whisper-large-v3-turbo",
    //   response_format: "verbose_json",
    // });
    // console.log(transcription.text);

    console.log("Use transcribeAudio() function with a File object instead");
  } catch (error) {
    console.error("Transcription error:", error);
  }
}

export default groq;
