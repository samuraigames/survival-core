"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Ship } from 'lucide-react';

interface AsteroidDefenseMinigameProps {
  open: boolean;
  onClose: (success: boolean) => void;
  difficulty: number;
  isUnderAttack: boolean;
}

const GAME_WIDTH = 500;
const GAME_HEIGHT = 400;
const SHIP_WIDTH = 40;
const SHIP_HEIGHT = 40;
const ASTEROIDS_TO_WIN = 15;

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


const AsteroidDefenseMinigame: React.FC<AsteroidDefenseMinigameProps> = ({ open, onClose, difficulty, isUnderAttack }) => {
  const [asteroids, setAsteroids] = useState<{ id: number; x: number; y: number; speed: number }[]>([]);
  const [bullets, setBullets] = useState<{ id: number; x: number; y: number }[]>([]);
  const [shipX, setShipX] = useState(GAME_WIDTH / 2 - SHIP_WIDTH / 2);
  const [hits, setHits] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [currentShipX, setCurrentShipX] = useState(GAME_WIDTH / 2 - SHIP_WIDTH / 2);

  const gameLoopRef = useRef<number>();
  const keysPressed = useRef<{ [key: string]: boolean }>({});
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
    setCurrentShipX(GAME_WIDTH / 2 - SHIP_WIDTH / 2);
    setHits(0);
    setScore(0);
    setGameOver(false);
    setWin(false);
    setIsClosing(false);
    keysPressed.current = {};
  }, []);

  const spawnAsteroid = useCallback(() => {
    if (gameOver || win) return;
    const speed = 1 + (difficulty / 10) * 2;
    setAsteroids(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        x: Math.random() * (GAME_WIDTH - 20),
        y: -20,
        speed: speed + Math.random() * 0.5,
      },
    ]);
  }, [difficulty, gameOver, win]);
  
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
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) newX -= speed;
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) newX += speed;
      const finalX = Math.max(0, Math.min(newX, GAME_WIDTH - SHIP_WIDTH));
      setCurrentShipX(finalX);
      return finalX;
    });

    // Move and update bullets
    setBullets(prevBullets => prevBullets.map(b => ({ ...b, y: b.y - 8 })).filter(b => b.y > -20));

    // Collision detection
    setAsteroids(prevAsteroids => {
      let newAsteroids = [...prevAsteroids];
      const destroyedAsteroidIds = new Set<number>();
      
      setBullets(currentBullets => {
        const unhitBullets = currentBullets.filter(bullet => {
          for (const asteroid of newAsteroids) {
            if (destroyedAsteroidIds.has(asteroid.id)) continue;

            const bulletRect = { x: bullet.x, y: bullet.y, width: 4, height: 10 };
            const asteroidRect = { x: asteroid.x, y: asteroid.y, width: 20, height: 20 };

            if (
              bulletRect.x < asteroidRect.x + asteroidRect.width &&
              bulletRect.x + bulletRect.width > asteroidRect.x &&
              bulletRect.y < asteroidRect.y + asteroidRect.height &&
              bulletRect.y + bulletRect.height > asteroidRect.y
            ) {
              destroyedAsteroidIds.add(asteroid.id);
              setScore(s => s + 1);
              return false; // Bullet is used up
            }
          }
          return true; // Bullet did not hit anything
        });

        if (destroyedAsteroidIds.size > 0) {
            newAsteroids = newAsteroids.filter(a => !destroyedAsteroidIds.has(a.id));
        }
        return unhitBullets;
      });
      return newAsteroids;
    });


    // Move asteroids and check for hits
    setAsteroids(prevAsteroids => {
        return prevAsteroids.map(a => ({ ...a, y: a.y + a.speed })).filter(a => {
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

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameOver, win, handleClose]);

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
        if (isClosing) return;
        e.preventDefault();
        if (e.key === ' ' || e.code === 'Space') {
            if (!gameOver && !win) {
                setBullets(prev => [...prev, { id: Date.now() + Math.random(), x: currentShipX + SHIP_WIDTH / 2 - 2, y: GAME_HEIGHT - SHIP_HEIGHT }]);
            }
        } else {
            keysPressed.current[e.key.toLowerCase()] = true;
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (isClosing) return;
        e.preventDefault();
        keysPressed.current[e.key.toLowerCase()] = false;
    };

    if (open) {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
    }

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [open, currentShipX, gameOver, win, isClosing]);


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
      ? `Use A/D or Arrow Keys to move. Press SPACE to shoot. Destroy ${ASTEROIDS_TO_WIN} asteroids!`
      : "Defense systems are online. No threats detected.";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(win); }}>
      <DialogContent className="max-w-xl bg-card border-accent text-foreground">
        <DialogHeader>
          <DialogTitle className="font-headline text-accent">Asteroid Defense</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
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
              bottom: 0,
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
