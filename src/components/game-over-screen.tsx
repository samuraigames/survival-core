"use client";

import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { RotateCcw } from "lucide-react";

interface GameOverScreenProps {
  score: number;
  onRestart: () => void;
}

const GameOverScreen = ({ score, onRestart }: GameOverScreenProps) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-background text-foreground p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center"
      >
        <h1 className="text-6xl md:text-8xl font-headline font-bold text-destructive tracking-tighter">
          GAME OVER
        </h1>
        <p className="mt-4 text-xl md:text-2xl text-muted-foreground font-body max-w-2xl mx-auto">
          Your final score was: <span className="text-accent font-bold">{score}</span>
        </p>
         <p className="mt-2 text-lg text-muted-foreground font-body max-w-2xl mx-auto">
          The void is unforgiving.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-12"
      >
        <Button
          onClick={onRestart}
          size="lg"
          variant="outline"
          className="font-headline text-2xl px-12 py-8 rounded-full shadow-lg transition-all duration-300"
        >
          <RotateCcw className="mr-4 h-8 w-8" />
          RESTART MISSION
        </Button>
      </motion.div>
    </div>
  );
};

export default GameOverScreen;
