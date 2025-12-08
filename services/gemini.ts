
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Medication, AnalysisResult, PatientDetails, Vital } from '../types';

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

const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Workflow 1: Prescription Analysis (Vision + OCR)
 * FAST MODE: Uses Gemini 2.5 Pro for better faster
 */
export const analyzePrescriptionImage = async (
  images: { base64: string, mimeType: string }[]
): Promise<{ medications: Partial<Medication>[], patientDetails: PatientDetails }> => {
  const ai = getAi();
  // Use Flash for high-speed vision tasks
  const modelId = 'gemini-2.5-pro'; 
  console.log("AI ImageScan started with", modelId, "Image count:", images.length);
  
  const prompt = `
    Extract data from these prescription images into a strict JSON Object.
    
    1. "medications": Array of medications. Fields: name, dosage, frequency, duration, instructions, prescriber.
    2. "patient": Object containing patient vitals. Fields: age, weight, bloodPressure, gender. Use null or empty string if not clearly visible.
    
    Return strictly structured JSON. No markdown. No conversation.
    Example: 
    {
      "medications": [{"name": "Amoxicillin", "dosage": "500mg", "frequency": "Twice Daily", "duration": "7 days", "instructions": "Take after food", "prescriber": "Dr. Smith"}],
      "patient": {"age": "45", "weight": "70kg", "bloodPressure": "120/80", "gender": "Male", "body temprature":"30"}
    }
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
    
    const result = extractJson(text, 'object');
    
    // Map patient object to Vital[]
    const rawPatient = result.patient || {};
    const mapping: Record<string, string> = {
        age: 'Age',
        weight: 'Weight',
        bloodPressure: 'Blood Pressure',
        gender: 'Gender',
        bp: 'Blood Pressure'
    };
    
    const mappedVitals: Vital[] = Object.entries(rawPatient).map(([key, value]) => {
        const cleanValue = String(value || '').trim();
        if (!cleanValue) return null;
        
        return {
            id: generateId(),
            key: mapping[key] || key.charAt(0).toUpperCase() + key.slice(1),
            value: cleanValue
        };
    }).filter((v): v is Vital => v !== null);

    return {
      medications: Array.isArray(result.medications) ? result.medications : [],
      patientDetails: mappedVitals
    };
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

  // 1. Primary Attempt: Gemini 2.5 pro + Google Search
  try {
    console.log("Attempting verification with Gemini 3 Pro (Search Enabled)...");
    const modelId = 'gemini-2.5-pro';
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
 * Workflow 2: Agentic Safety & Wellness Analysis
 * Splits the task into two parallel agents for speed, cost-effectiveness, and web-grounded accuracy.
 */

// AGENT 1: Clinical Safety Agent
// Focused on DDI, Contraindications, Indications.
const runClinicalSafetyAgent = async (
    ai: GoogleGenAI, 
    context: { medListJson: string, vitalsString: string, patientConditions: string }
) => {
    const prompt = `
    Role: Clinical Safety Pharmacist Agent.
    
    Task: Analyze the following medication list for Safety and Indications.
    Use Google Search to verify contraindications if necessary, but prioritize established medical guidelines.
    
    Patient Context:
    Vitals: ${context.vitalsString}
    Conditions: ${context.patientConditions}
    Medications: ${context.medListJson}
    
    Requirements:
    1. Indication Check: For each drug, is it appropriate for the patient's conditions?
    2. Interaction Check: Identify Drug-Drug, Drug-Condition, and Drug-Vital interactions (e.g., Beta blockers with low HR).
    
    Output strictly VALID JSON with these keys:
    {
      "interactions": [ { "id": "uuid", "medicationsInvolved": [], "severity": "critical"|"moderate"|"minor", "description": "", "recommendation": "", "mechanism": "" } ],
      "indicationChecks": [ { "medicationName": "", "reason": "", "status": "appropriate"|"warning"|"critical", "note": "" } ],
      "summary": "Brief clinical summary."
    }
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // Fast & Capable
        contents: { parts: [{ text: prompt }] },
        config: {
            tools: [{ googleSearch: {} }],
            temperature: 0.1,
            safetySettings: SAFETY_SETTINGS,
        }
    });

    return extractJson(response.text || "{}", 'object');
};

// AGENT 2: Wellness & Lifestyle Agent
// Focused on Diet, Lifestyle, Location-based advice.
const runWellnessAgent = async (
    ai: GoogleGenAI, 
    context: { medListJson: string, vitalsString: string, patientConditions: string, location: string }
) => {
    const prompt = `
    Role: Local Wellness & Nutrition Agent.
    
    Task: Create a location-based Diet and Lifestyle plan.
    Use Google Search to find local foods in "${context.location}" suitable for the patient's conditions.
    
    Patient Context:
    Location: ${context.location || 'Unknown'}
    Vitals: ${context.vitalsString}
    Conditions: ${context.patientConditions}
    Medications: ${context.medListJson}
    
    Requirements:
    1. Diet Plan: Suggest local cuisine options for Breakfast, Lunch, Dinner.
    2. Foods to Avoid: Specific to the meds/conditions.
    3. Lifestyle: Yoga/Exercise suitable for the Vitals.
    4. General Warnings: Sun sensitivity, Alcohol, caffeinated beverages, etc.
    
    Output strictly VALID JSON with these keys:
    {
      "dietPlan": { "breakfast": "", "lunch": "", "dinner": "", "snacks": "", "recommendedFoods": [], "avoidFoods": [], "hydration": "", "nonVegRecommendation": "", "juice": [], "sugar": [], "salt": [] },
      "lifestylePlan": { "yoga": "", "exercises": [], "sleepDuration": "", "caloricGuidance": "","nutritionHabits":[] },
      "lifestyleWarnings": []
    }
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // Fast & Creative
        contents: { parts: [{ text: prompt }] },
        config: {
            tools: [{ googleSearch: {} }], // Essential for local context
            temperature: 0.5,
            safetySettings: SAFETY_SETTINGS,
        }
    });

    return extractJson(response.text || "{}", 'object');
};


export const analyzeInteractions = async (
  meds: Medication[], 
  patientConditions: string,
  location: string,
  patientDetails: PatientDetails
): Promise<AnalysisResult> => {
  const ai = getAi();
  
  // Prepare Context
  const medListJson = JSON.stringify(meds.map(m => ({
    name: m.name,
    dosage: m.dosage,
    frequency: m.frequency
  })));
  
  const vitalsString = patientDetails
    .map(v => `${v.key}: ${v.value}`)
    .join(', ');

  const context = { medListJson, vitalsString, patientConditions };

  console.log("Starting Parallel Agentic Workflow...");

  try {
    // Execute Agents in Parallel
    const [safetyResult, wellnessResult] = await Promise.all([
        runClinicalSafetyAgent(ai, context),
        runWellnessAgent(ai, { ...context, location })
    ]);

    console.log("Agents Finished. Merging Results.");

    // Merge Results
    const finalResult: AnalysisResult = {
        interactions: safetyResult.interactions || [],
        indicationChecks: safetyResult.indicationChecks || [],
        summary: safetyResult.summary || "Analysis complete.",
        
        dietPlan: wellnessResult.dietPlan || { recommendedFoods: [], avoidFoods: [] },
        lifestylePlan: wellnessResult.lifestylePlan || { exercises: [] },
        lifestyleWarnings: wellnessResult.lifestyleWarnings || []
    };
    
    return finalResult;

  } catch (error: any) {
    console.error("Agentic Workflow Failed:", error);
    if (error.message?.includes("API key")) {
      throw new Error("Invalid or missing API Key.");
    }
    throw new Error("Failed to complete safety analysis. Please try again.");
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
