import React from 'react';
import { AlertTriangle, ShieldCheck, AlertOctagon, Info, Utensils, Zap, CheckCircle, HelpCircle, Moon, Activity, Coffee, Sun, Sunrise, Sunset, Leaf, XCircle } from 'lucide-react';
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
          Checking drug interactions, verifying condition matches, and generating your localized health plan...
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 min-h-[400px]">
        <ShieldCheck className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-500">No Analysis Yet</h3>
        <p className="text-sm text-slate-400 text-center mt-2 max-w-xs">
           Enter your location, add medications (with reason), and click "Check Safety" to get a comprehensive report.
        </p>
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

      <div className="p-6 space-y-8 flex-1 overflow-y-auto">
        
        {/* Indication / Appropriateness Check */}
        {result.indicationChecks && result.indicationChecks.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Is Correct Tablet
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {result.indicationChecks.map((check, idx) => (
                <div key={idx} className={`p-3 rounded-lg border flex items-start gap-3 
                  ${check.status === 'appropriate' ? 'bg-green-50 border-green-200' : 
                    check.status === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                    
                    <div className="mt-0.5 flex-shrink-0">
                      {check.status === 'appropriate' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                       check.status === 'warning' ? <AlertTriangle className="w-5 h-5 text-amber-600" /> :
                       <HelpCircle className="w-5 h-5 text-slate-400" />}
                    </div>
                    
                    <div>
                      <div className="font-bold text-sm text-slate-800">
                        {check.medicationName} 
                        <span className="font-normal text-slate-500"> for </span> 
                        <span className="italic">{check.reason}</span>
                      </div>
                      <p className={`text-sm mt-1 ${check.status === 'warning' ? 'text-amber-800 font-medium' : 'text-slate-600'}`}>
                        {check.note}
                      </p>
                    </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drug Interactions */}
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

        {/* DIET PLAN SECTION */}
        {result.dietPlan && (
           <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Utensils className="w-4 h-4 text-orange-500" /> Localized Diet Plan
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {/* Meals */}
                 <div className="space-y-3">
                    <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
                       <div className="flex items-center gap-2 text-orange-700 font-bold text-xs uppercase mb-1">
                          <Sunrise className="w-3.5 h-3.5" /> Breakfast
                       </div>
                       <p className="text-sm text-slate-700 leading-relaxed">{result.dietPlan.breakfast}</p>
                    </div>
                    <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
                       <div className="flex items-center gap-2 text-orange-700 font-bold text-xs uppercase mb-1">
                          <Sun className="w-3.5 h-3.5" /> Lunch
                       </div>
                       <p className="text-sm text-slate-700 leading-relaxed">{result.dietPlan.lunch}</p>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                       <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase mb-1">
                          <Sunset className="w-3.5 h-3.5" /> Dinner
                       </div>
                       <p className="text-sm text-slate-700 leading-relaxed">{result.dietPlan.dinner}</p>
                    </div>
                    <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg">
                       <div className="flex items-center gap-2 text-teal-700 font-bold text-xs uppercase mb-1">
                          <Coffee className="w-3.5 h-3.5" /> Snacks / Hydration
                       </div>
                       <p className="text-sm text-slate-700 leading-relaxed">{result.dietPlan.snacks}</p>
                       <p className="text-xs text-teal-600 mt-1 italic">{result.dietPlan.hydration}</p>
                    </div>
                 </div>
              </div>

              {/* Specific Food Lists */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                 <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                     <div className="flex items-center gap-2 text-green-700 font-bold text-xs uppercase mb-2">
                        <Leaf className="w-3.5 h-3.5" /> Highly Recommended
                     </div>
                     <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                        {result.dietPlan.recommendedFoods.map((f, i) => <li key={i}>{f}</li>)}
                     </ul>
                 </div>
                 <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                     <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase mb-2">
                        <XCircle className="w-3.5 h-3.5" /> Foods to Avoid
                     </div>
                     <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                        {result.dietPlan.avoidFoods.map((f, i) => <li key={i}>{f}</li>)}
                     </ul>
                 </div>
              </div>
              
              {/* Non-Veg / Warning */}
              {result.dietPlan.nonVegRecommendation && (
                 <div className="mt-3 p-3 bg-slate-100 rounded-lg text-xs text-slate-600 border border-slate-200">
                    <span className="font-bold">Note on Meat/Fish:</span> {result.dietPlan.nonVegRecommendation}
                 </div>
              )}
           </div>
        )}

        {/* Lifestyle & Exercise */}
        {result.lifestylePlan && (
           <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-500" /> Activity & Sleep
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg col-span-2">
                      <div className="font-bold text-purple-800 text-sm mb-2">Recommended Exercises & Yoga</div>
                      <p className="text-sm text-slate-700 mb-2 font-medium">{result.lifestylePlan.yoga}</p>
                      <div className="flex flex-wrap gap-2">
                         {result.lifestylePlan.exercises.map((ex, i) => (
                            <span key={i} className="px-2 py-1 bg-white rounded border border-purple-200 text-xs text-purple-700">{ex}</span>
                         ))}
                      </div>
                  </div>
                  
                  <div className="space-y-3">
                     <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-center">
                        <div className="flex items-center justify-center gap-2 text-blue-700 font-bold text-xs uppercase mb-1">
                           <Moon className="w-3.5 h-3.5" /> Sleep
                        </div>
                        <div className="text-lg font-bold text-slate-800">{result.lifestylePlan.sleepDuration}</div>
                     </div>
                     <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                        <div className="text-slate-500 font-bold text-[10px] uppercase mb-1">Caloric Balance</div>
                        <div className="text-xs text-slate-700">{result.lifestylePlan.caloricGuidance}</div>
                     </div>
                  </div>
              </div>
           </div>
        )}

        {/* General Lifestyle Warnings */}
        {result.lifestyleWarnings && result.lifestyleWarnings.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> General Precautions
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.lifestyleWarnings.map((warn, idx) => (
                <li key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-700 text-sm flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
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