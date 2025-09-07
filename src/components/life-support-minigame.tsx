"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';

interface LifeSupportMinigameProps {
  open: boolean;
  onClose: (success: boolean) => void;
  difficulty: number;
}

const CLICKS_TO_WIN = 15;
const TIME_LIMIT_MS = 5000;

const LifeSupportMinigame: React.FC<LifeSupportMinigameProps> = ({ open, onClose, difficulty }) => {
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_MS);
  const [isComplete, setIsComplete] = useState<boolean | null>(null);

  const timerRef = useRef<NodeJS.Timeout>();

  const timeLimit = TIME_LIMIT_MS - (difficulty * 200);

  const resetGame = useCallback(() => {
    setClicks(0);
    setTimeLeft(timeLimit);
    setIsComplete(null);
  }, [timeLimit]);

  useEffect(() => {
    if (open) {
      resetGame();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [open, resetGame]);

  useEffect(() => {
    if (open && isComplete === null) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 100;
          if (newTime <= 0) {
            clearInterval(timerRef.current!);
            setIsComplete(false);
            setTimeout(() => onClose(false), 1500);
            return 0;
          }
          return newTime;
        });
      }, 100);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, isComplete, onClose]);

  const handleClick = () => {
    if (isComplete !== null) return;

    setClicks(prev => {
      const newClicks = prev + 1;
      if (newClicks >= CLICKS_TO_WIN) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsComplete(true);
        setTimeout(() => onClose(true), 1500);
        return CLICKS_TO_WIN;
      }
      return newClicks;
    });
  };
  
  const progressPercentage = (clicks / CLICKS_TO_WIN) * 100;
  const timePercentage = (timeLeft / timeLimit) * 100;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(isComplete ?? false); }}>
      <DialogContent className="max-w-md bg-card border-accent text-foreground">
        <DialogHeader>
          <DialogTitle className="font-headline text-accent">Life Support Calibration</DialogTitle>
          <DialogDescription>Atmospheric regulators are offline! Rapidly press the button to re-calibrate the system before oxygen levels become critical.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-full text-center">
                <p className="font-mono text-xl">{`Calibration Progress: ${Math.floor(progressPercentage)}%`}</p>
                <Progress value={progressPercentage} className="h-4 my-2" />
            </div>

            <Button 
                onClick={handleClick}
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
