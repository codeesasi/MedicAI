import React, { useState } from 'react';
import { Camera, ShieldCheck, MessageSquare, ArrowRight, ArrowLeft, X, CheckCircle } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

const STEPS = [
  {
    id: 'scan',
    title: "Instant Digitization",
    headline: "Scan & Recognize",
    description: "Transform physical prescription bottles into digital records instantly using advanced AI vision. Just point and capture.",
    icon: <Camera className="w-8 h-8 text-white" />,
    gradient: "from-teal-400 to-teal-600",
    shadow: "shadow-teal-500/30",
    bgPattern: "radial-gradient(circle at top right, rgba(20, 184, 166, 0.1), transparent 70%)"
  },
  {
    id: 'safety',
    title: "AI Safety Guard",
    headline: "Analyze Interactions",
    description: "Your personal pharmacist that never sleeps. We cross-reference medications with your vitals to detect dangerous interactions.",
    icon: <ShieldCheck className="w-8 h-8 text-white" />,
    gradient: "from-indigo-500 to-violet-600",
    shadow: "shadow-indigo-500/30",
    bgPattern: "radial-gradient(circle at top left, rgba(99, 102, 241, 0.1), transparent 70%)"
  },
  {
    id: 'wellness',
    title: "Holistic Health",
    headline: "Lifestyle & Diet",
    description: "Get personalized diet plans and lifestyle recommendations based on your medication profile and local environment.",
    icon: <MessageSquare className="w-8 h-8 text-white" />,
    gradient: "from-rose-400 to-orange-500",
    shadow: "shadow-rose-500/30",
    bgPattern: "radial-gradient(circle at bottom right, rgba(244, 63, 94, 0.1), transparent 70%)"
  }
];

export const IntroModal: React.FC<Props> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsExiting(true);
    setTimeout(onComplete, 400); // Match animation duration
  };

  const step = STEPS[currentStep];

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-500 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
      
      {/* Main Card */}
      <div className={`bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative transition-all duration-500 ${isExiting ? 'scale-95 translate-y-4 opacity-0' : 'scale-100 translate-y-0 opacity-100'}`}>
        
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 transition-all duration-700 ease-in-out" style={{ background: step.bgPattern }}></div>
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none transform translate-x-1/3 -translate-y-1/3">
             <div className={`w-64 h-64 rounded-full bg-gradient-to-br ${step.gradient} blur-3xl transition-all duration-700`}></div>
        </div>

        {/* Header Controls */}
        <div className="absolute top-0 w-full p-6 flex justify-between items-center z-20">
             <div className="flex gap-1.5">
                {STEPS.map((_, idx) => (
                    <div 
                        key={idx} 
                        className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentStep ? 'w-8 bg-slate-800' : 'w-2 bg-slate-200'}`}
                    />
                ))}
             </div>
             <button 
                onClick={handleComplete}
                className="text-slate-400 hover:text-slate-800 transition-colors p-2 hover:bg-slate-100 rounded-full"
             >
                <X className="w-5 h-5" />
             </button>
        </div>

        {/* Content Section */}
        <div className="relative z-10 flex flex-col h-[520px]">
            
            {/* Image/Icon Area */}
            <div className="flex-1 flex items-center justify-center pt-12">
                <div className="relative group cursor-default">
                    {/* Animated Rings */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} rounded-3xl blur-xl opacity-40 animate-pulse`}></div>
                    
                    {/* Main Icon Card */}
                    <div className={`relative w-32 h-32 bg-gradient-to-br ${step.gradient} rounded-3xl shadow-2xl ${step.shadow} flex items-center justify-center transform transition-all duration-500 rotate-3 group-hover:rotate-0 group-hover:scale-105`}>
                         <div className="absolute inset-0 bg-white/10 rounded-3xl border border-white/20"></div>
                         {/* Icon Transition Wrapper */}
                         <div key={currentStep} className="animate-in zoom-in-50 duration-500">
                             {step.icon}
                         </div>
                    </div>

                    {/* Floating Badge */}
                    <div className="absolute -bottom-4 -right-4 bg-white py-2 px-4 rounded-full shadow-lg border border-slate-100 flex items-center gap-2 animate-bounce [animation-duration:3s]">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">{step.title}</span>
                    </div>
                </div>
            </div>

            {/* Text Area */}
            <div className="px-8 pb-8 pt-4">
                <div key={currentStep} className="animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <h3 className={`text-xs font-bold bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent uppercase tracking-wider mb-2`}>
                        Step {currentStep + 1} of {STEPS.length}
                    </h3>
                    <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
                        {step.headline}
                    </h2>
                    <p className="text-slate-500 leading-relaxed text-base min-h-[80px]">
                        {step.description}
                    </p>
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-4 mt-8">
                    {currentStep > 0 && (
                        <button 
                            onClick={handleBack}
                            className="p-4 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    
                    <button 
                        onClick={handleNext}
                        className={`flex-1 py-4 px-6 rounded-2xl font-bold text-white shadow-xl shadow-slate-200 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 bg-gradient-to-r ${step.gradient}`}
                    >
                        <span>{currentStep === STEPS.length - 1 ? 'Get Started Now' : 'Continue'}</span>
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};