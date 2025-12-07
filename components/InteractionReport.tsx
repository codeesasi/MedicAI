import React from 'react';
import { AlertTriangle, ShieldCheck, AlertOctagon, Info, Utensils, Zap } from 'lucide-react';
import { AnalysisResult, Severity } from '../types';

interface Props {
  result: AnalysisResult | null;
  isLoading: boolean;
}

export const InteractionReport: React.FC<Props> = ({ result, isLoading }) => {
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-slate-100 min-h-[400px]">
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          <Zap className="absolute inset-0 m-auto text-indigo-600 w-8 h-8 animate-pulse" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Analyzing Safety Profile</h3>
        <p className="text-slate-500 mt-2 text-center max-w-md">
          Gemini Pro is cross-referencing your medications against clinical databases for interactions and contraindications...
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 min-h-[400px]">
        <ShieldCheck className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-500">No Analysis Yet</h3>
        <p className="text-sm text-slate-400">Add medications and click "Check Safety"</p>
      </div>
    );
  }

  const getSeverityColor = (s: Severity) => {
    switch (s) {
      case Severity.CRITICAL: return 'bg-red-50 border-red-200 text-red-900';
      case Severity.MODERATE: return 'bg-amber-50 border-amber-200 text-amber-900';
      case Severity.MINOR: return 'bg-blue-50 border-blue-200 text-blue-900';
      default: return 'bg-green-50 border-green-200 text-green-900';
    }
  };

  const getSeverityIcon = (s: Severity) => {
    switch (s) {
      case Severity.CRITICAL: return <AlertOctagon className="w-5 h-5 text-red-600" />;
      case Severity.MODERATE: return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case Severity.MINOR: return <Info className="w-5 h-5 text-blue-600" />;
      default: return <ShieldCheck className="w-5 h-5 text-green-600" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
      <div className="bg-slate-900 p-6 text-white flex-none">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-teal-400" />
          Safety Analysis Report
        </h2>
        <p className="text-slate-400 text-sm mt-1">{result.summary}</p>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* Interaction Cards */}
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Drug Interactions</h3>
          <div className="space-y-3">
            {result.interactions.length === 0 ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <span className="text-green-800 font-medium">No known drug-drug interactions found.</span>
              </div>
            ) : (
              result.interactions.map(interaction => (
                <div key={interaction.id} className={`p-4 rounded-lg border flex flex-col gap-2 ${getSeverityColor(interaction.severity)}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getSeverityIcon(interaction.severity)}</div>
                    <div>
                      <div className="font-bold text-lg flex items-center gap-2">
                        {interaction.medicationsInvolved.join(' + ')}
                        <span className="px-2 py-0.5 bg-white bg-opacity-50 rounded text-xs uppercase tracking-wide font-bold border border-black border-opacity-5">
                          {interaction.severity}
                        </span>
                      </div>
                      <p className="mt-1 font-medium leading-relaxed">{interaction.description}</p>
                      <div className="mt-3 bg-white bg-opacity-60 p-3 rounded text-sm">
                        <span className="font-bold">Recommendation: </span>
                        {interaction.recommendation}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lifestyle Warnings */}
        {result.lifestyleWarnings && result.lifestyleWarnings.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Utensils className="w-4 h-4" /> Lifestyle & Food
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.lifestyleWarnings.map((warn, idx) => (
                <li key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-700 text-sm flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0"></div>
                  {warn}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};