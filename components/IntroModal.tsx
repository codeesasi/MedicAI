import React from 'react';
import { ShieldCheck, Camera, MessageSquare, ArrowRight, HeartPulse, CheckCircle2 } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

const FeatureRow = ({ icon, title, description, color }: { icon: React.ReactNode, title: string, description: string, color: string }) => (
    <div className="flex items-start gap-4">
        <div className={`p-3 ${color} rounded-xl flex-shrink-0 mt-0.5`}>
            {icon}
        </div>
        <div>
            <h3 className="font-bold text-slate-800 text-base">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed mt-0.5">{description}</p>
        </div>
    </div>
);

export const IntroModal: React.FC<Props> = ({ onComplete }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        
        {/* Header Section */}
        <div className="bg-gradient-to-br from-teal-600 to-teal-800 p-8 text-white text-center relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-black/10 to-transparent"></div>
            
            <div className="relative z-10">
                <div className="mx-auto w-16 h-16 bg-white/20 rounded-2xl rotate-3 flex items-center justify-center backdrop-blur-md mb-5 shadow-inner border border-white/20">
                   <HeartPulse className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold mb-2 tracking-tight">MedScript AI</h1>
                <p className="text-teal-100 text-sm font-medium">Your Personal Medication Safety Assistant</p>
            </div>
        </div>
        
        {/* Content Section */}
        <div className="p-8 space-y-8">
            <div className="space-y-6">
                <FeatureRow 
                    icon={<Camera className="w-5 h-5 text-teal-600" />}
                    title="Scan Prescriptions"
                    description="Instantly digitize handwritten notes using advanced Gemini Vision AI."
                    color="bg-teal-50"
                />
                
                <FeatureRow 
                    icon={<ShieldCheck className="w-5 h-5 text-indigo-600" />}
                    title="Safety & Interaction Check"
                    description="Get real-time warnings about drug interactions and suitability."
                    color="bg-indigo-50"
                />

                <FeatureRow 
                    icon={<MessageSquare className="w-5 h-5 text-rose-600" />}
                    title="Diet & Lifestyle Plans"
                    description="Receive personalized food and exercise advice based on your location."
                    color="bg-rose-50"
                />
            </div>

            <button 
                onClick={onComplete}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 group"
            >
                Start Your Journey <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
        
        <div className="bg-slate-50 p-3 text-center border-t border-slate-100">
             <p className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Secure & Private. Data stays on your device.
             </p>
        </div>
      </div>
    </div>
  );
};