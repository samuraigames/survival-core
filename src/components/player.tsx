"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface PlayerProps {
  position: { x: number; y: number };
  size: number;
}

const Player: React.FC<PlayerProps> = ({ position, size }) => {
  return (
    <motion.div
      className="absolute bg-accent rounded-full border-2 border-accent-foreground z-10"
      style={{
        width: size,
        height: size,
        boxShadow: '0 0 15px hsl(var(--accent))',
        transform: 'translate(-50%, -50%)'
      }}
      animate={{
        x: position.x,
        y: position.y,
      }}
      transition={{ type: "tween", ease: "linear", duration: 0.1 }}
    />
  );
};

export default Player;
