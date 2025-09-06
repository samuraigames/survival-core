"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Ship } from 'lucide-react';

interface AsteroidDefenseMinigameProps {
  open: boolean;
  onClose: (success: boolean) => void;
  difficulty: number;
}

const GAME_WIDTH = 500;
const GAME_HEIGHT = 400;
const SHIP_WIDTH = 40;
const SHIP_HEIGHT = 40;

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


const AsteroidDefenseMinigame: React.FC<AsteroidDefenseMinigameProps> = ({ open, onClose, difficulty }) => {
  const [asteroids, setAsteroids] = useState<{ id: number; x: number; y: number; speed: number }[]>([]);
  const [bullets, setBullets] = useState<{ id: number; x: number; y: number }[]>([]);
  const [shipX, setShipX] = useState(GAME_WIDTH / 2 - SHIP_WIDTH / 2);
  const [hits, setHits] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);

  const gameLoopRef = useRef<number>();
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const resetState = useCallback(() => {
    setAsteroids([]);
    setBullets([]);
    setShipX(GAME_WIDTH / 2 - SHIP_WIDTH / 2);
    setHits(0);
    setScore(0);
    setGameOver(false);
    setWin(false);
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
      const spawnInterval = setInterval(spawnAsteroid, Math.max(500, 2000 / (difficulty / 2)));
      
      const gameDuration = 30000; // 30 seconds
      const winTimeout = setTimeout(() => {
        if (!gameOver) {
          setWin(true);
          setTimeout(() => onClose(true), 1500);
        }
      }, gameDuration);

      return () => {
        clearInterval(spawnInterval);
        clearTimeout(winTimeout);
        if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      };
    }
  }, [open, difficulty, spawnAsteroid, onClose, gameOver, resetState]);


  // Main Game Loop
  const gameLoop = useCallback(() => {
    if (gameOver || win) return;

    // Move Ship
    setShipX(prevX => {
      const speed = 5;
      let newX = prevX;
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) newX -= speed;
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) newX += speed;
      return Math.max(0, Math.min(newX, GAME_WIDTH - SHIP_WIDTH));
    });

    // Move everything else and check for collisions
    setAsteroids(prevAsteroids => {
      const newAsteroids = prevAsteroids.map(a => ({ ...a, y: a.y + a.speed }));
      
      setBullets(prevBullets => {
        let currentBullets = prevBullets.map(b => ({ ...b, y: b.y - 8 }));
        let currentAsteroids = [...newAsteroids];
        let newScore = score;
        const destroyedAsteroidIds = new Set();
        const destroyedBulletIds = new Set();

        for (const bullet of currentBullets) {
          for (const asteroid of currentAsteroids) {
            if (destroyedAsteroidIds.has(asteroid.id)) continue;

            const distance = Math.hypot(bullet.x - (asteroid.x + 10), bullet.y - (asteroid.y + 10));
            if (distance < 15) { // Collision
              destroyedAsteroidIds.add(asteroid.id);
              destroyedBulletIds.add(bullet.id);
              newScore += 1;
            }
          }
        }
        
        if (destroyedAsteroidIds.size > 0) {
          setScore(newScore);
          currentAsteroids = currentAsteroids.filter(a => !destroyedAsteroidIds.has(a.id));
        }
        
        return currentBullets.filter(b => b.y > -20 && !destroyedBulletIds.has(b.id));
      });

      // Filter asteroids that are off-screen or destroyed
      return newAsteroids.filter(a => {
         if (destroyedAsteroidIds.has(a.id)) return false;
        if (a.y > GAME_HEIGHT) {
          setHits(h => {
            const newHits = h + 1;
            if (newHits >= 5 && !win) { // check win state to prevent race condition
              setGameOver(true);
              setTimeout(() => onClose(false), 1500);
            }
            return newHits;
          });
          return false;
        }
        return true;
      });
    });

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameOver, win, onClose, score]);
  
  // Keyboard input handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        e.preventDefault();
        if (e.key === ' ' || e.code === 'Space') {
            if (!gameOver && !win) {
                setBullets(prev => [...prev, { id: Date.now(), x: shipX + SHIP_WIDTH / 2 - 2, y: GAME_HEIGHT - SHIP_HEIGHT }]);
            }
        } else {
            keysPressed.current[e.key.toLowerCase()] = true;
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
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
  }, [open, shipX, gameOver, win]);


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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(win); }}>
      <DialogContent className="max-w-xl bg-card border-accent text-foreground">
        <DialogHeader>
          <DialogTitle className="font-headline text-accent">Asteroid Defense</DialogTitle>
          <DialogDescription>Use A/D or Arrow Keys to move. Press SPACE to shoot. Survive for 30 seconds!</DialogDescription>
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
            SCORE: {score}
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
