
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from './ui/button';

interface NavigationMinigameProps {
  open: boolean;
  onClose: (success: boolean, manualClose: boolean) => void;
  difficulty: number;
  isMobileMode: boolean;
}

const GAME_WIDTH = 500;
const GAME_HEIGHT = 300;
const SHIP_SIZE = 15;
const PATH_WIDTH = 40; // Wider path for easier gameplay
const PATH_LENGTH = 1000; // Longer path for continuous scrolling

const NavigationMinigame: React.FC<NavigationMinigameProps> = ({ open, onClose, difficulty, isMobileMode }) => {
  const [shipY, setShipY] = useState(GAME_HEIGHT / 2);
  const [path, setPath] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [gameOver, setGameOver] = useState<boolean | null>(null);
  const [pathYOffset, setPathYOffset] = useState(0); // For vertical path shifting
  const [isClosing, setIsClosing] = useState(false);
  
  const gameLoopRef = useRef<number>();
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const lastShiftTimeRef = useRef(0);
  const touchState = useRef<'up' | 'down' | null>(null);

  const handleClose = useCallback((success: boolean, manual: boolean) => {
    if (isClosing) return;
    setIsClosing(true);
    if(gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    onClose(success, manual);
  }, [isClosing, onClose]);

  const generatePath = useCallback(() => {
    const newPath = [];
    let y = GAME_HEIGHT / 2;
    const pathVolatility = 10 + difficulty * 2;

    for (let i = 0; i < PATH_LENGTH; i++) {
      const change = (Math.random() - 0.5) * pathVolatility * 0.1;
      y += change;
      y = Math.max(PATH_WIDTH, Math.min(GAME_HEIGHT - PATH_WIDTH, y));
      newPath.push(y);
    }
    return newPath;
  }, [difficulty]);
  
  useEffect(() => {
    if (open) {
      setPath(generatePath());
      setShipY(GAME_HEIGHT / 2);
      setProgress(0);
      setGameOver(null);
      setPathYOffset(0);
      setIsClosing(false);
      lastShiftTimeRef.current = Date.now();
      keysPressed.current = {};
      touchState.current = null;
    } else {
        if(gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    }
  }, [open, generatePath]);
  
  const gameLoop = useCallback(() => {
    if (gameOver !== null) {
      if(gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      return;
    }

    // Update ship position
    setShipY(prevY => {
        const speed = 3;
        let newY = prevY;
        if (!isMobileMode) {
          if(keysPressed.current['w'] || keysPressed.current['arrowup']) newY -= speed;
          if(keysPressed.current['s'] || keysPressed.current['arrowdown']) newY += speed;
        } else {
          if (touchState.current === 'up') newY -= speed;
          if (touchState.current === 'down') newY += speed;
        }
        return Math.max(0, Math.min(GAME_HEIGHT - SHIP_SIZE, newY));
    });

    // Update progress
    const progressSpeed = 0.8 + (difficulty / 20); // Faster progress with difficulty
    setProgress(p => {
        const newProgress = p + progressSpeed;
        if (newProgress >= PATH_LENGTH) {
            setGameOver(true);
            setTimeout(() => handleClose(true, false), 1000);
        }
        return newProgress;
    });

    // Randomly shift path vertically
    const now = Date.now();
    const shiftCooldown = Math.max(200, 1000 - difficulty * 80); // Quicker shifts with higher difficulty
    if (now - lastShiftTimeRef.current > shiftCooldown) {
      const shiftAmount = (Math.random() - 0.5) * (10 + difficulty * 4);
      setPathYOffset(offset => Math.max(-GAME_HEIGHT / 3, Math.min(GAME_HEIGHT / 3, offset + shiftAmount)));
      lastShiftTimeRef.current = now;
    }
    
    // Check if off path
    const pathIndex = Math.floor(progress);
    if (path[pathIndex]) {
        const currentPathY = path[pathIndex] + pathYOffset;
        const lowerBound = currentPathY - PATH_WIDTH / 2;
        const upperBound = currentPathY + PATH_WIDTH / 2;
        if (shipY < lowerBound || shipY > upperBound) {
            setGameOver(false);
            setTimeout(() => handleClose(false, false), 1000);
        }
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameOver, handleClose, path, progress, shipY, pathYOffset, difficulty, isMobileMode]);

  useEffect(() => {
    if (open && gameOver === null) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if(gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    }
  }, [open, gameOver, gameLoop]);


  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isMobileMode) return;
    const key = e.key.toLowerCase();
    // Only prevent default for game-specific keys
    if (['w', 's', 'arrowup', 'arrowdown'].includes(key)) {
      e.preventDefault();
    }
    keysPressed.current[key] = true;
  }, [isMobileMode]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (isMobileMode) return;
    const key = e.key.toLowerCase();
    keysPressed.current[key] = false;
  }, [isMobileMode]);

  useEffect(() => {
    if(open && !isMobileMode) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [open, handleKeyDown, handleKeyUp, isMobileMode]);

  // Create a viewable segment of the path
  const viewablePath = path.slice(Math.floor(progress), Math.floor(progress) + Math.ceil(GAME_WIDTH / 5) + 2);
  const pathD = viewablePath.map((y, i) => {
    const x = i * 5; // Draw path segments
    return `${i === 0 ? 'M' : 'L'} ${x} ${y + pathYOffset}`;
  }).join(' ');
  

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(gameOver ?? false, true); }}>
      <DialogContent className="max-w-xl bg-card border-accent text-foreground">
        <DialogHeader>
          <DialogTitle className="font-headline text-accent">Navigation Correction</DialogTitle>
          <DialogDescription>
            {isMobileMode 
                ? "The course is unstable! Use the on-screen buttons to stay within the quantum tunnel."
                : "The course is unstable! Use W/S or Arrow Keys to stay within the quantum tunnel."
            }
          </DialogDescription>
        </DialogHeader>
        <div className="relative overflow-hidden rounded-md border" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
            <div className="absolute inset-0 bg-black" />
            
             <motion.svg width={GAME_WIDTH} height={GAME_HEIGHT} className="absolute inset-0">
                {path.length > 0 && <path d={pathD} stroke="hsl(var(--primary))" strokeWidth={PATH_WIDTH} fill="none" strokeLinejoin="round" strokeOpacity="0.5" />}
                {path.length > 0 && <path d={pathD} stroke="hsl(var(--accent))" strokeWidth="2" fill="none" strokeLinejoin="round" />}
            </motion.svg>

            <svg width={GAME_WIDTH} height={GAME_HEIGHT} className="absolute inset-0">
                <motion.g initial={{ x: 50 }} animate={{ y: shipY }}>
                    <motion.path
                        d="M 0 -10 L 15 0 L 0 10 Z"
                        fill="hsl(var(--accent))"
                        className="drop-shadow-lg"
                    />
                </motion.g>
            </svg>

            {/* Mobile Controls */}
            {isMobileMode && (
                <div className="absolute inset-y-0 right-4 flex flex-col justify-center gap-4 z-10">
                    <Button
                        size="icon"
                        className="w-16 h-16 rounded-full bg-accent/70 text-accent-foreground backdrop-blur-sm"
                        onPointerDown={() => touchState.current = 'up'}
                        onPointerUp={() => touchState.current = null}
                        onPointerLeave={() => touchState.current = null}
                    >
                        <ArrowUp className="w-8 h-8" />
                    </Button>
                    <Button
                        size="icon"
                        className="w-16 h-16 rounded-full bg-accent/70 text-accent-foreground backdrop-blur-sm"
                        onPointerDown={() => touchState.current = 'down'}
                        onPointerUp={() => touchState.current = null}
                        onPointerLeave={() => touchState.current = null}
                    >
                        <ArrowDown className="w-8 h-8" />
                    </Button>
                </div>
            )}

            {/* Progress Bar */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-4/5 h-2 bg-muted rounded-full">
                <motion.div className="h-full bg-accent rounded-full" style={{ width: `${(progress / PATH_LENGTH) * 100}%` }} />
            </div>

            {gameOver !== null && (
                 <motion.div
                 initial={{ opacity: 0, scale: 0.8 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm"
               >
                 <div className="text-center">
                   <h3 className={`text-3xl font-bold ${gameOver ? 'text-green-400' : 'text-red-400'}`}>
                     {gameOver ? 'Course Stabilized!' : 'Hull Breach!'}
                   </h3>
                   <p className="text-muted-foreground">{gameOver ? 'Navigation successful.' : 'We are off course!'}</p>
                 </div>
               </motion.div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NavigationMinigame;
