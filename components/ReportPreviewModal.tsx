
import React, { useEffect, useState, useRef } from 'react';
import { X, Download, Loader2, FileText, CheckCircle } from 'lucide-react';
import { AnalysisResult, PatientDetails, Medication } from '../types';
import { generateMedicalIllustration } from '../services/gemini';

interface Props {
  result: AnalysisResult;
  patientDetails: PatientDetails;
  medications: Medication[];
  onClose: () => void;
}

// A4 Dimensions in pixels at 96 DPI
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

export const ReportPreviewModal: React.FC<Props> = ({ result, patientDetails, medications, onClose }) => {
  const [loadingImages, setLoadingImages] = useState(true);
  const [images, setImages] = useState({
    cover: '',
    diet: '',
    lifestyle: ''
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const fetchImages = async () => {
      try {
        // Parallel fetch with simplified prompts for better success rate
        const [cover, diet, lifestyle] = await Promise.all([
          generateMedicalIllustration("blue and teal geometric shield abstract vector icon"),
          generateMedicalIllustration("minimalist healthy food bowl vector icon flat design"),
          generateMedicalIllustration("abstract peaceful figure vector icon flat design teal color")
        ]);

        if (mounted) {
          setImages({ cover, diet, lifestyle });
        }
      } catch (e) {
        console.error("Failed to load report images", e);
      } finally {
        if (mounted) setLoadingImages(false);
      }
    };

    fetchImages();

    return () => { mounted = false; };
  }, []);

  const handleDownload = () => {
    if (!reportRef.current || !(window as any).html2pdf) {
      alert("PDF generation library not ready. Please try again.");
      return;
    }

    setIsDownloading(true);

    // 1. Clone the node
    const originalElement = reportRef.current;
    const clone = originalElement.cloneNode(true) as HTMLElement;

    // 2. Container setup to enforce A4 width context
    // FIX: Use fixed positioning with negative Z-index instead of negative left coordinate
    // This ensures elements are within the viewport render tree for html2canvas
    const container = document.createElement('div');
    container.style.position = 'fixed'; 
    container.style.top = '0';
    container.style.left = '0';
    container.style.zIndex = '-9999';
    container.style.width = `${A4_WIDTH_PX}px`;
    container.style.background = 'white';
    
    // 3. Style the clone for print
    clone.style.width = `${A4_WIDTH_PX}px`; // Enforce exact A4 width
    clone.style.maxWidth = `${A4_WIDTH_PX}px`;
    clone.style.height = 'auto'; // Dynamic height
    clone.style.minHeight = `${A4_HEIGHT_PX}px`;
    clone.style.margin = '0';
    clone.style.padding = '40px'; // Consistent padding
    clone.style.transform = 'none';
    clone.style.boxShadow = 'none';
    clone.style.background = 'white';
    clone.style.overflow = 'visible'; // Ensure content isn't clipped
    
    container.appendChild(clone);
    document.body.appendChild(container);

    // 4. Configure html2pdf with Pixel Perfect settings
    const opt = {
      margin: 0,
      filename: `MedScript_Report_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, // 2x scale for crisp text (will be downscaled by PDF viewer)
        useCORS: true, 
        scrollY: 0,
        windowWidth: A4_WIDTH_PX, // Match container exactly
        backgroundColor: '#ffffff', // Ensure background is white
      },
      // Use 'px' unit and exact dimensions to prevent alignment shift
      jsPDF: { 
        unit: 'px', 
        format: [A4_WIDTH_PX, A4_HEIGHT_PX], 
        orientation: 'portrait',
        hotfixes: ['px_scaling'] 
      },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    // 5. Generate
    (window as any).html2pdf()
      .set(opt)
      .from(clone)
      .save()
      .then(() => {
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
        setIsDownloading(false);
      })
      .catch((err: any) => {
        console.error("PDF Gen Error:", err);
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
        setIsDownloading(false);
      });
  };

  const getDetail = (key: string) => patientDetails.find(p => p.key.toLowerCase().includes(key))?.value || 'N/A';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm overflow-hidden p-4">
      <div className="bg-white w-full max-w-6xl h-[95vh] rounded-2xl flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Header Toolbar */}
        <div className="bg-slate-50 p-4 flex justify-between items-center border-b border-slate-200 flex-none z-20">
            <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5 text-teal-600" />
                    Report Preview
                </h3>
                <p className="text-xs text-slate-500">Review your generated report before downloading.</p>
            </div>
            
            <div className="flex gap-3">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors font-medium text-sm"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleDownload}
                    disabled={isDownloading || loadingImages}
                    className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold shadow-lg shadow-teal-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isDownloading ? 'Generating PDF...' : 'Download Report'}
                </button>
            </div>
        </div>

        {/* Preview Container */}
        <div className="flex-1 overflow-y-auto bg-slate-200/50 flex justify-center p-8 relative">
            
            {/* Scale Wrapper for Screen Preview */}
            <div className="relative origin-top transform scale-[0.6] sm:scale-[0.8] xl:scale-100 transition-transform duration-300">
                
                {/* A4 PAPER CONTAINER */}
                <div 
                    ref={reportRef}
                    className="bg-white shadow-2xl mx-auto flex flex-col"
                    style={{ 
                        width: `${A4_WIDTH_PX}px`,
                        minHeight: `${A4_HEIGHT_PX}px`,
                        padding: '40px' 
                    }}
                >
                    {/* --- HEADER --- */}
                    <div className="border-b-4 border-teal-600 pb-6 mb-8 flex justify-between items-start break-inside-avoid">
                        <div className="max-w-[70%]">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="w-6 h-6 text-teal-600" />
                                <span className="font-bold text-slate-400 tracking-widest text-xs uppercase">MedScript AI</span>
                            </div>
                            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                                Health Safety<br/>Report
                            </h1>
                            <p className="text-slate-500 mt-2 font-medium">Comprehensive Interaction & Lifestyle Analysis</p>
                            <p className="text-slate-400 text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        <div className="w-32 h-32 flex-shrink-0">
                            {images.cover ? (
                                <img src={images.cover} alt="Cover" className="w-full h-full object-contain" />
                            ) : (
                                <div className="w-full h-full bg-slate-50 rounded-full flex items-center justify-center border-2 border-dashed border-slate-200">
                                    <FileText className="w-10 h-10 text-slate-300" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- PATIENT VITALS --- */}
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 mb-8 break-inside-avoid">
                        <h2 className="text-sm font-bold text-teal-700 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Patient Profile</h2>
                        <div className="grid grid-cols-4 gap-6">
                            <div>
                                <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Age</span>
                                <span className="text-xl font-bold text-slate-800">{getDetail('age')}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Weight</span>
                                <span className="text-xl font-bold text-slate-800">{getDetail('weight')}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1">BP</span>
                                <span className="text-xl font-bold text-slate-800">{getDetail('pressure')}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Medications</span>
                                <span className="text-xl font-bold text-slate-800">{medications.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* --- SAFETY ANALYSIS --- */}
                    <div className="mb-8 break-inside-avoid">
                        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                            <span className="w-1.5 h-8 bg-indigo-600 rounded-full"></span>
                            Clinical Safety Summary
                        </h2>
                        
                        <div className="text-slate-700 leading-relaxed text-justify mb-6 font-medium">
                            {result.summary}
                        </div>

                        {result.interactions.length > 0 ? (
                            <div className="space-y-3">
                                <h3 className="font-bold text-red-700 text-xs uppercase tracking-wider">Critical Interactions Detected</h3>
                                {result.interactions.map((inter, i) => (
                                    <div key={i} className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-sm text-red-900 break-inside-avoid shadow-sm">
                                        <div className="flex gap-2 font-bold mb-1">
                                            <span className="px-1.5 py-0.5 bg-red-200 text-red-800 text-[10px] rounded uppercase">{inter.severity}</span>
                                            {inter.medicationsInvolved.join(' + ')}
                                        </div>
                                        <p>{inter.description}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 bg-green-50 border border-green-100 rounded-lg text-green-800 text-sm flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                No significant drug interactions detected.
                            </div>
                        )}
                    </div>

                    {/* --- DIET & LIFESTYLE (Split Columns) --- */}
                    <div className="grid grid-cols-2 gap-8 break-inside-avoid">
                        
                        {/* Column 1: Diet */}
                        <div className="break-inside-avoid">
                            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                                <h2 className="text-lg font-bold text-slate-900">Nutrition</h2>
                                <div className="w-12 h-12 flex-shrink-0">
                                   {images.diet && <img src={images.diet} className="w-full h-full rounded-full object-cover border-2 border-white shadow-sm" alt="Diet" />}
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400 break-inside-avoid">
                                    <h4 className="font-bold text-[10px] uppercase text-orange-800 mb-1">Breakfast</h4>
                                    <p className="text-xs text-slate-700">{result.dietPlan.breakfast}</p>
                                </div>
                                <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400 break-inside-avoid">
                                    <h4 className="font-bold text-[10px] uppercase text-orange-800 mb-1">Lunch & Dinner</h4>
                                    <p className="text-xs text-slate-700">{result.dietPlan.lunch}</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div className="bg-green-50 p-2 rounded border border-green-100 break-inside-avoid">
                                        <h4 className="font-bold text-[10px] text-green-800 uppercase mb-1">Eat More</h4>
                                        <ul className="text-[10px] list-disc list-inside text-slate-600">
                                            {result.dietPlan.recommendedFoods.slice(0,3).map((f,i)=><li key={i}>{f}</li>)}
                                        </ul>
                                    </div>
                                    <div className="bg-red-50 p-2 rounded border border-red-100 break-inside-avoid">
                                        <h4 className="font-bold text-[10px] text-red-800 uppercase mb-1">Avoid</h4>
                                        <ul className="text-[10px] list-disc list-inside text-slate-600">
                                            {result.dietPlan.avoidFoods.slice(0,3).map((f,i)=><li key={i}>{f}</li>)}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Column 2: Lifestyle */}
                        <div className="break-inside-avoid">
                            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                                <h2 className="text-lg font-bold text-slate-900">Lifestyle</h2>
                                <div className="w-12 h-12 flex-shrink-0">
                                    {images.lifestyle && <img src={images.lifestyle} className="w-full h-full rounded-full object-cover border-2 border-white shadow-sm" alt="Lifestyle" />}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400 break-inside-avoid">
                                    <h4 className="font-bold text-[10px] uppercase text-purple-800 mb-1">Activity Plan</h4>
                                    <p className="text-xs text-slate-700">{result.lifestylePlan.yoga}</p>
                                </div>

                                <div className="flex gap-3">
                                    <div className="flex-1 p-3 border border-slate-200 rounded-lg text-center break-inside-avoid">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Sleep</div>
                                        <div className="text-sm font-bold text-slate-800 mt-1">{result.lifestylePlan.sleepDuration}</div>
                                    </div>
                                    <div className="flex-1 p-3 border border-slate-200 rounded-lg text-center break-inside-avoid">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Hydration</div>
                                        <div className="text-sm font-bold text-slate-800 mt-1">{result.dietPlan.hydration ? result.dietPlan.hydration.split(' ')[0] : 'N/A'}</div>
                                    </div>
                                </div>

                                {result.lifestyleWarnings.length > 0 && (
                                    <div className="bg-slate-50 p-3 rounded text-xs text-slate-600 italic border border-slate-200 break-inside-avoid">
                                        <span className="font-bold not-italic text-slate-800">Note: </span>
                                        {result.lifestyleWarnings[0]}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- FOOTER --- */}
                    <div className="mt-auto pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 break-inside-avoid">
                        <div>
                            <p className="font-bold text-slate-500">MedScript AI Assistance</p>
                            <p>Not a substitute for professional medical advice.</p>
                        </div>
                        <div className="text-right">
                            <p>MedScript Report</p>
                            <p>ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>

        {/* Loading Overlay */}
        {loadingImages && (
            <div className="absolute inset-0 bg-white/90 z-30 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in duration-300">
                <div className="relative mb-4">
                    <div className="w-16 h-16 border-4 border-slate-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                    <Loader2 className="absolute inset-0 m-auto w-6 h-6 text-teal-600 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-1">Preparing Report</h3>
                <p className="text-slate-500 text-sm">Generating custom medical visuals...</p>
            </div>
        )}
      </div>
    </div>
  );
};
