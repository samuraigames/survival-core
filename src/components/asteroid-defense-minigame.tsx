
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Ship, ArrowLeft, ArrowRight, Target } from 'lucide-react';
import { Button } from './ui/button';

interface AsteroidDefenseMinigameProps {
  open: boolean;
  onClose: (success: boolean) => void;
  difficulty: number;
  isUnderAttack: boolean;
  isMobileMode: boolean;
}

const GAME_WIDTH = 500;
const GAME_HEIGHT = 400;
const SHIP_WIDTH = 40;
const SHIP_HEIGHT = 40;
const ASTEROIDS_TO_WIN = 15;
const MAX_ASTEROIDS = 8;

const Asteroid = ({ x, y }: { x: number, y: number }) => (
  <motion.div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: 20,
      height: 20,
    }}
    initial={{ scale: 0, rotate: Math.random() * 360 }}
    animate={{ scale: 1 }}
    exit={{ scale: 0, transition: { duration: 0.2 } }}
  >
    <div className="w-full h-full bg-slate-600 rounded-md border-2 border-slate-400 animate-pulse"></div>
  </motion.div>
);

const Bullet = ({ x, y }: { x: number, y: number }) => (
    <motion.div
        style={{
            position: 'absolute',
            left: x,
            top: y,
            width: 4,
            height: 10,
            backgroundColor: 'hsl(var(--accent))',
            boxShadow: '0 0 8px hsl(var(--accent))',
            borderRadius: '2px',
        }}
        initial={{ y }}
        animate={{ y: -20 }}
        transition={{ duration: 0.5, ease: 'linear' }}
        exit={{ opacity: 0 }}
    />
);


const AsteroidDefenseMinigame: React.FC<AsteroidDefenseMinigameProps> = ({ open, onClose, difficulty, isUnderAttack, isMobileMode }) => {
  const [asteroids, setAsteroids] = useState<{ id: number; x: number; y: number; speed: number }[]>([]);
  const [bullets, setBullets] = useState<{ id: number; x: number; y: number }[]>([]);
  const [shipX, setShipX] = useState(GAME_WIDTH / 2 - SHIP_WIDTH / 2);
  const [hits, setHits] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  const gameLoopRef = useRef<number>();
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const touchState = useRef<'left' | 'right' | null>(null);
  const spawnIntervalRef = useRef<NodeJS.Timeout>();

  const handleClose = useCallback((success: boolean) => {
    if (isClosing) return;
    setIsClosing(true);
    if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    onClose(success);
  }, [isClosing, onClose]);
  
  const resetState = useCallback(() => {
    setAsteroids([]);
    setBullets([]);
    setShipX(GAME_WIDTH / 2 - SHIP_WIDTH / 2);
    setHits(0);
    setScore(0);
    setGameOver(false);
    setWin(false);
    setIsClosing(false);
    keysPressed.current = {};
    touchState.current = null;
  }, []);

  const spawnAsteroid = useCallback(() => {
    if (gameOver || win) return;
    setAsteroids(prev => {
        if (prev.length >= MAX_ASTEROIDS) return prev;
        const speed = 1 + (difficulty / 10) * 2;
        return [
          ...prev,
          {
            id: Date.now() + Math.random(),
            x: Math.random() * (GAME_WIDTH - 20),
            y: -20,
            speed: speed + Math.random() * 0.5,
          },
        ]
    });
  }, [difficulty, gameOver, win]);

  const shoot = useCallback(() => {
    if (!gameOver && !win) {
      setBullets(prev => [...prev, { id: Date.now() + Math.random(), x: shipX + SHIP_WIDTH / 2 - 2, y: GAME_HEIGHT - SHIP_HEIGHT }]);
    }
  }, [gameOver, win, shipX]);
  
  // Game setup effect
  useEffect(() => {
    if (open) {
      resetState();
      
      spawnIntervalRef.current = setInterval(spawnAsteroid, Math.max(500, 2000 / (difficulty / 2)));
      
      return () => {
        if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
        if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      };
    }
  }, [open, difficulty, spawnAsteroid, resetState]);


  // Main Game Loop
  const gameLoop = useCallback(() => {
    if (gameOver || win) return;

    // Move Ship
    setShipX(prevX => {
      const speed = 5;
      let newX = prevX;
      if (!isMobileMode) {
        if (keysPressed.current['a'] || keysPressed.current['arrowleft']) newX -= speed;
        if (keysPressed.current['d'] || keysPressed.current['arrowright']) newX += speed;
      } else {
        if (touchState.current === 'left') newX -= speed;
        if (touchState.current === 'right') newX += speed;
      }
      return Math.max(0, Math.min(newX, GAME_WIDTH - SHIP_WIDTH));
    });

    // Move and update bullets
    setBullets(prevBullets => prevBullets.map(b => ({ ...b, y: b.y - 8 })).filter(b => b.y > -20));
    
    // Move asteroids and check for hits
    setAsteroids(prevAsteroids => {
      const asteroidSpeed = 1 + difficulty / 5;
      return prevAsteroids
        .map(a => ({ ...a, y: a.y + a.speed * asteroidSpeed }))
        .filter(a => {
          if (a.y > GAME_HEIGHT) {
            setHits(h => {
              const newHits = h + 1;
              if (newHits >= 5 && !win) {
                setGameOver(true);
                setTimeout(() => handleClose(false), 1500);
              }
              return newHits;
            });
            return false;
          }
          return true;
        });
    });

    // Collision detection
    setBullets(currentBullets => {
      const activeBullets = new Set(currentBullets.map(b => b.id));
      const destroyedAsteroidIds = new Set<number>();

      setAsteroids(prevAsteroids =>
        prevAsteroids.filter(asteroid => {
          for (const bullet of currentBullets) {
            if (!activeBullets.has(bullet.id) || destroyedAsteroidIds.has(asteroid.id)) continue;

            const bulletRect = { x: bullet.x, y: bullet.y, width: 4, height: 10 };
            const asteroidRect = { x: asteroid.x, y: asteroid.y, width: 20, height: 20 };

            if (
              bulletRect.x < asteroidRect.x + asteroidRect.width &&
              bulletRect.x + bulletRect.width > asteroidRect.x &&
              bulletRect.y < asteroidRect.y + asteroidRect.height &&
              bulletRect.y + bulletRect.height > asteroidRect.y
            ) {
              destroyedAsteroidIds.add(asteroid.id);
              activeBullets.delete(bullet.id);
              setScore(s => s + 1);
              return false; // Asteroid is destroyed
            }
          }
          return true; // Asteroid survives
        })
      );
      
      // Filter out used bullets
      return currentBullets.filter(b => activeBullets.has(b.id));
    });

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameOver, win, handleClose, isMobileMode, difficulty]);

  // Check for win condition
  useEffect(() => {
    if (score >= ASTEROIDS_TO_WIN && !win && !gameOver) {
      setWin(true);
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
      setTimeout(() => handleClose(true), 1500);
    }
  }, [score, win, gameOver, handleClose]);
  
  // Keyboard input handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (isClosing || isMobileMode) return;
        const key = e.key.toLowerCase();
        if (key === ' ' || key === 'spacebar') {
            e.preventDefault();
            shoot();
        } else {
            keysPressed.current[key] = true;
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (isClosing || isMobileMode) return;
        const key = e.key.toLowerCase();
        keysPressed.current[key] = false;
    };

    if (open) {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
    }

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [open, shoot, isClosing, isMobileMode]);


  // Start/stop game loop
  useEffect(() => {
    if (open && !gameOver && !win) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      if(gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    }
    return () => {
      if(gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    }
  }, [open, gameOver, gameLoop, win]);
  
  const descriptionText = isUnderAttack 
      ? `Destroy ${ASTEROIDS_TO_WIN} asteroids!`
      : "Defense systems are online. No threats detected.";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(win); }}>
      <DialogContent className="max-w-xl bg-card border-accent text-foreground">
        <DialogHeader>
          <DialogTitle className="font-headline text-accent">Asteroid Defense</DialogTitle>
          <DialogDescription>
            {isMobileMode 
              ? descriptionText
              : `Use A/D or Arrow Keys to move. Press SPACE to shoot. ${descriptionText}`
            }
          </DialogDescription>
        </DialogHeader>
        <div className="relative overflow-hidden rounded-md border bg-black" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
          <AnimatePresence>
            {asteroids.map(a => (
              <Asteroid key={a.id} x={a.x} y={a.y} />
            ))}
            {bullets.map(b => (
                <Bullet key={b.id} x={b.x} y={b.y} />
            ))}
          </AnimatePresence>

          <motion.div
            style={{
              position: 'absolute',
              bottom: isMobileMode ? 40 : 0,
              width: SHIP_WIDTH,
              height: SHIP_HEIGHT,
            }}
            animate={{ x: shipX }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <Ship className="w-full h-full text-accent" />
          </motion.div>
          
          <div className="absolute top-2 left-2 p-2 bg-background/50 rounded-md text-cyan-400 font-bold">
            DESTROYED: {score} / {ASTEROIDS_TO_WIN}
          </div>
          <div className="absolute top-2 right-2 p-2 bg-background/50 rounded-md text-destructive font-bold">
            HITS: {hits} / 5
          </div>
          
           {/* Mobile Controls */}
           {isMobileMode && !gameOver && !win && (
                <div className="absolute bottom-10 inset-x-4 flex justify-between items-center z-10">
                    <div className="flex gap-2">
                        <Button
                            size="icon"
                            className="w-16 h-16 rounded-full bg-accent/70 text-accent-foreground backdrop-blur-sm"
                            onPointerDown={() => touchState.current = 'left'}
                            onPointerUp={() => touchState.current = null}
                            onPointerLeave={() => touchState.current = null}
                        >
                            <ArrowLeft className="w-8 h-8" />
                        </Button>
                        <Button
                            size="icon"
                            className="w-16 h-16 rounded-full bg-accent/70 text-accent-foreground backdrop-blur-sm"
                            onPointerDown={() => touchState.current = 'right'}
                            onPointerUp={() => touchState.current = null}
                            onPointerLeave={() => touchState.current = null}
                        >
                            <ArrowRight className="w-8 h-8" />
                        </Button>
                    </div>
                     <Button
                        size="icon"
                        className="w-20 h-20 rounded-full bg-destructive/70 text-destructive-foreground backdrop-blur-sm"
                        onClick={shoot}
                    >
                        <Target className="w-10 h-10" />
                    </Button>
                </div>
            )}
           
           <AnimatePresence>
            {(gameOver || win) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              >
                <div className="text-center">
                  <h3 className={`text-3xl font-bold ${win ? 'text-green-400' : 'text-red-500'}`}>{win ? "Threat Neutralized!" : "Shields Down!"}</h3>
                  <p>{win ? "You cleared the asteroid field." : "The ship has sustained critical damage."}</p>
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

    