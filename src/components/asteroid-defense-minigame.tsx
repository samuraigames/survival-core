"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

interface AsteroidDefenseMinigameProps {
  open: boolean;
  onClose: (success: boolean) => void;
  difficulty: number;
}

const GAME_WIDTH = 500;
const GAME_HEIGHT = 400;
const SHIP_HEIGHT = 50;

const Asteroid = ({ x, y, onExplode }: { x: number, y: number, onExplode: () => void }) => (
  <motion.div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: 20,
      height: 20,
      backgroundColor: 'gray',
      borderRadius: '50%',
    }}
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    exit={{ scale: 0, transition: { duration: 0.2 } }}
    onTap={onExplode}
  >
    <div className="w-full h-full bg-slate-500 rounded-full border-2 border-slate-400 animate-pulse"></div>
  </motion.div>
);


const AsteroidDefenseMinigame: React.FC<AsteroidDefenseMinigameProps> = ({ open, onClose, difficulty }) => {
  const [asteroids, setAsteroids] = useState<{ id: number; x: number; y: number; speed: number }[]>([]);
  const [hits, setHits] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const gameLoopRef = useRef<number>();
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const spawnAsteroid = useCallback(() => {
    const speed = 1 + (difficulty / 10) * 2;
    setAsteroids(prev => [
      ...prev,
      {
        id: Date.now(),
        x: Math.random() * (GAME_WIDTH - 20),
        y: -20,
        speed: speed + Math.random() * 0.5,
      },
    ]);
  }, [difficulty]);

  useEffect(() => {
    if (open) {
      setAsteroids([]);
      setHits(0);
      setGameOver(false);
      const spawnInterval = setInterval(spawnAsteroid, 2000 / (difficulty / 2));
      return () => clearInterval(spawnInterval);
    }
  }, [open, difficulty, spawnAsteroid]);

  const gameLoop = useCallback(() => {
    if (gameOver) return;

    setAsteroids(prev =>
      prev.map(a => ({ ...a, y: a.y + a.speed })).filter(a => {
        if (a.y > GAME_HEIGHT) {
          setHits(h => h + 1);
          return false;
        }
        return true;
      })
    );

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameOver]);

  useEffect(() => {
    if (hits >= 5) {
      setGameOver(true);
      setTimeout(() => onClose(false), 1500);
    }
  }, [hits, onClose]);

  useEffect(() => {
    if (open && asteroids.length === 0 && hits === 0 && !gameOver) {
        // Successfully defended
        const timer = setTimeout(() => {
            if(!gameOver) {
                //onClose(true); // This would close too early if more asteroids are coming.
                // We'll let the user close it or have a dedicated win condition. For now, it's survival.
            }
        }, 15000); // Survive for 15 seconds
        return () => clearTimeout(timer);
    }
  }, [open, asteroids, hits, gameOver, onClose]);


  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
        if (e.code === 'Space' && gameAreaRef.current) {
            const gameRect = gameAreaRef.current.getBoundingClientRect();
            // Fire a "laser" up the middle
            const laserX = gameRect.left + GAME_WIDTH / 2;
            
            setAsteroids(currentAsteroids => {
                const newAsteroids = [...currentAsteroids];
                let targetHit = false;
                
                // Find the lowest asteroid in the laser's path
                const shootableAsteroids = newAsteroids
                  .filter(a => Math.abs((gameRect.left + a.x + 10) - laserX) < 15) // 15px laser width tolerance
                  .sort((a,b) => b.y - a.y); // Sort by lowest on screen

                if(shootableAsteroids.length > 0){
                    const targetId = shootableAsteroids[0].id;
                    return newAsteroids.filter(a => a.id !== targetId);
                }

                return newAsteroids;
            });
        }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [open, gameAreaRef]);

  useEffect(() => {
    if (open && !gameOver) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if(gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    }
  }, [open, gameOver, gameLoop]);

  const handleExplode = (id: number) => {
    setAsteroids(prev => prev.filter(a => a.id !== id));
  };


  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(true)}>
      <DialogContent className="max-w-xl bg-card border-accent text-foreground">
        <DialogHeader>
          <DialogTitle className="font-headline text-accent">Asteroid Defense</DialogTitle>
          <DialogDescription>Use the SPACE bar to shoot incoming asteroids. Don't let 5 hit the ship!</DialogDescription>
        </DialogHeader>
        <div ref={gameAreaRef} className="relative overflow-hidden rounded-md border bg-black" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
          <AnimatePresence>
            {asteroids.map(a => (
              <Asteroid key={a.id} x={a.x} y={a.y} onExplode={() => handleExplode(a.id)} />
            ))}
          </AnimatePresence>
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: SHIP_HEIGHT,
              backgroundColor: 'hsl(var(--primary))',
              borderTop: '2px solid hsl(var(--accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div className="w-10 h-5 bg-background rounded-t-md"></div>
          </div>
          <div className="absolute top-2 right-2 p-2 bg-background/50 rounded-md text-destructive font-bold">
            HITS: {hits} / 5
          </div>
          
           <AnimatePresence>
            {gameOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              >
                <div className="text-center">
                  <h3 className="text-3xl font-bold text-red-500">Shields Down!</h3>
                  <p>The ship has sustained critical damage.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AsteroidDefenseMinigame;
