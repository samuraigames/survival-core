"use client";

import React, { useEffect, useRef } from 'react';
import { motion, useAnimate } from 'framer-motion';

interface PlayerProps {
  position: { x: number; y: number };
  onPositionChange: (pos: { x: number, y: number }) => void;
  size: number;
  bounds: { width: number, height: number };
  isMovementPaused: boolean;
}

const Player: React.FC<PlayerProps> = ({ position, onPositionChange, size, bounds, isMovementPaused }) => {
  const [scope, animate] = useAnimate();
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
        onPositionChange(prevPosition => {
          let { x, y } = prevPosition;
          const speed = 5;

          if (keysPressed.current['w']) y -= speed;
          if (keysPressed.current['s']) y += speed;
          if (keysPressed.current['a']) x -= speed;
          if (keysPressed.current['d']) x += speed;
          
          // Clamp position to bounds
          const clampedX = Math.max(size / 2, Math.min(x, bounds.width - size / 2));
          const clampedY = Math.max(size / 2, Math.min(y, bounds.height - size / 2));

          return { x: clampedX, y: clampedY };
        });
      }
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [onPositionChange, bounds, size, isMovementPaused]);

  // Animate component to new position
  useEffect(() => {
    if (scope.current) {
      animate(scope.current, { x: position.x, y: position.y }, { duration: 0.1, ease: 'linear' });
    }
  }, [position, animate, scope]);

  return (
    <motion.div
      ref={scope}
      className="absolute bg-accent rounded-full border-2 border-accent-foreground z-10"
      style={{
        width: size,
        height: size,
        boxShadow: '0 0 15px hsl(var(--accent))',
        transform: 'translate(-50%, -50%)',
        // Set initial position to prevent flash on load
        top: position.y,
        left: position.x,
      }}
    />
  );
};

export default Player;
