
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Ensure API_KEY is accessed from process.env as per guidelines
const API_KEY = process.env.API_KEY;

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function generateText(prompt: string): Promise<string> {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating text with Gemini:", error);
    throw error; // Rethrow to allow caller to handle
  }
}

// Add other Gemini API functions as needed, following the guidelines
// e.g., generateImages, chat functionality, etc.