
import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

export interface TourStep {
  targetId: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface Props {
  steps: TourStep[];
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const TourOverlay: React.FC<Props> = ({ steps, isOpen, onComplete, onSkip }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Helper: Find the next index that has a visible element in the DOM
  const findValidStepIndex = useCallback((startIndex: number, direction: 1 | -1): number => {
    let index = startIndex;
    const maxLoops = steps.length;
    let loops = 0;

    while (index >= 0 && index < steps.length && loops < maxLoops) {
      const el = document.getElementById(steps[index].targetId);
      // Check if element exists and has dimensions (visible)
      if (el && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0) {
        return index;
      }
      index += direction;
      loops++;
    }
    return -1;
  }, [steps]);

  // Update rect for current step
  const updatePosition = useCallback(() => {
    if (currentStepIndex === -1) return;
    
    const step = steps[currentStepIndex];
    if (!step) return;

    const el = document.getElementById(step.targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      const padding = 8;
      
      // Ensure we're not getting a zero-rect which can happen during animations
      if (rect.width === 0 || rect.height === 0) return;

      setTargetRect({
        ...rect,
        left: rect.left - padding,
        top: rect.top - padding,
        width: rect.width + (padding * 2),
        height: rect.height + (padding * 2),
        bottom: rect.bottom + padding,
        right: rect.right + padding,
        x: rect.x - padding,
        y: rect.y - padding,
        toJSON: rect.toJSON
      });
      
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        // Lost the element (navigated away?), nullify
        setTargetRect(null);
    }
  }, [currentStepIndex, steps]);

  // Initial Open Logic
  useEffect(() => {
    if (isOpen) {
      const firstValid = findValidStepIndex(0, 1);
      if (firstValid !== -1) {
        setCurrentStepIndex(firstValid);
      } else {
        // No valid steps found at all
        onComplete(); 
      }
    }
  }, [isOpen]); // Run once on open

  // React to step changes or resize
  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [currentStepIndex, updatePosition]);

  const handleNext = () => {
    const nextIndex = findValidStepIndex(currentStepIndex + 1, 1);
    if (nextIndex !== -1) {
      setCurrentStepIndex(nextIndex);
    } else {
      onComplete(); // End of tour
    }
  };

  const handlePrev = () => {
    const prevIndex = findValidStepIndex(currentStepIndex - 1, -1);
    if (prevIndex !== -1) {
      setCurrentStepIndex(prevIndex);
    }
  };

  if (!isOpen || currentStepIndex === -1 || !targetRect) return null;

  const step = steps[currentStepIndex];
  
  // Check if there are any valid steps after this one
  const isLast = findValidStepIndex(currentStepIndex + 1, 1) === -1;
  const isFirst = findValidStepIndex(currentStepIndex - 1, -1) === -1;

  // Calculate Tooltip Position
  const getTooltipStyle = () => {
    const margin = 16;
    const tooltipWidth = 320; 
    
    let top = targetRect.bottom + margin;
    let left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);

    // Position overrides
    if (step.position === 'top') top = targetRect.top - margin - 200; 
    if (step.position === 'left') {
        left = targetRect.left - tooltipWidth - margin;
        top = targetRect.top;
    }
    if (step.position === 'right') {
        left = targetRect.right + margin;
        top = targetRect.top;
    }

    // Viewport Boundary checks
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // We are using fixed positioning for the overlay, so standard window dims apply
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth) left = window.innerWidth - tooltipWidth - 10;
    
    if (top < 10) top = 10;
    if (top > window.innerHeight - 150) {
        // Flip to top if bottom is crowded
        top = targetRect.top - 200; 
    }

    return { top, left };
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
        {/* Backdrop (Spotlight Effect) */}
        <div className="absolute inset-0 bg-slate-900/50 mix-blend-hard-light transition-opacity duration-500" />
        
        {/* Cutout / Spotlight */}
        <div 
            className="absolute transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] rounded-lg shadow-[0_0_0_9999px_rgba(15,23,42,0.8)] pointer-events-none"
            style={{
                top: targetRect.top,
                left: targetRect.left,
                width: targetRect.width,
                height: targetRect.height,
            }}
        />
        
        {/* Pulsing Highlight Border */}
        <div 
             className="absolute transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] rounded-lg border-2 border-teal-400 pointer-events-none animate-pulse shadow-[0_0_15px_rgba(45,212,191,0.5)]"
             style={{
                top: targetRect.top - 4,
                left: targetRect.left - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
            }}
        />

        {/* Tooltip Card */}
        <div 
            className="absolute bg-white p-5 rounded-xl shadow-2xl border border-slate-100 max-w-xs w-full transition-all duration-500 ease-out animate-in zoom-in-95 fade-in slide-in-from-bottom-2"
            style={getTooltipStyle()}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-teal-100 text-teal-700 rounded-full text-xs font-bold">
                        {currentStepIndex + 1}
                    </span>
                    <h3 className="font-bold text-slate-800">{step.title}</h3>
                </div>
                <button onClick={onSkip} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
            
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                {step.description}
            </p>

            <div className="flex items-center justify-between">
                <button 
                    onClick={handlePrev} 
                    disabled={isFirst}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex gap-1.5">
                    {steps.map((_, i) => (
                         // Simple dots indicating progress, unrelated to skipping
                        <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentStepIndex ? 'bg-teal-500' : 'bg-slate-200'}`} />
                    ))}
                </div>

                <button 
                    onClick={handleNext}
                    className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                    {isLast ? 'Finish' : 'Next'}
                    {isLast ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
            </div>
        </div>
    </div>
  );
};
