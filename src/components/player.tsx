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
      className="absolute bg-accent rounded-full border-2 border-accent-foreground"
      style={{
        width: size,
        height: size,
        boxShadow: '0 0 15px hsl(var(--accent))',
      }}
      animate={{
        x: position.x,
        y: position.y,
      }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    />
  );
};

export default Player;
