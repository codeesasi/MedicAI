import React, { useState } from 'react';
import { Plus, Trash2, Pill, Mic, Activity } from 'lucide-react';
import { Medication } from '../types';

interface Props {
  medications: Medication[];
  onRemove: (id: string) => void;
  onAdd: (med: Medication) => void;
  onAnalyzeInteractions: () => void;
}

export const MedicationList: React.FC<Props> = ({ medications, onRemove, onAdd, onAnalyzeInteractions }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newMed, setNewMed] = useState({ name: '', dosage: '', frequency: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMed.name) return;

    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      name: newMed.name,
      dosage: newMed.dosage,
      frequency: newMed.frequency,
      source: 'manual',
      dateAdded: Date.now()
    });

    setNewMed({ name: '', dosage: '', frequency: '' });
    setIsAdding(false);
  };

  // Simple Speech Recognition Wrapper
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    // @ts-ignore
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.start();
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setNewMed(prev => ({ ...prev, name: transcript }));
    };
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-full">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center flex-none">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <Pill className="w-5 h-5 text-teal-600" />
          Medication Cabinet
        </h2>
        <span className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-bold">
          {medications.length} Active
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
        {medications.length === 0 && !isAdding && (
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
            <button 
              onClick={() => onRemove(med.id)}
              className="text-slate-300 hover:text-red-500 transition-colors p-1"
              title="Remove medication"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {isAdding && (
          <form onSubmit={handleSubmit} className="p-4 bg-teal-50 rounded-lg border border-teal-100 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                placeholder="Medication Name (e.g. Lisinopril)"
                className="flex-1 p-2 rounded border border-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={newMed.name}
                onChange={e => setNewMed({ ...newMed, name: e.target.value })}
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
                className="flex-1 p-2 rounded border border-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={newMed.dosage}
                onChange={e => setNewMed({ ...newMed, dosage: e.target.value })}
              />
              <input
                type="text"
                placeholder="Frequency (e.g. Daily)"
                className="flex-1 p-2 rounded border border-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={newMed.frequency}
                onChange={e => setNewMed({ ...newMed, frequency: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1 text-slate-500 hover:text-slate-700 text-sm">Cancel</button>
              <button type="submit" className="px-4 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm font-medium">Add Med</button>
            </div>
          </form>
        )}
      </div>

      <div className="p-4 border-t border-slate-100 flex gap-3 flex-none">
        <button 
          onClick={() => setIsAdding(true)}
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
    </div>
  );
};