import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateRAGResponse(prompt: string, context: string) {
  const model = ai.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: [
      {
        parts: [
          { text: `Context information is below.\n---------------------\n${context}\n---------------------\nGiven the context information and not prior knowledge, answer the query.\nQuery: ${prompt}` }
        ]
      }
    ],
  });
  const response = await model;
  return response.text;
}

export async function transcribeImage(base64Image: string) {
  const model = ai.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: [
      {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: "image/png" } },
          { text: "Extract all text, charts, and handwriting from this image and convert it into a structured text format." }
        ]
      }
    ],
  });
  const response = await model;
  return response.text;
}

export async function generateDiagnosis(notes: string) {
  const model = ai.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: [
      {
        parts: [
          { text: `Based on the following clinical notes, generate a professional medical diagnosis report in Markdown format.\nNotes: ${notes}` }
        ]
      }
    ],
  });
  const response = await model;
  return response.text;
}

export async function handleGeneralCommand(command: string) {
  const model = ai.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: [
      {
        parts: [
          { text: `You are Searchy Gooper, a medical AI assistant. The user said: "${command}". Respond concisely and helpfully. If the user wants to open a feature (Dr. Drishti, Dr. Doodle, Dhvani Sanchar, Calendar, Patients), acknowledge it.` }
        ]
      }
    ],
  });
  const response = await model;
  return response.text;
}
