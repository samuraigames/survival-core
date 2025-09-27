
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { Rocket, Clock, Keyboard, ShieldAlert, Play, Smartphone, Laptop } from "lucide-react";

interface StartScreenProps {
  onStart: () => void;
  onNewGame: () => void;
  isGameInProgress: boolean;
  isMobileMode: boolean;
  setIsMobileMode: (isMobile: boolean) => void;
}

const Key = ({ children }: { children: React.ReactNode }) => (
    <div className="inline-flex items-center justify-center w-10 h-10 bg-card border-2 border-primary rounded-md shadow-md font-bold">
        {children}
    </div>
);

const StartScreen = ({ onStart, onNewGame, isGameInProgress, isMobileMode, setIsMobileMode }: StartScreenProps) => {

  return (
    <div className="relative w-full min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 overflow-y-auto p-4 sm:p-8">
        <div className="flex flex-col items-center justify-start w-full max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mt-8 flex flex-col items-center"
          >
            <h1 className="text-6xl md:text-8xl font-headline font-bold text-accent tracking-tighter">
              SURVIVAL CORE
            </h1>
            <p className="mt-4 text-lg sm:text-xl md:text-2xl text-muted-foreground font-body max-w-3xl mx-auto">
              You are the last crew member. Your mission: survive for 5 minutes to reach Earth. Keep the ship running by managing critical systems, but be warned: the ship's engine is unstable and will overload in 10 minutes.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="my-10 flex flex-col items-center gap-4"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              {isGameInProgress && (
                <Button
                  onClick={onStart}
                  size="lg"
                  variant="outline"
                  className="font-headline text-xl sm:text-2xl px-10 sm:px-12 py-6 sm:py-8 rounded-full shadow-lg transition-all duration-300"
                >
                  <Play className="mr-4 h-6 w-6 sm:h-8 sm:w-8" />
                  CONTINUE
                </Button>
              )}
              <Button
                onClick={onNewGame}
                size="lg"
                className="font-headline text-xl sm:text-2xl px-10 sm:px-12 py-6 sm:py-8 bg-accent hover:bg-accent/90 text-accent-foreground rounded-full shadow-lg shadow-accent/30 transition-all duration-300 hover:shadow-xl hover:shadow-accent/50"
              >
                <Rocket className="mr-4 h-6 w-6 sm:h-8 sm:w-8" />
                {isGameInProgress ? 'NEW GAME' : 'BEGIN MISSION'}
              </Button>
            </div>
             <div className="mt-6 z-50">
                <Button
                    onClick={() => setIsMobileMode(!isMobileMode)}
                    size="lg"
                    variant="secondary"
                    className="font-headline text-lg px-8 py-4 rounded-full shadow-md"
                >
                    {isMobileMode ? <Smartphone className="mr-3 h-6 w-6" /> : <Laptop className="mr-3 h-6 w-6" />}
                    Mode: {isMobileMode ? 'Mobile' : 'PC'}
                </Button>
             </div>
          </motion.div>

          <motion.div 
            className="w-full mb-24"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <h2 className="text-2xl font-headline text-center mb-4 text-accent">How to Play</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-card/50 border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-2 font-headline text-lg"><Keyboard className="w-8 h-8 text-accent"/>Controls</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center text-center">
                    <div className="flex gap-2 my-2">
                        <Key>W</Key>
                        <Key>A</Key>
                        <Key>S</Key>
                        <Key>D</Key>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Use these keys to move. Approach a flashing console and press [E] to interact when you see a warning.</p>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50 border-primary">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2 font-headline text-lg"><Clock className="w-8 h-8 text-accent"/>Win Condition</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center text-center">
                    <p className="text-4xl font-bold my-2">5:00</p>
                    <p className="text-sm text-muted-foreground mt-2">Survive for 5 minutes to reach Earth. Complete minigames to earn points and keep the ship from falling apart.</p>
                </CardContent>
              </Card>

               <Card className="bg-card/50 border-primary">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2 font-headline text-lg"><ShieldAlert className="w-8 h-8 text-destructive"/>Lose Conditions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center text-center gap-4">
                    <div>
                      <p className="font-bold">Engine Overload</p>
                      <p className="text-sm text-muted-foreground">The engine will overload in 10 minutes. Each hit you take reduces this time by 2 minutes.</p>
                    </div>
                    <div>
                      <p className="font-bold">Hull Integrity</p>
                      <p className="text-sm text-muted-foreground">If the ship's integrity drops to 0% (from 10 hits), the hull will breach.</p>
                    </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-primary">
                 <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2 font-headline text-lg">
                      <div className="relative w-16 h-20 bg-slate-800 border-2 rounded-lg p-1 flex flex-col justify-between border-red-500 my-2 animate-pulse">
                          <div className="h-2 bg-slate-600 rounded-sm"></div>
                          <div className="h-8 bg-slate-700 rounded-md"></div>
                          <div className="h-2 bg-slate-600 rounded-sm"></div>
                      </div>
                      <span>Interact</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center text-center">
                    <p className="text-sm text-muted-foreground">When a system fails, its console will flash red. Rush to it and press [E] to start a minigame and fix it before you take damage.</p>
                </CardContent>
              </Card>

            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
