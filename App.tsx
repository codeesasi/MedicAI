import React, { useState, useEffect } from 'react';
import { Menu, X, HeartPulse, Camera, Pill, AlertCircle } from 'lucide-react';
import { MedicationList } from './components/MedicationList';
import { PrescriptionScanner } from './components/PrescriptionScanner';
import { InteractionReport } from './components/InteractionReport';
import { MedicalChatBot } from './components/MedicalChatBot';
import { saveMedications, loadMedications } from './services/storage';
import { analyzeInteractions, validateApiKey } from './services/gemini';
import { Medication, AnalysisResult } from './types';

// Tab Enum
enum Tab {
  SCAN = 'scan',
  CABINET = 'cabinet'
}

export default function App() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.SCAN);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    const loaded = loadMedications();
    setMedications(loaded);
    
    // If we have meds, default to cabinet, otherwise scan
    if (loaded.length > 0) {
      setActiveTab(Tab.CABINET);
    }
  }, []);

  // Save on change
  useEffect(() => {
    saveMedications(medications);
  }, [medications]);

  // Clear error on tab switch
  useEffect(() => {
    setAppError(null);
  }, [activeTab]);

  const handleAddMedication = (med: Medication) => {
    setMedications(prev => [...prev, med]);
    setAnalysisResult(null); // Clear old analysis
    setAppError(null);
  };

  const handleUpdateMedication = (updatedMed: Medication) => {
    setMedications(prev => prev.map(m => m.id === updatedMed.id ? updatedMed : m));
    setAnalysisResult(null); // Clear old analysis as data changed
  };

  const handleClearMedications = () => {
    setMedications([]);
    setAnalysisResult(null);
  };

  const handleScanComplete = (newMeds: Medication[]) => {
    newMeds.forEach(m => handleAddMedication(m));
    setActiveTab(Tab.CABINET); // Redirect to cabinet to see results
  };

  const handleRemoveMedication = (id: string) => {
    setMedications(prev => prev.filter(m => m.id !== id));
    setAnalysisResult(null);
  };

  const runAnalysis = async (patientConditions: string) => {
    if (medications.length === 0) return;
    setAppError(null);
    
    if (!validateApiKey()) {
      setAppError("System Configuration Error: API Key is missing. Please check your environment variables.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await analyzeInteractions(medications, patientConditions);
      setAnalysisResult(result);
    } catch (e: any) {
      console.error(e);
      setAppError(e.message || "Analysis failed. Please check your connection and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case Tab.SCAN: return 'Scan Prescription';
      case Tab.CABINET: return 'Medication Cabinet';
      default: return 'MedScript AI';
    }
  };

  return (
    <div className="h-[100dvh] bg-slate-50 font-sans text-slate-900 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-full w-64 bg-slate-900 text-white transition-transform duration-300 flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between flex-none">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <HeartPulse className="text-teal-400" />
            MedScript AI
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400">
            <X />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1 flex-1">
          <button
            onClick={() => { setActiveTab(Tab.SCAN); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === Tab.SCAN ? 'bg-teal-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Camera className="w-5 h-5" />
            Scan Prescription
          </button>
          <button
            onClick={() => { setActiveTab(Tab.CABINET); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === Tab.CABINET ? 'bg-teal-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Pill className="w-5 h-5" />
            Medication Cabinet
          </button>
        </nav>

        <div className="p-6 bg-slate-800 flex-none">
          <p className="text-xs text-slate-400 leading-relaxed">
            <strong>Medical Disclaimer:</strong> This AI tool is for informational purposes only. Always consult a doctor before changing medication.
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 flex-none px-6 py-4 flex items-center justify-between z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-600">
              <Menu />
            </button>
            <h1 className="text-lg font-semibold text-slate-800">
              {getPageTitle()}
            </h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">
            AI
          </div>
        </header>

        {/* Global Error Banner */}
        {appError && (
          <div className="flex-none bg-red-50 border-b border-red-200 px-6 py-3 flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{appError}</span>
            </div>
            <button onClick={() => setAppError(null)} className="text-red-500 hover:text-red-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-50">
          <div className="max-w-[1920px] mx-auto h-full flex flex-col xl:h-full">
            
            {/* --- PAGE: SCAN PRESCRIPTION --- */}
            {activeTab === Tab.SCAN && (
               <div className="max-w-3xl mx-auto w-full py-6 lg:py-12 animate-in fade-in zoom-in-95 duration-300">
                 <div className="text-center mb-10">
                   <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 text-teal-600 mb-4">
                     <Camera className="w-8 h-8" />
                   </div>
                   <h2 className="text-3xl font-bold text-slate-900">Add New Medication</h2>
                   <p className="text-slate-500 mt-2 text-lg max-w-lg mx-auto">
                     Take a photo or upload an image of your prescription bottle, label, or doctor's note.
                   </p>
                 </div>
                 
                 <PrescriptionScanner onMedicationsFound={handleScanComplete} />
                 
                 <div className="mt-8 text-center">
                    <button 
                      onClick={() => setActiveTab(Tab.CABINET)}
                      className="text-teal-600 font-medium hover:text-teal-800 hover:underline underline-offset-4"
                    >
                      Skip to Cabinet &rarr;
                    </button>
                 </div>
               </div>
            )}

            {/* --- PAGE: MEDICATION CABINET --- */}
            {activeTab === Tab.CABINET && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-auto xl:h-full items-stretch animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Left Column: Medication List */}
                <div className="flex flex-col xl:col-span-1 h-[600px] xl:h-full min-h-0">
                  <MedicationList 
                    medications={medications} 
                    onAdd={handleAddMedication}
                    onRemove={handleRemoveMedication}
                    onUpdate={handleUpdateMedication}
                    onClear={handleClearMedications}
                    onAnalyzeInteractions={runAnalysis}
                  />
                </div>

                {/* Right Column: Interaction Report */}
                <div className="xl:col-span-2 h-auto xl:h-full min-h-0">
                  <InteractionReport result={analysisResult} isLoading={isAnalyzing} />
                </div>
              </div>
            )}

          </div>
        </div>
        
        {/* Floating Chat Bot */}
        <MedicalChatBot />
      </main>
    </div>
  );
}