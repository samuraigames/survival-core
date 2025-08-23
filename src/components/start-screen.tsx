"use client";

import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { Rocket } from "lucide-react";

interface StartScreenProps {
  onStart: () => void;
}

const StartScreen = ({ onStart }: StartScreenProps) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-background text-foreground p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center"
      >
        <h1 className="text-6xl md:text-8xl font-headline font-bold text-primary-foreground tracking-tighter">
          SURVIVAL CORE
        </h1>
        <p className="mt-4 text-xl md:text-2xl text-muted-foreground font-body max-w-2xl mx-auto">
          You are the last crew member. Keep the ship running. Navigate the void. Survive.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-12"
      >
        <Button
          onClick={onStart}
          size="lg"
          className="font-headline text-2xl px-12 py-8 bg-accent hover:bg-accent/90 text-accent-foreground rounded-full shadow-lg shadow-accent/30 transition-all duration-300 hover:shadow-xl hover:shadow-accent/50"
        >
          <Rocket className="mr-4 h-8 w-8" />
          BEGIN MISSION
        </Button>
      </motion.div>
    </div>
  );
};

export default StartScreen;
