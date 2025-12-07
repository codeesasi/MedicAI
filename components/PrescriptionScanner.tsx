
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, XCircle, Aperture, X, Crop, Check } from 'lucide-react';
import { analyzePrescriptionImage, validateApiKey } from '../services/gemini';
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

export const PrescriptionScanner: React.FC<Props> = ({ onMedicationsFound }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [timer, setTimer] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // Cropping State
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [cropRegion, setCropRegion] = useState<CropRegion | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  
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
        // 1 - e^(-0.5 * t) approaches 1. 
        // We multiply by 95 to cap at 95%.
        const computedProgress = (1 - Math.exp(-0.3 * elapsed)) * 95;
        setProgress(computedProgress);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

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
    setTempImage(base64); // Go to crop mode
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
      setTempImage(base64); // Go to crop mode
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

  // --- Cropping Logic ---

  const getClientCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    // Only prevent default on touch to stop scrolling
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

    // Constrain to container
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

  const confirmCrop = () => {
    if (!tempImage || !imageRef.current) return;

    const canvas = document.createElement('canvas');
    const image = imageRef.current;
    
    // Default to full image if no crop selection
    let sx = 0, sy = 0, sWidth = image.naturalWidth, sHeight = image.naturalHeight;

    if (cropRegion && cropRegion.width > 10 && cropRegion.height > 10) {
       // Calculate scale factor (natural size vs displayed size)
       const scaleX = image.naturalWidth / image.width;
       const scaleY = image.naturalHeight / image.height;
       
       sx = cropRegion.x * scaleX;
       sy = cropRegion.y * scaleY;
       sWidth = cropRegion.width * scaleX;
       sHeight = cropRegion.height * scaleY;
    }

    // Resize for AI optimization (Max dimension 1024px)
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
      // Draw the cropped (and resized) area
      ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, dWidth, dHeight);
      const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.85); // Use JPEG 85% for efficiency
      processImage(optimizedBase64);
    }
  };

  // --- Processing Logic ---

  const processImage = async (base64Data: string) => {
    setTempImage(null); // Clear cropper UI
    setCropRegion(null);
    setIsAnalyzing(true);
    setError(null);

    // 30s Timeout Protection
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Request timed out. Please try a clearer image.")), 30000)
    );

    try {
      // Extract clean base64 and mime type
      const mimeTypeMatch = base64Data.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      
      // Race between API and Timeout
      const extractedMeds = await Promise.race([
        analyzePrescriptionImage(cleanBase64, mimeType),
        timeoutPromise
      ]) as Partial<Medication>[];
      
      if (!extractedMeds || extractedMeds.length === 0) {
        throw new Error("No medications found. Please try a clearer image.");
      }
      
      const newMeds: Medication[] = extractedMeds.map(m => ({
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

      // Finish Progress
      setProgress(100);
      setTimeout(() => onMedicationsFound(newMeds), 500); // Slight delay to show 100%
      
    } catch (err: any) {
      console.error("Processing error:", err);
      let message = "Analysis failed. Please try a clearer image.";
      if (err.message) message = err.message;
      setError(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Camera className="w-5 h-5 text-teal-600" />
        Scan Prescription
      </h2>
      
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 relative overflow-hidden transition-colors min-h-[300px]">
        
        {isAnalyzing ? (
          <div className="text-center p-8 w-full flex flex-col items-center justify-center h-[300px]">
            {/* Timer */}
            <div className="text-5xl font-bold text-red-600 mb-6 font-mono tracking-tight">
              {timer.toFixed(1)}s
            </div>
            
            {/* Progress Bar */}
            <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden mb-4 relative">
               <div 
                 className="h-full bg-orange-500 rounded-full transition-all duration-300 ease-out"
                 style={{ width: `${progress}%` }} 
               />
            </div>
            
            <p className="text-slate-600 font-medium">Extracting Text...</p>
            <p className="text-xs text-slate-400 mt-1">Using Gemini 2.5 Flash</p>
          </div>
        ) : isCameraOpen ? (
          <div className="relative w-full h-full flex flex-col items-center bg-black">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-[300px] object-cover"
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
        ) : tempImage ? (
          <div className="w-full flex flex-col items-center p-2 relative">
             <div className="text-sm text-slate-500 mb-2 flex items-center gap-2">
               <Crop className="w-4 h-4" />
               Drag to select the prescription area
             </div>
             
             <div 
               ref={containerRef}
               className="relative cursor-crosshair select-none touch-none max-h-[400px]"
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
                 src={tempImage} 
                 alt="Crop target" 
                 className="max-w-full max-h-[400px] object-contain block select-none pointer-events-none"
               />
               
               {/* Selection Overlay */}
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

             <div className="flex gap-3 mt-4">
               <button 
                 onClick={() => { setTempImage(null); setCropRegion(null); }}
                 className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-600 text-sm font-medium"
               >
                 <X className="w-4 h-4" />
                 Cancel
               </button>
               <button 
                 onClick={confirmCrop}
                 className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium shadow-md"
               >
                 <Check className="w-4 h-4" />
                 {cropRegion && cropRegion.width > 0 ? "Crop & Analyze" : "Analyze Full Image"}
               </button>
             </div>
          </div>
        ) : (
          <div className="text-center space-y-4 p-8 w-full">
            <div className="flex flex-col sm:flex-row justify-center gap-3">
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
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Supported formats: PNG, JPG, WEBP. <br/>
              Ensure text is legible for best accuracy.
            </p>
          </div>
        )}
        
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>

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
