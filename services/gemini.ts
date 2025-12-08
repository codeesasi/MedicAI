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
 * FAST MODE: Uses Gemini 2.5 Pro for better faster
 */
export const analyzePrescriptionImage = async (
  images: { base64: string, mimeType: string }[]
): Promise<Partial<Medication>[]> => {
  const ai = getAi();
  // Use Flash for high-speed vision tasks
  const modelId = 'gemini-2.5-pro'; 
  console.log("AI ImageScan started with", modelId, "Image count:", images.length);
  
  const prompt = `
    Extract medication details from these prescription images into a JSON Array.
    Treat the images as pages of one or more prescriptions.
    Fields: name, dosage, frequency, duration, instructions, prescriber.
    Return strictly structured JSON. No markdown. No conversation.
    Example: [{"name": "Amoxicillin", "dosage": "500mg", "frequency": "Twice Daily", "duration": "7 days", "instructions": "Take before food /after food", "prescriber": "Dr. Smith"}]
    Use null for missing fields.
  `;

  // Prepare parts for multiple images
  const parts: any[] = images.map(img => ({
    inlineData: {
      mimeType: img.mimeType,
      data: img.base64
    }
  }));
  // Add the prompt as the last part
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: parts
      },
      config: {
        temperature: 0.1,
        safetySettings: SAFETY_SETTINGS,
        responseMimeType: "application/json", 
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI model");
    console.log("AI ImageScan completed");
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
 * Workflow 1.5: Verify Spelling
 */
export const verifyMedicationSpelling = async (meds: Partial<Medication>[]): Promise<Partial<Medication>[]> => {
  console.log("Starting Spelling Verification for:", meds);
  const ai = getAi();

  const inputJson = JSON.stringify(meds);

  // 1. Primary Attempt: Gemini 2.5 Flash + Google Search
  try {
    console.log("Attempting verification with Gemini 3 Pro (Search Enabled)...");
    const modelId = 'gemini-2.5-flash';
    const prompt = `
      Act as a pharmacy auditor. Verify the spelling of these medication names using Google Search.
      Input: ${inputJson}
      
      Tasks:
      1. Search for the medication names to verify existence.
      2. Correct typos (e.g., "Lisnopril" -> "Lisinopril").
      3. Return ONLY the corrected JSON Array.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: prompt }] },
      config: {
        tools: [{ googleSearch: {} }], 
        temperature: 0.1,
        safetySettings: SAFETY_SETTINGS,
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Pro model");
    return extractJson(text, 'array');

  } catch (error) {
    console.warn("Primary verification failed. Switching to Fallback...", error);

    // 2. Fallback Attempt: Gemini 2.5 Flash
    try {
      console.log("Attempting fallback with Gemini 2.5 Flash...");
      const modelId = 'gemini-2.5-flash-lite';
      const prompt = `
        You are a medical data cleaner. Correct spelling errors in this medication list.
        Input: ${inputJson}
        Return strictly valid JSON Array.
      `;

      const response = await ai.models.generateContent({
        model: modelId,
        contents: { parts: [{ text: prompt }] },
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
          safetySettings: SAFETY_SETTINGS,
        }
      });

      const text = response.text;
      if (!text) return meds;
      return extractJson(text, 'array');

    } catch (fallbackError) {
      console.error("All verification attempts failed.", fallbackError);
      return meds;
    }
  }
};

/**
 * Workflow 2: Drug Interaction Checking + Indication + Location Based Diet
 */
export const analyzeInteractions = async (
  meds: Medication[], 
  patientConditions: string,
  location: string
): Promise<AnalysisResult> => {
  const ai = getAi();
  const modelId = 'gemini-3-pro-preview';
  
  // Create a context-rich list
  const medListJson = JSON.stringify(meds.map(m => ({
    name: m.name,
    dosage: m.dosage,
    frequency: m.frequency
  })));

  const prompt = `
    Act as a senior clinical safety architect and nutritionist. 
    
    Patient Context/Conditions: "${patientConditions}"
    Patient Location: "${location || 'Unknown'}"
    Medication List: ${medListJson}
    
    TASKS:
    1. Indication Check: Verify if each medication is appropriate for the stated conditions.
    2. Interaction Check: Identify drug-drug interactions and lifestyle warnings.
    3. Location-Based Health Plan: Based on the "${location}" and the medications/conditions, provide a culturally appropriate diet and lifestyle plan.
       - Suggest specific local foods (e.g., if India: millets, specific vegetables; if USA: local produce).
       - Provide Breakfast, Lunch, Dinner, Snack ideas.
       - Suggest Yoga/Exercise suitable for the conditions.
    
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
      "indicationChecks": [
        {
          "medicationName": "Name",
          "reason": "Inferred reason",
          "status": "appropriate" | "warning" | "critical",
          "note": "Brief clinical explanation."
        }
      ],
      "lifestyleWarnings": ["Warning 1", "Warning 2", "Warning 3"],
      "dietPlan": {
         "breakfast": "Meal idea...",
         "lunch": "Meal idea...",
         "dinner": "Meal idea...",
         "snacks": "Snack options...",
         "recommendedFoods": ["Specific Veg/Fruit", "Millets/Grains", "Superfoods"],
         "avoidFoods": ["Specific Item", "Category"],
         "hydration": "Guidance on water/fluids",
         "nonVegRecommendation": "Advice on meat/fish consumption based on meds/health"
      },
      "lifestylePlan": {
         "yoga": "Specific asanas or stretches",
         "exercises": ["Exercise 1", "Exercise 2"],
         "sleepDuration": "Recommended hours",
         "caloricGuidance": "General advice on intake/burn"
      },
      "summary": "Concise summary of safety and indication findings."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: prompt }] },
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
        safetySettings: SAFETY_SETTINGS,
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    const result = extractJson(text, 'object');
    
    // Basic structural validation
    if (!result.interactions || !Array.isArray(result.interactions)) {
       throw new Error("Invalid JSON structure returned");
    }
    
    // Ensure nested objects exist to prevent crashes
    if (!result.indicationChecks) result.indicationChecks = [];
    if (!result.dietPlan) result.dietPlan = { recommendedFoods: [], avoidFoods: [] };
    if (!result.lifestylePlan) result.lifestylePlan = { exercises: [] };
    
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