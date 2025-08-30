"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { Rocket, Clock, Keyboard } from "lucide-react";

interface StartScreenProps {
  onStart: () => void;
}

const Key = ({ children }: { children: React.ReactNode }) => (
    <div className="inline-flex items-center justify-center w-10 h-10 bg-card border-2 border-primary rounded-md shadow-md font-bold">
        {children}
    </div>
);

const StartScreen = ({ onStart }: StartScreenProps) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-background text-foreground p-8 overflow-y-auto">
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
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

      <motion.div 
        className="mt-16 w-full max-w-4xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8 }}
      >
        <h2 className="text-2xl font-headline text-center mb-4 text-accent">How to Play</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card/50 border-primary">
            <CardContent className="p-4 flex flex-col items-center text-center">
                <Keyboard className="w-12 h-12 text-accent mb-4"/>
                <h3 className="font-bold text-lg font-headline">Movement</h3>
                <div className="flex gap-2 my-2">
                    <Key>W</Key>
                    <Key>A</Key>
                    <Key>S</Key>
                    <Key>D</Key>
                </div>
                <p className="text-sm text-muted-foreground">Use the standard keys to move your character around the ship.</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-primary">
             <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="relative w-24 h-32 bg-slate-800 border-2 rounded-lg p-2 flex flex-col justify-between border-green-500 my-2">
                    <div className="h-4 bg-slate-600 rounded-sm"></div>
                    <div className="h-12 bg-slate-700 rounded-md"></div>
                    <div className="h-4 bg-slate-600 rounded-sm"></div>
                    <div className="absolute -bottom-10 bg-background/80 p-1 px-2 rounded-md border text-accent font-headline text-xs">Press [E] to use</div>
                </div>
                <h3 className="font-bold text-lg font-headline mt-12">Interact</h3>
                <p className="text-sm text-muted-foreground mt-2">When near a console, press the [E] key to use it and start a minigame.</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-primary">
            <CardContent className="p-4 flex flex-col items-center text-center">
                <Clock className="w-12 h-12 text-accent mb-4"/>
                <h3 className="font-bold text-lg font-headline">Objective</h3>
                <p className="text-4xl font-bold my-2">5:00</p>
                <p className="text-sm text-muted-foreground">Survive for 5 minutes by completing minigames and keeping the ship from falling apart.</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};

export default StartScreen;
