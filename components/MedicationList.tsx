
import React, { useState } from 'react';
import { Plus, Trash2, Pill, Mic, Activity, Edit2, RotateCcw, Save, X, AlertTriangle, Stethoscope, Clock, Calendar, FileText, Smartphone, Keyboard, HeartPulse, MapPin, Loader2, User, Scale, Thermometer, Ruler, Droplet, Wind, Download } from 'lucide-react';
import { Medication, PatientDetails, Vital, AnalysisResult } from '../types';

interface Props {
  medications: Medication[];
  onRemove: (id: string) => void;
  onAdd: (med: Medication) => void;
  onUpdate: (med: Medication) => void;
  onClear: () => void;
  onAnalyzeInteractions: () => void;
  
  // Shared State
  patientDetails: PatientDetails;
  onUpdatePatientDetails: (details: PatientDetails) => void;
  patientConditions: string;
  setPatientConditions: (val: string) => void;
  location: string;
  setLocation: (val: string) => void;
  
  // New Props for PDF Report
  analysisResult: AnalysisResult | null;
  onGeneratePdf: () => void;
}

export const MedicationList: React.FC<Props> = ({ 
    medications, 
    onRemove, 
    onAdd, 
    onUpdate, 
    onClear, 
    onAnalyzeInteractions,
    patientDetails,
    onUpdatePatientDetails,
    patientConditions,
    setPatientConditions,
    location,
    setLocation,
    analysisResult,
    onGeneratePdf
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  
  // Expanded Form State
  const [formData, setFormData] = useState({ 
    name: '', 
    dosage: '', 
    frequency: '',
    duration: '',
    prescriber: '',
    instructions: ''
  });
  
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Check if there is any data to clear
  const hasData = medications.length > 0 || 
                  patientDetails.some(v => v.value.trim() !== '') || 
                  patientConditions.trim() !== '' || 
                  location.trim() !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.name.trim()) {
        setFormError("Medication name is required.");
        return;
    }

    const medData = {
        name: formData.name,
        dosage: formData.dosage,
        frequency: formData.frequency,
        duration: formData.duration,
        prescriber: formData.prescriber,
        instructions: formData.instructions
    };

    if (editingId) {
      // Update existing
      const existing = medications.find(m => m.id === editingId);
      if (existing) {
        onUpdate({
          ...existing,
          ...medData
        });
      }
    } else {
      // Add new
      onAdd({
        id: Math.random().toString(36).substr(2, 9),
        ...medData,
        source: 'manual',
        dateAdded: Date.now()
      });
    }

    resetForm();
  };

  const handleEdit = (med: Medication) => {
    setFormData({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      duration: med.duration || '',
      prescriber: med.prescriber || '',
      instructions: med.instructions || ''
    });
    setEditingId(med.id);
    setFormError(null);
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '', dosage: '', frequency: '', duration: '', prescriber: '', instructions: '' });
    setEditingId(null);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const confirmClear = () => {
    onClear();
    setShowClearConfirm(false);
  };

  // Simple Speech Recognition Wrapper
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }
    // @ts-ignore
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.start();
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setFormData(prev => ({ ...prev, name: transcript }));
    };
  };

  const handleAutoLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Try a simple public IP/Geo API for City context, or fallback to coords
        try {
           const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
           const data = await res.json();
           const city = data.city || data.locality || '';
           const country = data.countryName || '';
           const region = data.principalSubdivision || '';
           
           if (city && country) {
              setLocation(`${city}, ${region}, ${country}`);
           } else {
              setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
           }
        } catch (e) {
           // Fallback if API fails
           setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } finally {
           setIsLocating(false);
        }
      },
      (error) => {
        console.error("Error getting location", error);
        setIsLocating(false);
        alert("Unable to retrieve location. Please enter manually.");
      }
    );
  };

  // --- Dynamic Vitals Logic ---
  const handleAddVital = () => {
    const newVital: Vital = {
        id: Math.random().toString(36).substr(2, 9),
        key: '',
        value: ''
    };
    onUpdatePatientDetails([...patientDetails, newVital]);
  };

  const handleRemoveVital = (id: string) => {
    onUpdatePatientDetails(patientDetails.filter(v => v.id !== id));
  };

  const handleUpdateVital = (id: string, field: 'key' | 'value', val: string) => {
    onUpdatePatientDetails(patientDetails.map(v => 
        v.id === id ? { ...v, [field]: val } : v
    ));
  };

  const getVitalIcon = (name: string) => {
    const k = name.toLowerCase();
    if (k.includes('age') || k.includes('year') || k.includes('dob')) return <Calendar className="w-3.5 h-3.5 text-slate-400" />;
    if (k.includes('weight') || k.includes('kg') || k.includes('lbs') || k.includes('mass')) return <Scale className="w-3.5 h-3.5 text-slate-400" />;
    if (k.includes('pressure') || k.includes('bp')) return <Activity className="w-3.5 h-3.5 text-slate-400" />;
    if (k.includes('gender') || k.includes('sex') || k.includes('male')) return <User className="w-3.5 h-3.5 text-slate-400" />;
    if (k.includes('height') || k.includes('cm') || k.includes('ft')) return <Ruler className="w-3.5 h-3.5 text-slate-400" />;
    if (k.includes('temp')) return <Thermometer className="w-3.5 h-3.5 text-slate-400" />;
    if (k.includes('sugar') || k.includes('glucose')) return <Droplet className="w-3.5 h-3.5 text-slate-400" />;
    if (k.includes('heart') || k.includes('pulse') || k.includes('rate')) return <HeartPulse className="w-3.5 h-3.5 text-slate-400" />;
    if (k.includes('oxy') || k.includes('spo2')) return <Wind className="w-3.5 h-3.5 text-slate-400" />;
    return <Activity className="w-3.5 h-3.5 text-slate-300" />;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  // Validation: Check if Age and Weight roughly exist in the keys
  const hasAge = patientDetails.some(v => v.key.toLowerCase().includes('age') && v.value);
  const hasWeight = patientDetails.some(v => v.key.toLowerCase().includes('weight') && v.value);
  const isReadyToCheck = medications.length > 0 && patientConditions.trim() && hasAge && hasWeight;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-full relative">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center flex-none">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <Pill className="w-5 h-5 text-teal-600" />
          Medication Cabinet
        </h2>
        <div className="flex items-center gap-3">
           <span className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-bold border border-teal-100">
            {medications.length} Items
          </span>
          {hasData && (
            <button 
              onClick={handleClearAll}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Clear Cabinet"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] scroll-smooth">
        {isFormOpen && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-teal-50 rounded-lg border border-teal-100 space-y-3 animate-in fade-in slide-in-from-top-2 shadow-md">
            <div className="flex justify-between items-center mb-1">
               <h3 className="text-sm font-bold text-teal-700 uppercase tracking-wider">
                 {editingId ? 'Edit Medication' : 'Add New Medication'}
               </h3>
               <button type="button" onClick={resetForm} className="text-teal-400 hover:text-teal-700">
                 <X className="w-4 h-4" />
               </button>
            </div>
            
            {/* Name Input */}
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                placeholder="Medication Name (e.g. Lisinopril)"
                className="flex-1 p-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white text-slate-900"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
              <button 
                type="button" 
                onClick={startListening}
                className="p-2 bg-white text-teal-600 rounded border border-slate-300 hover:bg-slate-50"
                title="Speak medication name"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Dosage (e.g. 10mg)"
                className="p-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white text-slate-900"
                value={formData.dosage}
                onChange={e => setFormData({ ...formData, dosage: e.target.value })}
              />
              <input
                type="text"
                placeholder="Frequency (e.g. Daily)"
                className="p-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white text-slate-900"
                value={formData.frequency}
                onChange={e => setFormData({ ...formData, frequency: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <input
                    type="text"
                    placeholder="Duration (e.g. 7 days)"
                    className="p-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white text-slate-900"
                    value={formData.duration}
                    onChange={e => setFormData({ ...formData, duration: e.target.value })}
                />
                <input
                    type="text"
                    placeholder="Doctor (e.g. Dr. Smith)"
                    className="p-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white text-slate-900"
                    value={formData.prescriber}
                    onChange={e => setFormData({ ...formData, prescriber: e.target.value })}
                />
            </div>

            <textarea
                rows={2}
                placeholder="Special Instructions (e.g. Take with food)"
                className="w-full p-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none bg-white text-slate-900"
                value={formData.instructions}
                onChange={e => setFormData({ ...formData, instructions: e.target.value })}
            />

            {formError && (
                <div className="p-2 bg-red-100 text-red-700 text-xs rounded flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" />
                    {formError}
                </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button 
                type="button" 
                onClick={resetForm} 
                className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded text-sm font-medium"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-4 py-1.5 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm font-medium flex items-center gap-1 shadow-sm"
              >
                {editingId ? <Save className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                {editingId ? 'Save Changes' : 'Add Medication'}
              </button>
            </div>
          </form>
        )}

        {medications.length === 0 && !isFormOpen && (
          <div className="text-center py-10 text-slate-400">
            <p>No medications added yet.</p>
            <p className="text-sm">Scan a prescription or add manually.</p>
          </div>
        )}

        {medications.map(med => (
          <div key={med.id} className="group flex flex-col p-4 rounded-lg bg-slate-50 border border-slate-200 hover:border-teal-300 transition-all gap-3">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-lg">{med.name}</h3>
                    {med.source === 'ocr' ? (
                        <div className="p-1 bg-blue-100 text-blue-600 rounded" title="Scanned from Prescription">
                            <Smartphone className="w-3 h-3" />
                        </div>
                    ) : (
                        <div className="p-1 bg-slate-200 text-slate-500 rounded" title="Manually Added">
                            <Keyboard className="w-3 h-3" />
                        </div>
                    )}
                </div>
                
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => handleEdit(med)}
                        className="text-slate-400 hover:text-teal-600 p-1.5 hover:bg-teal-50 rounded transition-colors"
                        title="Edit medication"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => onRemove(med.id)}
                        className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded transition-colors"
                        title="Remove medication"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Key Info Grid */}
            <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-white px-2 py-1.5 rounded border border-slate-200 flex items-center gap-2 text-slate-700">
                    <Pill className="w-3.5 h-3.5 text-teal-500" />
                    <span className="truncate">{med.dosage || 'No dosage'}</span>
                </div>
                <div className="bg-white px-2 py-1.5 rounded border border-slate-200 flex items-center gap-2 text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-teal-500" />
                    <span className="truncate">{med.frequency || 'No frequency'}</span>
                </div>
            </div>

            {/* Expanded Details */}
            {(med.prescriber || med.duration) && (
                <div className="flex flex-wrap gap-3 text-xs text-slate-500 border-t border-slate-200 pt-2">
                    {med.prescriber && (
                        <div className="flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                            <span>Dr. {med.prescriber.replace(/^Dr\.\s*/i, '')}</span>
                        </div>
                    )}
                    {med.duration && (
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{med.duration}</span>
                        </div>
                    )}
                </div>
            )}

            {med.instructions && (
                <div className="text-xs text-slate-600 bg-teal-50/50 p-2 rounded flex gap-2 items-start">
                    <FileText className="w-3.5 h-3.5 text-teal-500 mt-0.5 flex-shrink-0" />
                    <p className="italic leading-relaxed">"{med.instructions}"</p>
                </div>
            )}
            
            <div className="text-[10px] text-slate-300 text-right">
                Added {formatDate(med.dateAdded)}
            </div>
          </div>
        ))}
      </div>

      {/* Global Condition & Location Inputs */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex-none space-y-4">
          
          {/* PATIENT VITALS SECTION */}
          <div>
             <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                   <User className="w-4 h-4 text-teal-500" /> Patient Details
                </label>
                <button 
                  onClick={handleAddVital}
                  className="text-xs text-teal-600 font-bold hover:text-teal-800 flex items-center gap-1"
                >
                   <Plus className="w-3 h-3" /> Add Vital
                </button>
             </div>
             
             <div className="space-y-2">
                {patientDetails.map((vital) => (
                    <div key={vital.id} className="flex gap-2 items-center group">
                        <div className="relative flex-[2]">
                            <div className="absolute left-2 top-1/2 -translate-y-1/2">
                                {getVitalIcon(vital.key)}
                            </div>
                            <input 
                                type="text" 
                                placeholder="Name (e.g. Age)"
                                className="w-full pl-8 p-2 text-xs rounded border border-slate-300 bg-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                value={vital.key}
                                onChange={(e) => handleUpdateVital(vital.id, 'key', e.target.value)}
                            />
                        </div>
                        <div className="flex-[3]">
                            <input 
                                type="text" 
                                placeholder="Value (e.g. 25)"
                                className="w-full p-2 text-xs rounded border border-slate-300 bg-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                value={vital.value}
                                onChange={(e) => handleUpdateVital(vital.id, 'value', e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={() => handleRemoveVital(vital.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
                
                {patientDetails.length === 0 && (
                    <div className="text-center py-2 border border-dashed border-slate-200 rounded bg-slate-50/50">
                        <span className="text-[10px] text-slate-400">No vitals added. Add Age & Weight for safety checks.</span>
                    </div>
                )}
             </div>

             {!hasAge && !hasWeight && medications.length > 0 && (
                <div className="text-[10px] text-amber-600 mt-2 flex items-center gap-1 bg-amber-50 p-2 rounded">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" /> 
                    <span>Please add <strong>Age</strong> and <strong>Weight</strong> to enable safety checks.</span>
                </div>
             )}
          </div>

          {/* Location Input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500" />
                Location <span className="text-[10px] font-normal text-slate-400 lowercase">(for diet context)</span>
            </label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter City, Country"
                    className="flex-1 p-2 rounded border border-slate-300 text-sm focus:ring-2 focus:ring-rose-500 bg-white text-slate-900"
                />
                <button
                    onClick={handleAutoLocation}
                    disabled={isLocating}
                    className="p-2 bg-white border border-slate-300 rounded text-slate-600 hover:bg-slate-50 hover:text-rose-500 disabled:opacity-50"
                    title="Auto-detect location"
                >
                    {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                </button>
            </div>
          </div>

          {/* Condition Input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-indigo-500" />
                Condition / Reason
            </label>
            <textarea
                value={patientConditions}
                onChange={(e) => setPatientConditions(e.target.value)}
                placeholder="e.g. Hypertension, Diabetes..."
                className="w-full p-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[60px] resize-none bg-white text-slate-900"
            />
          </div>
          
          <div className="flex flex-col gap-3">
             <div className="flex gap-3">
                <button 
                  onClick={() => { resetForm(); setIsFormOpen(true); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 font-medium transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Manual
                </button>
                <button 
                  onClick={onAnalyzeInteractions}
                  disabled={!isReadyToCheck}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-white shadow-md transition-all
                    ${!isReadyToCheck
                      ? 'bg-slate-300 cursor-not-allowed opacity-70' 
                      : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
                >
                  <Activity className="w-4 h-4" />
                  Check Safety
                </button>
             </div>
             
             {/* PDF Report Button - Visible only when analysis is ready */}
             {analysisResult && (
                <button 
                    onClick={onGeneratePdf}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-100 font-bold transition-all animate-in fade-in slide-in-from-top-1"
                >
                    <Download className="w-4 h-4" />
                    Download PDF Report
                </button>
             )}
          </div>
      </div>

      {/* Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200 border border-slate-100">
                <div className="flex items-center gap-3 text-red-600 mb-4">
                    <div className="p-2 bg-red-50 rounded-full">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Clear Cabinet?</h3>
                </div>
                
                <p className="text-slate-600 mb-6 leading-relaxed">
                    Are you sure you want to remove all medications and reset patient details? This action cannot be undone.
                </p>
                
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={() => setShowClearConfirm(false)}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={confirmClear}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-sm"
                    >
                        Yes, Clear All
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
