
export interface Vital {
  id: string;
  key: string;
  value: string;
}

export type PatientDetails = Vital[];

export interface Medication {
  id: string;
  name: string; // Generic or Brand
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
  prescriber?: string;
  reason?: string; // New field for Condition/Reason
  source: 'manual' | 'ocr';
  dateAdded: number;
}

export enum Severity {
  CRITICAL = 'critical',
  MODERATE = 'moderate',
  MINOR = 'minor',
  SAFE = 'safe'
}

export interface Interaction {
  id: string;
  medicationsInvolved: string[];
  severity: Severity;
  description: string;
  recommendation: string;
  mechanism: string; // e.g., "CYP3A4 inhibition"
}

export interface IndicationCheck {
  medicationName: string;
  reason: string;
  status: 'appropriate' | 'warning' | 'critical' | 'unknown';
  note: string;
}

export interface DietPlan {
  breakfast: string;
  lunch: string;
  dinner: string;
  snacks: string;
  recommendedFoods: string[]; // Millets, spinach, fruits, etc.
  avoidFoods: string[];
  hydration: string;
  nonVegRecommendation: string;
}

export interface LifestylePlan {
  yoga: string;
  exercises: string[];
  sleepDuration: string;
  caloricGuidance: string; // Intake/Burn
  nutritionHabits?: string[];
}

export interface AnalysisResult {
  interactions: Interaction[];
  indicationChecks: IndicationCheck[];
  lifestyleWarnings: string[]; // General interactions (alcohol, sun)
  dietPlan: DietPlan; // New Location-based diet
  lifestylePlan: LifestylePlan; // New Location-based lifestyle
  summary: string;
}

export interface OcrResult {
  medications: Medication[];
  patientDetails: PatientDetails;
  confidence: number;
}

// Centralized AI Model Definitions
export const AI_MODELS = {
  // Complex reasoning and Agents (High Intelligence)
  PRO: 'gemini-3-pro-preview',
  // Fast tasks, fallbacks, simple text, and translation (Low Latency)
  FLASH: 'gemini-2.5-flash',
  // Image generation
  IMAGE: 'gemini-2.5-flash-image',
  // Fast ORC and Quick response (using 3-pro for better OCR)
  PLUS: 'gemini-3-pro-preview',
  // To identify language based on lication
  LANG: 'gemini-2.0-flash-lite'
} as const;
