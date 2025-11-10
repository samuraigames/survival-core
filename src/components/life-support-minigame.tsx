
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';

interface LifeSupportMinigameProps {
  open: boolean;
  onClose: (success: boolean, manualClose: boolean) => void;
  difficulty: number;
}

const HOLD_DURATION_MS = 2500; // Time required to hold the button
const TIME_LIMIT_MS = 8000; // Overall time limit for the minigame

const LifeSupportMinigame: React.FC<LifeSupportMinigameProps> = ({ open, onClose, difficulty }) => {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_MS);
  const [isComplete, setIsComplete] = useState<boolean | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const overallTimerRef = useRef<NodeJS.Timeout>();
  const progressIntervalRef = useRef<NodeJS.Timeout>();

  const timeLimit = TIME_LIMIT_MS - (difficulty * 300);
  const holdDuration = HOLD_DURATION_MS - (difficulty * 100);

  const handleClose = useCallback((success: boolean, manual: boolean) => {
      if (isClosing) return;
      setIsClosing(true);
      if (overallTimerRef.current) clearInterval(overallTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      onClose(success, manual);
  }, [isClosing, onClose]);

  const resetGame = useCallback(() => {
    setProgress(0);
    setTimeLeft(timeLimit);
    setIsComplete(null);
    setIsClosing(false);
  }, [timeLimit]);

  // Handle game reset when dialog opens/closes
  useEffect(() => {
    if (open) {
      resetGame();
    } else {
      if (overallTimerRef.current) clearInterval(overallTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
  }, [open, resetGame]);

  // Main timer for the minigame
  useEffect(() => {
    if (open && isComplete === null) {
      overallTimerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 100;
          if (newTime <= 0) {
            clearInterval(overallTimerRef.current!);
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            setIsComplete(false);
            setTimeout(() => handleClose(false, false), 1500);
            return 0;
          }
          return newTime;
        });
      }, 100);
    }
    return () => {
      if (overallTimerRef.current) clearInterval(overallTimerRef.current);
    };
  }, [open, isComplete, handleClose]);
  
  // Handle progress state changes
  useEffect(() => {
    if (progress >= 100 && isComplete === null) {
      if (overallTimerRef.current) clearInterval(overallTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setIsComplete(true);
      setTimeout(() => handleClose(true, false), 1500);
    }
  }, [progress, isComplete, handleClose]);

  const handleMouseDown = () => {
    if (isComplete !== null) return;
    
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    
    progressIntervalRef.current = setInterval(() => {
      setProgress(p => p + (100 / (holdDuration / 100))); // Increment to reach 100 in `holdDuration`
    }, 100);
  };
  
  const handleMouseUp = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  };

  const progressPercentage = Math.min(100, progress);
  const timePercentage = (timeLeft / timeLimit) * 100;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(isComplete ?? false, true); }}>
      <DialogContent className="max-w-md bg-card border-accent text-foreground">
        <DialogHeader>
          <DialogTitle className="font-headline text-accent">Life Support Calibration</DialogTitle>
          <DialogDescription>Atmospheric regulators are offline! Press and HOLD the button to re-calibrate the system before oxygen levels become critical.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-full text-center">
                <p className="font-mono text-xl">{`Calibration Progress: ${Math.floor(progressPercentage)}%`}</p>
                <Progress value={progressPercentage} className="h-4 my-2" />
            </div>

            <Button 
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchEnd={handleMouseUp}
                onMouseLeave={handleMouseUp} // Stop if mouse leaves button area while pressed
                disabled={isComplete !== null}
                className="w-40 h-20 text-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg transform active:scale-95 transition-transform"
            >
                Calibrate
            </Button>
            
            <div className="w-full text-center mt-2">
                 <p className="font-mono text-sm text-muted-foreground">Time Remaining</p>
                 <Progress value={timePercentage} className="h-2 mt-1 bg-destructive/30 [&>*]:bg-destructive" />
            </div>
            
            {isComplete !== null && (
                 <motion.div
                 initial={{ opacity: 0, scale: 0.8 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm"
               >
                 <div className="text-center">
                   <h3 className={`text-3xl font-bold ${isComplete ? 'text-green-400' : 'text-red-400'}`}>
                     {isComplete ? 'System Calibrated!' : 'Calibration Failed!'}
                   </h3>
                   <p className="text-muted-foreground">{isComplete ? 'Atmosphere is stable.' : 'Critical systems offline.'}</p>
                 </div>
               </motion.div>
            )}

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LifeSupportMinigame;
