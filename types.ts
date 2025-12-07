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
  status: 'appropriate' | 'warning' | 'unknown';
  note: string;
}

export interface AnalysisResult {
  interactions: Interaction[];
  indicationChecks: IndicationCheck[]; // New field for Reason/Indication validation
  lifestyleWarnings: string[]; // Alcohol, Food, Sun
  summary: string;
}

export interface OcrResult {
  medications: Medication[];
  confidence: number;
}