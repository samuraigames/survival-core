"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { motion } from 'framer-motion';

interface NavigationMinigameProps {
  open: boolean;
  onClose: (success: boolean) => void;
  difficulty: number;
}

const GAME_WIDTH = 500;
const GAME_HEIGHT = 300;
const SHIP_SIZE = 15;
const PATH_WIDTH = 30; // Narrower path

const NavigationMinigame: React.FC<NavigationMinigameProps> = ({ open, onClose, difficulty }) => {
  const [shipY, setShipY] = useState(GAME_HEIGHT / 2);
  const [path, setPath] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [isOffPath, setIsOffPath] = useState(false);
  const [gameOver, setGameOver] = useState<boolean | null>(null);
  
  const gameLoopRef = useRef<number>();
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const generatePath = useCallback(() => {
    const newPath = [];
    let y = GAME_HEIGHT / 2;
    const segments = 50;
    const pathComplexity = difficulty * 0.5;
    const pathVolatility = difficulty * 2;

    for (let i = 0; i < segments; i++) {
      const change = (Math.random() - 0.5) * pathVolatility;
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
      setIsOffPath(false);
      setGameOver(null);
      keysPressed.current = {};
    }
  }, [open, generatePath]);
  
  const gameLoop = useCallback(() => {
    if (gameOver !== null) {
      cancelAnimationFrame(gameLoopRef.current!);
      return;
    }

    // Update ship position
    setShipY(prevY => {
        const speed = 4;
        let newY = prevY;
        if(keysPressed.current['ArrowUp'] || keysPressed.current['w']) newY -= speed;
        if(keysPressed.current['ArrowDown'] || keysPressed.current['s']) newY += speed;
        return Math.max(0, Math.min(GAME_HEIGHT - SHIP_SIZE, newY));
    });

    // Update progress
    setProgress(p => {
        const newProgress = p + 0.2;
        if (newProgress >= 100) {
            setGameOver(true);
            setTimeout(() => onClose(true), 1000);
        }
        return newProgress;
    });
    
    // Check if off path
    const pathIndex = Math.floor(progress / (100 / path.length));
    const currentPathY = path[pathIndex];
    if (currentPathY) {
        const lowerBound = currentPathY - PATH_WIDTH / 2;
        const upperBound = currentPathY + PATH_WIDTH / 2;
        if (shipY < lowerBound || shipY > upperBound) {
            setIsOffPath(true);
            setGameOver(false);
            setTimeout(() => onClose(false), 1000);
        }
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameOver, onClose, path, progress, shipY]);

  useEffect(() => {
    if (open && gameOver === null) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if(gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    }
  }, [open, gameOver, gameLoop]);


  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keysPressed.current[e.key.toLowerCase()] = true;
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysPressed.current[e.key.toLowerCase()] = false;
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const pathD = path.map((y, i) => {
    const x = (i / (path.length - 1)) * GAME_WIDTH;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(false)}>
      <DialogContent className="max-w-xl bg-card border-accent text-foreground">
        <DialogHeader>
          <DialogTitle className="font-headline text-accent">Navigation Control</DialogTitle>
          <DialogDescription>Use UP/DOWN or W/S keys to stay on the designated course.</DialogDescription>
        </DialogHeader>
        <div className="relative overflow-hidden rounded-md border" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
            <div className="absolute inset-0 bg-black" />
            
            <svg width={GAME_WIDTH} height={GAME_HEIGHT} className="absolute inset-0">
                {path.length > 0 && <path d={pathD} stroke="hsl(var(--primary))" strokeWidth={PATH_WIDTH} fill="none" strokeLinejoin="round" strokeOpacity="0.5" />}
                {path.length > 0 && <path d={pathD} stroke="hsl(var(--accent))" strokeWidth="2" fill="none" strokeLinejoin="round" />}

                <motion.g initial={{ x: 50 }} animate={{ y: shipY }}>
                    <motion.path
                        d="M 0 -10 L 15 0 L 0 10 Z"
                        fill="hsl(var(--accent))"
                        className="drop-shadow-lg"
                    />
                </motion.g>
            </svg>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 w-full h-2 bg-muted">
                <motion.div className="h-full bg-accent" style={{ width: `${progress}%` }} />
            </div>

            {gameOver !== null && (
                 <motion.div
                 initial={{ opacity: 0, scale: 0.8 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm"
               >
                 <div className="text-center">
                   <h3 className={`text-3xl font-bold ${gameOver ? 'text-green-400' : 'text-red-400'}`}>
                     {gameOver ? 'Course Complete!' : 'Off Course!'}
                   </h3>
                   <p className="text-muted-foreground">{gameOver ? 'Navigation successful.' : 'Navigation failed.'}</p>
                 </div>
               </motion.div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NavigationMinigame;
