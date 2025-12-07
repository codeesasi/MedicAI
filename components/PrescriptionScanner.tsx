import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, XCircle, Aperture, X, Crop, Check, RotateCw, Plus, Trash2, ArrowRight, Wand2, Sun, FileText, ScanLine, Search, Globe, Loader2 } from 'lucide-react';
import { analyzePrescriptionImage, verifyMedicationSpelling, validateApiKey } from '../services/gemini';
import { Medication } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

interface Props {
  onMedicationsFound: (meds: Medication[]) => void;
}

interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ScannedImage {
  id: string;
  base64: string; // Clean base64 data
  mimeType: string;
}

type FilterMode = 'original' | 'clear' | 'bold';

export const PrescriptionScanner: React.FC<Props> = ({ onMedicationsFound }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [timer, setTimer] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // Multi-image state
  const [scannedImages, setScannedImages] = useState<ScannedImage[]>([]);
  
  // Review & Verify State
  const [reviewData, setReviewData] = useState<Partial<Medication>[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Editor State
  const [editingImage, setEditingImage] = useState<string | null>(null); // Base64 of image being edited
  const [cropRegion, setCropRegion] = useState<CropRegion | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [filterMode, setFilterMode] = useState<FilterMode>('clear'); // Default to Clear
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Timer & Progress Effect
  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      setTimer(0);
      setProgress(0);
      
      const startTime = Date.now();
      
      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setTimer(elapsed);
        
        // Asymptotic progress: Fast at first, slows down, never hits 100% until done
        const computedProgress = (1 - Math.exp(-0.3 * elapsed)) * 95;
        setProgress(computedProgress);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Auto-verify effect when entering review mode
  useEffect(() => {
    if (isVerifying && reviewData.length > 0) {
       performVerification();
    }
  }, [isVerifying]);

  const performVerification = async () => {
    console.log("Triggering verification for", reviewData);
    try {
        const verified = await verifyMedicationSpelling(reviewData);
        setReviewData(verified);
    } catch (e) {
        console.error("Verification failed, keeping original", e);
    } finally {
        setIsVerifying(false);
    }
  };

  const startCamera = async () => {
    setError(null);
    if (!validateApiKey()) {
      setError("System Error: API Key is missing.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setIsCameraOpen(true);
      // Wait for render
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error(err);
      setError("Camera access denied. Please allow camera permissions or upload a file.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoRef.current, 0, 0);
    const base64 = canvas.toDataURL('image/png');
    
    stopCamera();
    startEditing(base64);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateApiKey()) {
      setError("System Error: API Key is missing.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const base64 = await convertToBase64(file);
      startEditing(base64);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError("Failed to read the file. Please try another image.");
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const startEditing = (base64: string) => {
    setEditingImage(base64);
    setCropRegion(null);
    setFilterMode('clear'); // Reset to default "Clear" mode
  };

  // --- Filter Logic ---
  const cycleFilter = () => {
    if (filterMode === 'original') setFilterMode('clear');
    else if (filterMode === 'clear') setFilterMode('bold');
    else setFilterMode('original');
  };

  const getFilterClass = () => {
    switch (filterMode) {
      case 'clear': return 'grayscale contrast-[1.25] brightness-110';
      case 'bold': return 'grayscale contrast-[1.75] brightness-105';
      default: return '';
    }
  };

  const getFilterLabel = () => {
    switch (filterMode) {
      case 'clear': return 'Clear Text';
      case 'bold': return 'Bold Ink';
      default: return 'Original';
    }
  };

  const getFilterIcon = () => {
    switch (filterMode) {
      case 'clear': return <FileText className="w-4 h-4" />;
      case 'bold': return <ScanLine className="w-4 h-4" />;
      default: return <Sun className="w-4 h-4" />;
    }
  };

  // --- Editing Logic (Rotate) ---
  const handleRotate = () => {
    if (!editingImage) return;

    const img = new Image();
    img.src = editingImage;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Swap dimensions for 90 degree rotate
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(90 * Math.PI / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        
        const rotatedBase64 = canvas.toDataURL('image/jpeg');
        setEditingImage(rotatedBase64);
        setCropRegion(null); // Reset crop on rotate
      }
    };
  };

  // --- Cropping Interaction ---
  const getClientCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    if ('touches' in e) e.preventDefault(); 
    
    const rect = containerRef.current.getBoundingClientRect();
    const client = getClientCoordinates(e);
    
    const x = client.x - rect.left;
    const y = client.y - rect.top;

    setIsDragging(true);
    setStartPos({ x, y });
    setCropRegion({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    if ('touches' in e) e.preventDefault();
    
    const rect = containerRef.current.getBoundingClientRect();
    const client = getClientCoordinates(e);
    const currentX = client.x - rect.left;
    const currentY = client.y - rect.top;

    const width = Math.abs(currentX - startPos.x);
    const height = Math.abs(currentY - startPos.y);
    const x = Math.min(currentX, startPos.x);
    const y = Math.min(currentY, startPos.y);

    const maxWidth = rect.width - x;
    const maxHeight = rect.height - y;

    setCropRegion({ 
      x: Math.max(0, x), 
      y: Math.max(0, y), 
      width: Math.min(width, maxWidth), 
      height: Math.min(height, maxHeight) 
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // --- Finish Editing ---
  const handleDoneEditing = () => {
    if (!editingImage || !imageRef.current) return;

    const canvas = document.createElement('canvas');
    const image = imageRef.current;
    
    let sx = 0, sy = 0, sWidth = image.naturalWidth, sHeight = image.naturalHeight;

    if (cropRegion && cropRegion.width > 10 && cropRegion.height > 10) {
       const scaleX = image.naturalWidth / image.width;
       const scaleY = image.naturalHeight / image.height;
       
       sx = cropRegion.x * scaleX;
       sy = cropRegion.y * scaleY;
       sWidth = cropRegion.width * scaleX;
       sHeight = cropRegion.height * scaleY;
    }

    // Resize (Max 1024px)
    const MAX_DIMENSION = 1024;
    let dWidth = sWidth;
    let dHeight = sHeight;

    if (dWidth > MAX_DIMENSION || dHeight > MAX_DIMENSION) {
      const ratio = Math.min(MAX_DIMENSION / dWidth, MAX_DIMENSION / dHeight);
      dWidth = dWidth * ratio;
      dHeight = dHeight * ratio;
    }

    canvas.width = dWidth;
    canvas.height = dHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      if (filterMode === 'clear') {
         ctx.filter = 'grayscale(100%) contrast(125%) brightness(110%)';
      } else if (filterMode === 'bold') {
         ctx.filter = 'grayscale(100%) contrast(175%) brightness(105%)';
      } else {
         ctx.filter = 'none';
      }

      ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, dWidth, dHeight);
      ctx.filter = 'none';

      const finalBase64 = canvas.toDataURL('image/jpeg', 0.85);
      const mimeTypeMatch = finalBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
      const cleanData = finalBase64.includes(',') ? finalBase64.split(',')[1] : finalBase64;

      setScannedImages(prev => [...prev, { id: generateId(), base64: cleanData, mimeType }]);
      setEditingImage(null);
    }
  };

  const handleRemoveImage = (id: string) => {
    setScannedImages(prev => prev.filter(img => img.id !== id));
  };

  // --- API Analysis ---
  const handleAnalyzeAll = async () => {
    if (scannedImages.length === 0) return;

    setIsAnalyzing(true);
    setError(null);

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Request timed out. Please try fewer or clearer images.")), 30000)
    );

    try {
      const extractedMeds = await Promise.race([
        analyzePrescriptionImage(scannedImages.map(img => ({ base64: img.base64, mimeType: img.mimeType }))),
        timeoutPromise
      ]) as Partial<Medication>[];
      
      if (!extractedMeds || extractedMeds.length === 0) {
        throw new Error("No medications found. Please try a clearer image.");
      }
      
      // Move to Review Stage
      setReviewData(extractedMeds);
      setIsVerifying(true); // Trigger auto-verification
      setScannedImages([]); // Clear images
      setProgress(100);

    } catch (err: any) {
      console.error("Processing error:", err);
      let message = "Analysis failed.";
      if (err.message) message = err.message;
      setError(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmReview = () => {
    // Finalize meds
    const newMeds: Medication[] = reviewData.map(m => ({
        id: generateId(),
        name: m.name || 'Unknown',
        dosage: m.dosage || 'As prescribed',
        frequency: m.frequency || 'As directed',
        duration: m.duration,
        instructions: m.instructions,
        prescriber: m.prescriber,
        source: 'ocr',
        dateAdded: Date.now()
    }));
    
    onMedicationsFound(newMeds);
    setReviewData([]); // Reset
  };

  const handleDeleteReviewItem = (index: number) => {
    const newData = [...reviewData];
    newData.splice(index, 1);
    setReviewData(newData);
  };

  const handleUpdateReviewItem = (index: number, field: keyof Medication, value: string) => {
    const newData = [...reviewData];
    newData[index] = { ...newData[index], [field]: value };
    setReviewData(newData);
  };

  // --- RENDER ---

  // REVIEW MODE
  if (reviewData.length > 0) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                    <Check className="w-5 h-5 text-teal-600" />
                    Verify Extracted Data
                </h2>
                {isVerifying ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold animate-pulse">
                        <Globe className="w-3 h-3 animate-spin" />
                        Verifying Spelling with Gemini 3 Pro...
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold">
                        <Check className="w-3 h-3" />
                        Spelling Verified
                    </div>
                )}
            </div>

            <div className="space-y-4 mb-6">
                {reviewData.map((med, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg relative group hover:border-teal-200 transition-colors">
                         <div className="flex-1 space-y-2">
                             <div className="flex gap-2">
                                <input 
                                    className="flex-1 p-2 border border-slate-300 rounded text-sm font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                    value={med.name || ''}
                                    placeholder="Medication Name"
                                    onChange={(e) => handleUpdateReviewItem(idx, 'name', e.target.value)}
                                />
                                <button 
                                    onClick={() => handleDeleteReviewItem(idx)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                             <div className="flex gap-2">
                                <input 
                                    className="flex-1 p-2 border border-slate-300 rounded text-xs text-slate-600"
                                    value={med.dosage || ''}
                                    placeholder="Dosage"
                                    onChange={(e) => handleUpdateReviewItem(idx, 'dosage', e.target.value)}
                                />
                                <input 
                                    className="flex-1 p-2 border border-slate-300 rounded text-xs text-slate-600"
                                    value={med.frequency || ''}
                                    placeholder="Frequency"
                                    onChange={(e) => handleUpdateReviewItem(idx, 'frequency', e.target.value)}
                                />
                             </div>
                         </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                    onClick={() => setReviewData([...reviewData, { name: '' }])}
                    className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm"
                >
                    <Plus className="w-4 h-4" /> Add Another
                </button>
                <button 
                    onClick={handleConfirmReview}
                    disabled={isVerifying}
                    className={`flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg font-bold shadow-md hover:bg-teal-700 active:scale-95 transition-all
                        ${isVerifying ? 'opacity-70 cursor-wait' : ''}`}
                >
                    Confirm & Add to Cabinet <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Camera className="w-5 h-5 text-teal-600" />
        Scan Prescription
      </h2>
      
      {isAnalyzing ? (
         // LOADING STATE
         <div className="text-center p-8 w-full flex flex-col items-center justify-center min-h-[300px] bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
            <div className="text-5xl font-bold text-red-600 mb-6 font-mono tracking-tight">
              {timer.toFixed(1)}s
            </div>
            <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden mb-4 relative">
               <div 
                 className="h-full bg-orange-500 rounded-full transition-all duration-300 ease-out"
                 style={{ width: `${progress}%` }} 
               />
            </div>
            <p className="text-slate-600 font-medium">Processing {scannedImages.length} Image{scannedImages.length > 1 ? 's' : ''}...</p>
            <p className="text-xs text-slate-400 mt-1">Using Gemini 2.5 Flash</p>
         </div>
      ) : editingImage ? (
         // EDITOR STATE
         <div className="w-full flex flex-col items-center p-2 relative bg-slate-50 rounded-lg border border-slate-200">
             <div className="text-sm text-slate-500 mb-2 flex items-center justify-between w-full px-4">
               <span className="flex items-center gap-2"><Crop className="w-4 h-4" /> Drag to Crop</span>
               <span className="flex items-center gap-2"><RotateCw className="w-4 h-4" /> Rotate to adjust</span>
             </div>
             
             <div 
               ref={containerRef}
               className="relative cursor-crosshair select-none touch-none max-h-[400px] overflow-hidden bg-black/5 rounded-md"
               onMouseDown={handleMouseDown}
               onMouseMove={handleMouseMove}
               onMouseUp={handleMouseUp}
               onMouseLeave={handleMouseUp}
               onTouchStart={handleMouseDown}
               onTouchMove={handleMouseMove}
               onTouchEnd={handleMouseUp}
             >
               <img 
                 ref={imageRef}
                 src={editingImage} 
                 alt="Crop target" 
                 className={`max-w-full max-h-[400px] object-contain block select-none pointer-events-none transition-all duration-300 ${getFilterClass()}`}
               />
               
               {cropRegion && (
                 <div 
                   className="absolute border-2 border-teal-500 bg-teal-500/20 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                   style={{
                     left: cropRegion.x,
                     top: cropRegion.y,
                     width: cropRegion.width,
                     height: cropRegion.height,
                   }}
                 />
               )}
             </div>

             <div className="flex flex-wrap gap-3 mt-4 justify-center">
               <button 
                 onClick={handleRotate}
                 className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium shadow-sm"
               >
                 <RotateCw className="w-4 h-4" /> Rotate
               </button>
               
               <button 
                 onClick={cycleFilter}
                 className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium shadow-sm transition-colors min-w-[140px] justify-center
                    ${filterMode !== 'original' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-300 text-slate-700'}`}
               >
                 {getFilterIcon()}
                 {getFilterLabel()}
               </button>

               <button 
                 onClick={() => setEditingImage(null)}
                 className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium shadow-sm"
               >
                 <X className="w-4 h-4" /> Cancel
               </button>
               <button 
                 onClick={handleDoneEditing}
                 className="flex items-center gap-2 px-6 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium shadow-md"
               >
                 <Check className="w-4 h-4" /> Done
               </button>
             </div>
         </div>
      ) : isCameraOpen ? (
          // CAMERA STATE
          <div className="relative w-full flex flex-col items-center bg-black rounded-lg overflow-hidden h-[300px]">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 flex gap-4 z-10">
              <button onClick={stopCamera} className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white">
                <X className="w-6 h-6" />
              </button>
              <button onClick={handleCapture} className="p-3 bg-white text-teal-600 rounded-full shadow-lg border-4 border-teal-600/30 hover:scale-105 transition-all">
                <Aperture className="w-8 h-8" />
              </button>
            </div>
          </div>
      ) : (
          // MAIN STATE (List or Initial)
          <div className="flex flex-col gap-6">
             {scannedImages.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                   {scannedImages.map((img, idx) => (
                      <div key={img.id} className="relative aspect-square rounded-lg border border-slate-200 overflow-hidden group">
                          <img src={`data:${img.mimeType};base64,${img.base64}`} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                          <button 
                            onClick={() => handleRemoveImage(img.id)}
                            className="absolute top-1 right-1 p-1 bg-white/80 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                          >
                             <X className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5">
                             Page {idx + 1}
                          </div>
                      </div>
                   ))}
                   {scannedImages.length < 5 && (
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-400 hover:bg-teal-50 transition-colors"
                      >
                         <Plus className="w-6 h-6 mb-1" />
                         <span className="text-xs font-medium">Add</span>
                      </button>
                   )}
                </div>
             )}

             {scannedImages.length === 0 ? (
                // Initial Big Buttons
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 min-h-[300px] p-8 gap-4">
                    <div className="flex flex-col sm:flex-row justify-center gap-3 w-full">
                      <button 
                        onClick={startCamera}
                        className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-lg font-medium transition-all shadow-md active:scale-95 w-full sm:w-auto"
                      >
                        <Camera className="w-5 h-5" />
                        Take Photo
                      </button>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-5 py-3 rounded-lg font-medium transition-all shadow-sm active:scale-95 w-full sm:w-auto"
                      >
                        <Upload className="w-5 h-5" />
                        Upload File
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">Supported: PNG, JPG, WEBP</p>
                </div>
             ) : (
                // Actions for list
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                    <button 
                      onClick={startCamera}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                    >
                       <Camera className="w-4 h-4" /> Add Page from Camera
                    </button>
                    <button 
                      onClick={handleAnalyzeAll}
                      className="flex-[2] flex items-center justify-center gap-2 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold shadow-md active:scale-95"
                    >
                       Analyze {scannedImages.length} Image{scannedImages.length > 1 ? 's' : ''} <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
             )}
          </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center justify-between gap-2 text-sm animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};