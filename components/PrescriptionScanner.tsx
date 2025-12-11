import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, XCircle, Aperture, X, Crop, Check, RotateCw, Plus, Trash2, ArrowRight, Globe, Sliders, Move, ZoomIn, ZoomOut } from 'lucide-react';
import { analyzePrescriptionImage, verifyMedicationSpelling, validateApiKey } from '../services/gemini';
import { Medication, PatientDetails } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

interface Props {
  onScanComplete: (meds: Medication[], patientDetails?: PatientDetails) => void;
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

type InteractionMode = 'create' | 'move' | 'resize';
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

interface InteractionState {
  mode: InteractionMode;
  handle?: ResizeHandle;
  startX: number;
  startY: number;
  startCrop: CropRegion | null;
}

export const PrescriptionScanner: React.FC<Props> = ({ onScanComplete }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [timer, setTimer] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // Multi-image state
  const [scannedImages, setScannedImages] = useState<ScannedImage[]>([]);
  
  // Review & Verify State
  const [reviewData, setReviewData] = useState<Partial<Medication>[]>([]);
  const [extractedPatientDetails, setExtractedPatientDetails] = useState<PatientDetails | undefined>(undefined);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Editor State
  const [editingImage, setEditingImage] = useState<string | null>(null); // Base64 of image being edited
  const [cropRegion, setCropRegion] = useState<CropRegion | null>(null);
  
  // Interaction State for Cropping
  const [interaction, setInteraction] = useState<InteractionState | null>(null);
  
  // Image Enhancement State
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [grayscale, setGrayscale] = useState(true);

  // Camera Zoom State
  const [zoom, setZoom] = useState(1);
  const [zoomCaps, setZoomCaps] = useState<{min: number, max: number, step: number} | null>(null);
  
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
        // Ensure IDs are preserved or added after verification
        const verifiedWithIds = verified.map((m, i) => ({
            ...m,
            id: reviewData[i]?.id || generateId()
        }));
        setReviewData(verifiedWithIds);
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
      // Request high resolution for better OCR
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 2560 }, 
          height: { ideal: 1440 }
        } 
      });
      
      // Check for Zoom Capabilities
      const track = stream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities && track.getCapabilities()) as any || {};
      
      if (capabilities.zoom) {
         const { min, max, step } = capabilities.zoom;
         setZoomCaps({ min, max, step });
         
         // Auto Zoom Logic: Default to 2x or 50% of max, whichever is smaller
         // This helps capture text on small bottles without getting too close (focus issues)
         let idealZoom = 2;
         if (idealZoom > max) idealZoom = max;
         if (idealZoom < min) idealZoom = min;
         
         try {
           await track.applyConstraints({ advanced: [{ zoom: idealZoom }] } as any);
           setZoom(idealZoom);
         } catch (e) {
           console.log("Auto-zoom not supported by device driver", e);
           setZoom(min);
         }
      } else {
         setZoomCaps(null);
         setZoom(1);
      }

      setIsCameraOpen(true);
      // Wait for render
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error(err);
      setError("Camera access denied. Please check your browser settings to allow camera access, or try using the 'Upload File' option instead.");
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

  const handleZoomChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value);
    setZoom(newZoom);
    
    if (videoRef.current && videoRef.current.srcObject) {
       const stream = videoRef.current.srcObject as MediaStream;
       const track = stream.getVideoTracks()[0];
       try {
          await track.applyConstraints({ advanced: [{ zoom: newZoom }] } as any);
       } catch (err) {
          console.error("Zoom failed", err);
       }
    }
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
    // Initialize crop region to 80% of center after image loads
    // For now null, user can draw
    setCropRegion(null); 
    setBrightness(80);
    setContrast(125);
    setGrayscale(true);
  };

  const handleRotate = () => {
    if (!editingImage) return;

    const img = new Image();
    img.src = editingImage;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(90 * Math.PI / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        
        const rotatedBase64 = canvas.toDataURL('image/jpeg');
        setEditingImage(rotatedBase64);
        setCropRegion(null); 
      }
    };
  };

  // --- PRO CROPPING LOGIC ---

  const getClientCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
  };

  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    
    // Check if we clicked a handle
    const target = e.target as HTMLElement;
    const handle = target.getAttribute('data-handle') as ResizeHandle | null;
    
    const rect = containerRef.current.getBoundingClientRect();
    const client = getClientCoordinates(e);
    const x = client.x - rect.left;
    const y = client.y - rect.top;

    if (handle && cropRegion) {
      // RESIZE MODE
      e.stopPropagation();
      if ('touches' in e) e.preventDefault();
      setInteraction({
        mode: 'resize',
        handle,
        startX: x,
        startY: y,
        startCrop: { ...cropRegion }
      });
      return;
    }

    // Check if inside crop rect for MOVE
    if (cropRegion && 
        x >= cropRegion.x && x <= cropRegion.x + cropRegion.width &&
        y >= cropRegion.y && y <= cropRegion.y + cropRegion.height) {
      // MOVE MODE
      if ('touches' in e) e.preventDefault();
      setInteraction({
        mode: 'move',
        startX: x,
        startY: y,
        startCrop: { ...cropRegion }
      });
      return;
    }

    // CREATE MODE
    if ('touches' in e) e.preventDefault();
    setInteraction({
        mode: 'create',
        startX: x,
        startY: y,
        startCrop: null
    });
    setCropRegion({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!interaction || !containerRef.current) return;
    if ('touches' in e) e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    const client = getClientCoordinates(e);
    const currentX = clamp(client.x - rect.left, 0, rect.width);
    const currentY = clamp(client.y - rect.top, 0, rect.height);
    
    const deltaX = currentX - interaction.startX;
    const deltaY = currentY - interaction.startY;

    if (interaction.mode === 'move' && interaction.startCrop) {
        // Calculate new position strictly clamped to bounds
        const newX = clamp(interaction.startCrop.x + deltaX, 0, rect.width - interaction.startCrop.width);
        const newY = clamp(interaction.startCrop.y + deltaY, 0, rect.height - interaction.startCrop.height);
        
        setCropRegion({
            ...interaction.startCrop,
            x: newX,
            y: newY
        });
    } 
    else if (interaction.mode === 'create') {
        const x = Math.min(currentX, interaction.startX);
        const y = Math.min(currentY, interaction.startY);
        const width = Math.abs(currentX - interaction.startX);
        const height = Math.abs(currentY - interaction.startY);
        
        setCropRegion({ x, y, width, height });
    }
    else if (interaction.mode === 'resize' && interaction.startCrop && interaction.handle) {
        const s = interaction.startCrop;
        let { x, y, width, height } = s;

        // Calculate deltas based on handle
        switch (interaction.handle) {
            case 'e':
                width = clamp(s.width + deltaX, 10, rect.width - s.x);
                break;
            case 'w':
                const maxDeltaW = s.x + s.width; // Max we can move left is to 0
                const safeDeltaW = Math.max(deltaX, -s.x);
                // If we move left, x decreases, width increases
                // If we move right, x increases, width decreases
                // But we must limit width > 10
                
                // Simpler: Calculate new left edge
                const newLeft = clamp(s.x + deltaX, 0, s.x + s.width - 10);
                width = s.width + (s.x - newLeft);
                x = newLeft;
                break;
            case 's':
                height = clamp(s.height + deltaY, 10, rect.height - s.y);
                break;
            case 'n':
                const newTop = clamp(s.y + deltaY, 0, s.y + s.height - 10);
                height = s.height + (s.y - newTop);
                y = newTop;
                break;
            case 'se':
                width = clamp(s.width + deltaX, 10, rect.width - s.x);
                height = clamp(s.height + deltaY, 10, rect.height - s.y);
                break;
            case 'sw':
                const newL = clamp(s.x + deltaX, 0, s.x + s.width - 10);
                width = s.width + (s.x - newL);
                x = newL;
                height = clamp(s.height + deltaY, 10, rect.height - s.y);
                break;
            case 'ne':
                width = clamp(s.width + deltaX, 10, rect.width - s.x);
                const newT = clamp(s.y + deltaY, 0, s.y + s.height - 10);
                height = s.height + (s.y - newT);
                y = newT;
                break;
            case 'nw':
                const nL = clamp(s.x + deltaX, 0, s.x + s.width - 10);
                width = s.width + (s.x - nL);
                x = nL;
                const nT = clamp(s.y + deltaY, 0, s.y + s.height - 10);
                height = s.height + (s.y - nT);
                y = nT;
                break;
        }

        setCropRegion({ x, y, width, height });
    }
  };

  const handleMouseUp = () => {
    setInteraction(null);
  };

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
      const grayVal = grayscale ? 'grayscale(100%)' : 'grayscale(0%)';
      ctx.filter = `${grayVal} contrast(${contrast}%) brightness(${brightness}%)`;

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
      const result = await Promise.race([
        analyzePrescriptionImage(scannedImages.map(img => ({ base64: img.base64, mimeType: img.mimeType }))),
        timeoutPromise
      ]) as { medications: Partial<Medication>[], patientDetails: PatientDetails };
      
      const extractedMeds = result.medications;
      const extractedDetails = result.patientDetails;

      if (!extractedMeds || extractedMeds.length === 0) {
        throw new Error("No medications found. Please try a clearer image.");
      }
      
      // Inject IDs for React Keys
      const medsWithIds = extractedMeds.map(m => ({
          ...m,
          id: generateId()
      }));

      setReviewData(medsWithIds);
      setExtractedPatientDetails(extractedDetails);
      setIsVerifying(true);
      setScannedImages([]);
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
    const newMeds: Medication[] = reviewData.map(m => ({
        id: generateId(), // New ID for final storage
        name: m.name || 'Unknown',
        dosage: m.dosage || 'As prescribed',
        frequency: m.frequency || 'As directed',
        duration: m.duration,
        instructions: m.instructions,
        prescriber: m.prescriber,
        source: 'ocr',
        dateAdded: Date.now()
    }));
    
    onScanComplete(newMeds, extractedPatientDetails);
    setReviewData([]);
    setExtractedPatientDetails(undefined);
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

  const getEditorImageStyle = () => {
    return {
        filter: `brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale ? 100 : 0}%)`
    };
  };

  // --- RENDER ---

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
                        Verifying Spelling with WEB Search...
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
                    <div key={med.id || idx} className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg relative group hover:border-teal-200 transition-colors">
                         <div className="flex-1 space-y-2">
                             <div className="flex gap-2">
                                <input 
                                    className="flex-1 p-2 border border-slate-300 rounded text-sm font-bold text-slate-900 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
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
                                    className="flex-1 p-2 border border-slate-300 rounded text-xs text-slate-900 bg-white"
                                    value={med.dosage || ''}
                                    placeholder="Dosage"
                                    onChange={(e) => handleUpdateReviewItem(idx, 'dosage', e.target.value)}
                                />
                                <input 
                                    className="flex-1 p-2 border border-slate-300 rounded text-xs text-slate-900 bg-white"
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
                    onClick={() => setReviewData([...reviewData, { name: '', id: generateId() }])}
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
         <div className="w-full flex flex-col items-center p-2 relative bg-slate-50 rounded-lg border border-slate-200">
             <div className="text-sm text-slate-500 mb-2 flex items-center justify-between w-full px-4">
               <span className="flex items-center gap-2 font-medium"><Crop className="w-4 h-4 text-teal-600" /> Drag to Crop</span>
               <div className="flex gap-4">
                 <span className="flex items-center gap-1.5"><Move className="w-3.5 h-3.5" /> Move</span>
                 <span className="flex items-center gap-1.5"><RotateCw className="w-3.5 h-3.5" /> Rotate</span>
               </div>
             </div>
             
             {/* PRO EDITOR CANVAS */}
             <div className="relative w-full overflow-hidden bg-black/5 rounded-md flex justify-center py-4 select-none">
               <div 
                 ref={containerRef}
                 className="relative inline-block select-none touch-none shadow-xl"
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
                    alt="Edit target"
                    style={getEditorImageStyle()}
                    className="max-w-full max-h-[500px] block pointer-events-none select-none"
                    draggable={false}
                  />

                  {/* PRO CROP OVERLAY */}
                  {cropRegion && (
                    <>
                      {/* Dark Overlay Outside Selection */}
                      <div 
                        className="absolute pointer-events-none"
                        style={{
                           inset: 0,
                           boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.6)` // Dim outside
                        }}
                      />
                      
                      {/* Crop Box */}
                      <div 
                        className="absolute border border-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.5)] cursor-move"
                        style={{
                          left: cropRegion.x,
                          top: cropRegion.y,
                          width: cropRegion.width,
                          height: cropRegion.height,
                          zIndex: 10
                        }}
                      >
                         {/* Rule of Thirds Grid */}
                         <div className="absolute inset-0 flex flex-col pointer-events-none opacity-40">
                            <div className="flex-1 border-b border-white/50"></div>
                            <div className="flex-1 border-b border-white/50"></div>
                            <div className="flex-1"></div>
                         </div>
                         <div className="absolute inset-0 flex pointer-events-none opacity-40">
                            <div className="flex-1 border-r border-white/50"></div>
                            <div className="flex-1 border-r border-white/50"></div>
                            <div className="flex-1"></div>
                         </div>

                         {/* Resize Handles */}
                         {/* Corners */}
                         <div data-handle="nw" className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-slate-400 cursor-nw-resize z-20"></div>
                         <div data-handle="ne" className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-slate-400 cursor-ne-resize z-20"></div>
                         <div data-handle="sw" className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-slate-400 cursor-sw-resize z-20"></div>
                         <div data-handle="se" className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-slate-400 cursor-se-resize z-20"></div>
                         
                         {/* Sides */}
                         <div data-handle="n" className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-slate-400 cursor-n-resize z-20"></div>
                         <div data-handle="s" className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-slate-400 cursor-s-resize z-20"></div>
                         <div data-handle="w" className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-white border border-slate-400 cursor-w-resize z-20"></div>
                         <div data-handle="e" className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white border border-slate-400 cursor-e-resize z-20"></div>
                      </div>
                    </>
                  )}
               </div>
             </div>

             <div className="w-full p-4 mt-2 bg-white rounded-lg border border-slate-100 space-y-4">
                <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
                   <Sliders className="w-4 h-4" />
                   Enhance Image
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400">
                         <span>Brightness</span>
                         <span>{brightness}%</span>
                      </div>
                      <input 
                         type="range" 
                         min="50" max="150" step="5"
                         value={brightness}
                         onChange={(e) => setBrightness(Number(e.target.value))}
                         className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                      />
                   </div>
                   
                   <div className="space-y-1">
                      <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400">
                         <span>Contrast</span>
                         <span>{contrast}%</span>
                      </div>
                      <input 
                         type="range" 
                         min="50" max="200" step="5"
                         value={contrast}
                         onChange={(e) => setContrast(Number(e.target.value))}
                         className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                      />
                   </div>
                </div>

                <div className="flex gap-3">
                   <button 
                      onClick={() => setGrayscale(!grayscale)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-bold border transition-colors flex items-center justify-center gap-2
                         ${grayscale ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                   >
                      {grayscale ? <Check className="w-3 h-3" /> : <div className="w-3 h-3" />}
                      B&W Mode
                   </button>
                   <button 
                      onClick={handleRotate}
                      className="flex-1 py-1.5 rounded-md text-xs font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2"
                   >
                      <RotateCw className="w-3 h-3" /> Rotate 90°
                   </button>
                </div>
             </div>

             <div className="flex w-full gap-3 mt-4">
               <button 
                 onClick={() => setEditingImage(null)}
                 className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium shadow-sm"
               >
                 <X className="w-4 h-4" /> Cancel
               </button>
               <button 
                 onClick={handleDoneEditing}
                 className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium shadow-md"
               >
                 <Check className="w-4 h-4" /> Done
               </button>
             </div>
         </div>
      ) : isCameraOpen ? (
          <div className="relative w-full flex flex-col items-center bg-black rounded-lg overflow-hidden h-[400px]">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className="w-full h-full object-cover"
            />
            
            {/* ZOOM CONTROLS OVERLAY */}
            {zoomCaps && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-64 bg-black/60 backdrop-blur-md p-2 rounded-full flex items-center gap-3 border border-white/10 z-20 animate-in fade-in slide-in-from-bottom-2">
                   <ZoomOut className="w-4 h-4 text-white/80" />
                   <input 
                      type="range" 
                      min={zoomCaps.min} 
                      max={zoomCaps.max} 
                      step={zoomCaps.step} 
                      value={zoom}
                      onChange={handleZoomChange}
                      className="flex-1 h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-teal-500"
                   />
                   <ZoomIn className="w-4 h-4 text-white/80" />
                   <span className="text-xs text-teal-400 font-bold font-mono w-8 text-right">{zoom.toFixed(1)}x</span>
                </div>
            )}
            
            <div className="absolute bottom-6 flex gap-6 z-10 items-center">
              <button onClick={stopCamera} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
              <button onClick={handleCapture} className="p-4 bg-white text-teal-600 rounded-full shadow-lg border-4 border-teal-600/30 hover:scale-105 active:scale-95 transition-all">
                <Aperture className="w-8 h-8" />
              </button>
            </div>
          </div>
      ) : (
          <div className="flex flex-col gap-6" id="scanner-action-area">
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
                        type="button"
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