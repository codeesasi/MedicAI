import React, { useState } from 'react';
import { Plus, Trash2, Pill, Mic, Activity, Edit2, RotateCcw, Save, X, AlertTriangle } from 'lucide-react';
import { Medication } from '../types';

interface Props {
  medications: Medication[];
  onRemove: (id: string) => void;
  onAdd: (med: Medication) => void;
  onUpdate: (med: Medication) => void;
  onClear: () => void;
  onAnalyzeInteractions: () => void;
}

export const MedicationList: React.FC<Props> = ({ medications, onRemove, onAdd, onUpdate, onClear, onAnalyzeInteractions }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', dosage: '', frequency: '' });
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingId) {
      // Update existing
      const existing = medications.find(m => m.id === editingId);
      if (existing) {
        onUpdate({
          ...existing,
          name: formData.name,
          dosage: formData.dosage,
          frequency: formData.frequency
        });
      }
    } else {
      // Add new
      onAdd({
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        dosage: formData.dosage,
        frequency: formData.frequency,
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
      frequency: med.frequency
    });
    setEditingId(med.id);
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '', dosage: '', frequency: '' });
    setEditingId(null);
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-full relative">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center flex-none">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <Pill className="w-5 h-5 text-teal-600" />
          Medication Cabinet
        </h2>
        <div className="flex items-center gap-2">
           <span className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-bold">
            {medications.length} Active
          </span>
          {medications.length > 0 && (
            <button 
              onClick={handleClearAll}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="Clear All Medications"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
        {medications.length === 0 && !isFormOpen && (
          <div className="text-center py-10 text-slate-400">
            <p>No medications added yet.</p>
            <p className="text-sm">Scan a prescription or add manually.</p>
          </div>
        )}

        {medications.map(med => (
          <div key={med.id} className="group flex justify-between items-start p-4 rounded-lg bg-slate-50 border border-slate-200 hover:border-teal-300 transition-all">
            <div>
              <h3 className="font-bold text-slate-800">{med.name}</h3>
              <div className="text-sm text-slate-500 mt-1 flex flex-wrap gap-2">
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200">{med.dosage}</span>
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200">{med.frequency}</span>
              </div>
              {med.instructions && (
                <p className="text-xs text-slate-400 mt-2 italic">"{med.instructions}"</p>
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
        ))}

        {isFormOpen && (
          <form onSubmit={handleSubmit} className="p-4 bg-teal-50 rounded-lg border border-teal-100 space-y-3 animate-in fade-in slide-in-from-top-2 shadow-md">
            <div className="flex justify-between items-center mb-1">
               <h3 className="text-sm font-bold text-teal-700 uppercase tracking-wider">
                 {editingId ? 'Edit Medication' : 'Add New Medication'}
               </h3>
               <button type="button" onClick={resetForm} className="text-teal-400 hover:text-teal-700">
                 <X className="w-4 h-4" />
               </button>
            </div>
            
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                placeholder="Medication Name (e.g. Lisinopril)"
                className="flex-1 p-2 rounded border border-teal-600 bg-teal-700 text-white placeholder-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
              <button 
                type="button" 
                onClick={startListening}
                className="p-2 bg-white text-teal-600 rounded border border-teal-200 hover:bg-teal-100"
                title="Speak medication name"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Dosage (e.g. 10mg)"
                className="flex-1 p-2 rounded border border-teal-600 bg-teal-700 text-white placeholder-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                value={formData.dosage}
                onChange={e => setFormData({ ...formData, dosage: e.target.value })}
              />
              <input
                type="text"
                placeholder="Frequency (e.g. Daily)"
                className="flex-1 p-2 rounded border border-teal-600 bg-teal-700 text-white placeholder-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                value={formData.frequency}
                onChange={e => setFormData({ ...formData, frequency: e.target.value })}
              />
            </div>
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
      </div>

      <div className="p-4 border-t border-slate-100 flex gap-3 flex-none">
        <button 
          onClick={() => { resetForm(); setIsFormOpen(true); }}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Manual
        </button>
        <button 
          onClick={onAnalyzeInteractions}
          disabled={medications.length < 2}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-white shadow-md transition-all
            ${medications.length < 2 
              ? 'bg-slate-300 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
        >
          <Activity className="w-4 h-4" />
          Check Safety
        </button>
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
                    Are you sure you want to remove all medications? This action cannot be undone.
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