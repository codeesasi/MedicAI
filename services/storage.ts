import { Medication } from '../types';

const STORAGE_KEY = 'medscript_medications_v1';

export const saveMedications = (meds: Medication[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meds));
  } catch (e) {
    console.error('Failed to save medications', e);
  }
};

export const loadMedications = (): Medication[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load medications', e);
    return [];
  }
};
