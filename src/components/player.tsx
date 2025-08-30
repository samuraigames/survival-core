"use client";

import React, { useEffect, useRef } from 'react';
import { motion, useAnimate } from 'framer-motion';

interface PlayerProps {
  initialPosition: { x: number; y: number };
  onPositionChange: (pos: { x: number, y: number }) => void;
  size: number;
  bounds: { width: number, height: number };
  isMovementPaused: boolean;
}

const Player: React.FC<PlayerProps> = ({ initialPosition, onPositionChange, size, bounds, isMovementPaused }) => {
  const [scope, animate] = useAnimate();
  const positionRef = useRef(initialPosition);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const gameLoopRef = useRef<number>();

  // Keyboard input listeners
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      keysPressed.current[event.key.toLowerCase()] = true;
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      keysPressed.current[event.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Game loop for smooth movement
  useEffect(() => {
    const gameLoop = () => {
      if (!isMovementPaused) {
        let { x, y } = positionRef.current;
        const speed = 5;

        if (keysPressed.current['w']) y -= speed;
        if (keysPressed.current['s']) y += speed;
        if (keysPressed.current['a']) x -= speed;
        if (keysPressed.current['d']) x += speed;
        
        // Clamp position to bounds
        const clampedX = Math.max(size / 2, Math.min(x, bounds.width - size / 2));
        const clampedY = Math.max(size / 2, Math.min(y, bounds.height - size / 2));
        
        const newPos = { x: clampedX, y: clampedY };
        
        if (newPos.x !== positionRef.current.x || newPos.y !== positionRef.current.y) {
            positionRef.current = newPos;
            onPositionChange(newPos);
            animate(scope.current, { x: newPos.x, y: newPos.y }, { type: "spring", stiffness: 700, damping: 35 });
        }
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [isMovementPaused, bounds.width, bounds.height, size, onPositionChange, animate, scope]);

  return (
    <motion.div
      ref={scope}
      className="absolute bg-accent rounded-full border-2 border-accent-foreground z-10"
      initial={{ x: initialPosition.x, y: initialPosition.y }}
      style={{
        width: size,
        height: size,
        boxShadow: '0 0 15px hsl(var(--accent))',
        transform: 'translate(-50%, -50%)',
        top: 0,
        left: 0,
      }}
    />
  );
};

export default Player;

    