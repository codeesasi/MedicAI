
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Medication, AnalysisResult } from '../types';

// Helper to get initialized client at runtime
const getAi = () => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("System API Key is missing. Please check application configuration.");
  }
  return new GoogleGenAI({ apiKey });
};

export const validateApiKey = (): boolean => {
  const key = process.env.API_KEY;
  return !!(key && key.trim().length > 0);
};

// Standard Safety Settings
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
];

// Robust JSON Extraction
const extractJson = (text: string, type: 'array' | 'object'): any => {
  // 1. Remove Markdown code blocks (Case Insensitive)
  let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  
  // 2. Try direct parse
  try {
    const parsed = JSON.parse(clean);
    // Basic type check
    if (type === 'array' && Array.isArray(parsed)) return parsed;
    if (type === 'object' && !Array.isArray(parsed) && typeof parsed === 'object') return parsed;
  } catch (e) {
    // Continue to heuristic
  }

  // 3. Heuristic Extraction (Find first [ or { and last ] or })
  const startChar = type === 'array' ? '[' : '{';
  const endChar = type === 'array' ? ']' : '}';
  
  const startIndex = clean.indexOf(startChar);
  const endIndex = clean.lastIndexOf(endChar);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const substring = clean.substring(startIndex, endIndex + 1);
    try {
      return JSON.parse(substring);
    } catch (e) {
      console.error(`JSON Parse Error (${type}):`, e);
      throw new Error(`Failed to parse AI response as ${type}.`);
    }
  }

  throw new Error(`No valid JSON ${type} found in response.`);
};

/**
 * Workflow 1: Prescription Analysis (Vision + OCR)
 */
export const analyzePrescriptionImage = async (base64Image: string, mimeType: string = 'image/png'): Promise<Partial<Medication>[]> => {
  const ai = getAi();
  const modelId = 'gemini-3-pro-preview'; 
  console.log("AI Image started")
  const prompt = `
    You are an certified clinical pharmacist. 
    Analyze this prescription image. 
    Extract the following details for EACH medication found.
    
    Output Format (JSON Array only):
    [
      {
        "name": "Medication Name",
        "dosage": "Strength",
        "frequency": "Frequency",
        "duration": "Duration",
        "instructions": "Instructions",
        "prescriber": "Doctor Name"
      }
    ]
    Use null for missing fields. Do not include any conversational text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        temperature: 0.1,
        safetySettings: SAFETY_SETTINGS,
        responseMimeType: "application/json", 
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI model");
    console.log("AI Image completed")
    return extractJson(text, 'array');
  } catch (error: any) {
    console.error("OCR Failed:", error);
    if (error.message?.includes("API key")) {
      throw new Error("Invalid or missing API Key.");
    }
    throw error;
  }
};

/**
 * Workflow 2: Drug Interaction Checking
 */
export const analyzeInteractions = async (meds: Medication[]): Promise<AnalysisResult> => {
  const ai = getAi();
  const modelId = 'gemini-3-pro-preview';
  
  const medList = meds.map(m => `${m.name} ${m.dosage || ''} ${m.frequency || ''}`).join(', ');

  const prompt = `
    Act as a senior clinical safety architect. 
    Cross-reference these medications: ${medList}
    
    Identify interactions, contraindications, and lifestyle warnings.
    
    Return STRICT JSON Object:
    {
      "interactions": [
        {
          "id": "uuid",
          "medicationsInvolved": ["Drug A", "Drug B"],
          "severity": "critical" | "moderate" | "minor",
          "description": "Explanation",
          "recommendation": "Advice",
          "mechanism": "Mechanism"
        }
      ],
      "lifestyleWarnings": ["Warning 1", "Warning 2"],
      "summary": "Concise summary"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: prompt }] }, // Explicit content structure
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
        safetySettings: SAFETY_SETTINGS,
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    const result = extractJson(text, 'object');
    
    // Validate structure
    if (!result.interactions || !Array.isArray(result.interactions)) {
       // If AI returned an array of interactions directly by mistake, wrap it
       if (Array.isArray(result)) {
         return {
           interactions: result,
           lifestyleWarnings: [],
           summary: "Analysis complete."
         } as AnalysisResult;
       }
       throw new Error("Invalid JSON structure returned");
    }
    
    return result as AnalysisResult;

  } catch (error: any) {
    console.error("Interaction Check Failed:", error);
    if (error.message?.includes("API key")) {
      throw new Error("Invalid or missing API Key.");
    }
    throw new Error("Failed to analyze interactions. Please try again.");
  }
};

/**
 * Workflow 3: Medical Chatbot
 */
export const sendChatMessage = async (currentMessage: string, history: { role: 'user' | 'model', text: string }[]): Promise<string> => {
  const ai = getAi();
  const modelId = 'gemini-3-pro-preview';

  try {
    const chat = ai.chats.create({
      model: modelId,
      config: {
        systemInstruction: "You are MedScript Assistant, a helpful AI health companion. Provide clear, accurate, and safe medical information. Your advice should be professional yet easy to understand. Keep answers concise.",
        safetySettings: SAFETY_SETTINGS,
      },
      history: history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }))
    });

    const result = await chat.sendMessage({ message: currentMessage });
    return result.text || "I'm sorry, I couldn't generate a response.";
  } catch (error: any) {
    console.error("Chat Failed:", error);
    if (error.message?.includes("API key")) {
      throw new Error("Invalid or missing API Key.");
    }
    throw new Error("Failed to send message.");
  }
};
