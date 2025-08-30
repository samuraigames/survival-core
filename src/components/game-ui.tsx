"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Player from './player';
import { useGame } from '@/hooks/use-game';
import { adjustDifficulty } from '@/ai/flows/adjust-difficulty';
import { useToast } from "@/hooks/use-toast";
import EngineRepairMinigame from './engine-repair-minigame';
import NavigationMinigame from './navigation-minigame';
import AsteroidDefenseMinigame from './asteroid-defense-minigame';
import StartScreen from './start-screen';
import GameOverScreen from './game-over-screen';
import { Badge } from './ui/badge';
import { Gamepad2, Wrench, Shield, Clock, Pause, Play, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import Image from 'next/image';
import { Progress } from './ui/progress';

const SHIP_WIDTH = 800;
const SHIP_HEIGHT = 600;
const HUD_HEIGHT = 80;
const GAME_AREA_HEIGHT = SHIP_HEIGHT; 
const PLAYER_SIZE = 40;
const INTERACTION_DISTANCE = 70;
const WIN_TIME_SECONDS = 10 * 60; // 10 minutes to win
const EVENT_COOLDOWN_MS = 20000; // 20 second cooldown between events

const ZONES = {
  NAV_CONSOLE: { x: SHIP_WIDTH / 4, y: 150, name: "Navigation" },
  ELECTRICAL_PANEL: { x: SHIP_WIDTH / 2, y: 350, name: "Electrical" },
  DEFENSE_CONSOLE: { x: SHIP_WIDTH * 0.75, y: 150, name: "Defense" },
};

type ZoneName = keyof typeof ZONES | null;

export default function GameUI() {
  const { gameState, setGameState, score, setScore, engineStatus, setEngineStatus, eventIntensity, setEventIntensity, resetGame } = useGame();
  const [playerPosition, setPlayerPosition] = useState({ x: SHIP_WIDTH / 2, y: GAME_AREA_HEIGHT / 2 });
  const [interaction, setInteraction] = useState<{prompt: string, zone: ZoneName} | null>(null);
  const [activeMinigame, setActiveMinigame] = useState<'engine' | 'navigation' | 'defense' | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [shipHits, setShipHits] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [isUnderAsteroidAttack, setIsUnderAsteroidAttack] = useState(false);

  const { toast } = useToast();
  
  const playerSkillRef = useRef(1);
  const gameTimerRef = useRef<NodeJS.Timeout>();
  const nextEventTimeoutRef = useRef<NodeJS.Timeout>();
  const asteroidAttackTimerRef = useRef<NodeJS.Timeout>();
  const eventCooldownRef = useRef(false);

  const isGameActive = gameState === 'playing' && !isPaused;
  const isApproachingVictory = gameTime >= WIN_TIME_SECONDS - 60;

  const takeHit = useCallback(() => {
    setIsShaking(true);
    setShipHits(h => {
        const newHits = h + 1;
        if (newHits >= 10) {
            setGameState('game-over');
        }
        return newHits;
    });
    setTimeout(() => setIsShaking(false), 500);
  }, [setGameState]);
  
  useEffect(() => {
    if (isUnderAsteroidAttack && isGameActive && activeMinigame !== 'defense') {
      asteroidAttackTimerRef.current = setInterval(() => {
        takeHit();
        toast({ title: "Ship taking damage!", description: "Defenses are offline!", variant: "destructive" });
      }, 5000); 
    }
    return () => {
      if (asteroidAttackTimerRef.current) clearInterval(asteroidAttackTimerRef.current);
    }
  }, [isUnderAsteroidAttack, isGameActive, takeHit, toast, activeMinigame]);


  const handleInteractionKey = useCallback((e: KeyboardEvent) => {
    if (!isGameActive || !interaction || activeMinigame) return;
    if (e.key === 'e' || e.key === 'E') {
      if (interaction?.zone === 'NAV_CONSOLE') {
        setActiveMinigame('navigation');
      } else if (interaction?.zone === 'ELECTRICAL_PANEL' && engineStatus === 'broken') {
        setActiveMinigame('engine');
      } else if (interaction?.zone === 'DEFENSE_CONSOLE') {
        setActiveMinigame('defense');
      }
    }
  }, [isGameActive, interaction, engineStatus, activeMinigame]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleInteractionKey);
    return () => window.removeEventListener('keydown', handleInteractionKey);
  }, [handleInteractionKey]);
  
  useEffect(() => {
    if (!isGameActive || activeMinigame) {
        if (interaction) setInteraction(null);
        return;
    }
      
    let closestZone: {prompt: string, zone: ZoneName} | null = null;
    
    for (const zoneKey in ZONES) {
      const zone = ZONES[zoneKey as keyof typeof ZONES];
      const distance = Math.hypot(playerPosition.x - zone.x, playerPosition.y - zone.y);

      if (distance < INTERACTION_DISTANCE) {
          if (zoneKey === 'ELECTRICAL_PANEL') {
              closestZone = {
                  prompt: engineStatus === 'broken' ? `Press [E] to repair ${zone.name}` : `${zone.name}: All systems nominal.`,
                  zone: 'ELECTRICAL_PANEL'
              };
          } else if (zoneKey === 'DEFENSE_CONSOLE') {
              closestZone = {
                prompt: isUnderAsteroidAttack ? `Press [E] to ACTIVATE DEFENSES!` : `Press [E] to use ${zone.name}`,
                zone: 'DEFENSE_CONSOLE'
              };
          } else {
               closestZone = { prompt: `Press [E] to use ${zone.name}`, zone: zoneKey as keyof typeof ZONES };
          }
          break; 
      }
    }
    
    if (closestZone?.prompt !== interaction?.prompt) {
        setInteraction(closestZone);
    }

  }, [playerPosition, isGameActive, interaction, engineStatus, activeMinigame, isUnderAsteroidAttack]);

  const triggerRandomEvent = useCallback(() => {
    if (!isGameActive || eventCooldownRef.current) return;

    const eventType = Math.random();
    if (eventType < 0.4 && engineStatus === 'ok') {
      setEngineStatus('broken');
      toast({ title: "Warning!", description: "Electrical panel malfunction!", variant: "destructive" });
    } else if (eventType < 0.7) {
      setActiveMinigame('navigation');
      toast({ title: "Alert!", description: "Navigation challenge incoming!" });
    } else {
      setIsUnderAsteroidAttack(true);
      toast({ title: "INCOMING!", description: "Asteroid field detected! Get to the defense console!", variant: 'destructive' });
    }

    // Start cooldown
    eventCooldownRef.current = true;
    setTimeout(() => {
      eventCooldownRef.current = false;
    }, EVENT_COOLDOWN_MS);

  }, [isGameActive, engineStatus, toast, setEngineStatus]);

  // Main Event Scheduling Loop
  useEffect(() => {
    if (isGameActive) {
      // initial event
      if (!nextEventTimeoutRef.current) {
         nextEventTimeoutRef.current = setTimeout(triggerRandomEvent, 15000);
      }
    }
    return () => {
      if (nextEventTimeoutRef.current) clearTimeout(nextEventTimeoutRef.current);
    }
  }, [isGameActive, triggerRandomEvent]);


  useEffect(() => {
    if (gameState === 'playing' && !isPaused) {
      gameTimerRef.current = setInterval(() => {
        setGameTime(t => {
            const newTime = t + 1;
            if (newTime >= WIN_TIME_SECONDS) {
                setGameState('game-over');
                setGameWon(true);
                if (gameTimerRef.current) clearInterval(gameTimerRef.current);
                if (nextEventTimeoutRef.current) clearTimeout(nextEventTimeoutRef.current);
            }
            return newTime;
        });
      }, 1000);
    } else {
       if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    }
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (nextEventTimeoutRef.current) clearTimeout(nextEventTimeoutRef.current);
    };
  }, [gameState, isPaused, gameWon, setGameState]);

  const handleStartGame = () => {
    resetGame();
    setPlayerPosition({ x: SHIP_WIDTH / 2, y: GAME_AREA_HEIGHT / 2 });
    setGameState('playing');
    setShipHits(0);
    setGameTime(0);
    setGameWon(false);
    setIsPaused(false);
    setIsUnderAsteroidAttack(false);
    eventCooldownRef.current = false;
    if (nextEventTimeoutRef.current) clearTimeout(nextEventTimeoutRef.current);
    nextEventTimeoutRef.current = setTimeout(triggerRandomEvent, 15000); 
  };
  
  if (gameState === 'start') {
    return <StartScreen onStart={handleStartGame} />;
  }
  
  if (gameState === 'game-over') {
    if (asteroidAttackTimerRef.current) clearInterval(asteroidAttackTimerRef.current);
    if (nextEventTimeoutRef.current) clearTimeout(nextEventTimeoutRef.current);
    return <GameOverScreen score={score} onRestart={handleStartGame} won={gameWon} />;
  }
  
  const onMinigameClose = async (type: 'engine' | 'navigation' | 'defense', success: boolean) => {
    setActiveMinigame(null);
    if (type === 'defense') {
      setIsUnderAsteroidAttack(false); 
      if (asteroidAttackTimerRef.current) clearInterval(asteroidAttackTimerRef.current);
    }

    if (success) {
      const points = type === 'engine' ? 150 : (type === 'navigation' ? 100 : 200);
      setScore(s => s + points);
      toast({ title: "Success!", description: `+${points} points!`, className: "border-green-500" });
      if (type === 'engine') setEngineStatus('ok');
      
      playerSkillRef.current = Math.min(10, playerSkillRef.current + 0.5);
      
      try {
        const difficulty = await adjustDifficulty({
          playerSkillLevel: playerSkillRef.current,
          timeSinceLastEvent: 0, 
          currentScore: score + points,
        });
        setEventIntensity(difficulty.eventIntensity);
      } catch (error) {
        console.error("AI Difficulty Adjustment Failed. Using fallback.", error);
        setEventIntensity(e => Math.min(10, e + 1)); // Fallback: slightly increase intensity
      }

    } else {
      if (type === 'engine') {
        setGameState('game-over');
        return;
      } else if(type === 'defense' || type === 'navigation') {
        takeHit();
        playerSkillRef.current = Math.max(1, playerSkillRef.current - 1);
        toast({ title: "Failed!", description: "Ship integrity compromised.", variant: 'destructive'});
      }
    }
    
    // Schedule the next event after the cooldown
    if (nextEventTimeoutRef.current) clearTimeout(nextEventTimeoutRef.current);
    nextEventTimeoutRef.current = setTimeout(triggerRandomEvent, EVENT_COOLDOWN_MS);
  };

  const formatTime = (seconds: number) => {
    const totalSeconds = WIN_TIME_SECONDS - seconds;
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  const getPromptPosition = () => {
    if (!interaction?.zone) return { display: 'none' };
    const zone = ZONES[interaction.zone];
    return {
        left: zone.x,
        top: zone.y + 40,
        transform: 'translateX(-50%)',
    };
  };

  const shipIntegrityPercentage = 100 - shipHits * 10;

  return (
    <motion.div 
      className="w-full h-full flex flex-col items-center justify-center font-body text-foreground bg-black"
      animate={{ x: isShaking ? [-5, 5, -5, 5, -2, 2, 0] : 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* HUD */}
      <div className="w-full bg-background/80 border-b-2 border-primary-foreground/20 backdrop-blur-sm z-20" style={{ height: HUD_HEIGHT, width: SHIP_WIDTH}}>
          <div className="p-2 flex justify-between items-center h-full">
            <div className='flex items-center gap-4'>
                <Button variant="outline" size="icon" onClick={() => setIsPaused(!isPaused)}>
                    {isPaused ? <Play /> : <Pause />}
                    <span className="sr-only">{isPaused ? 'Resume' : 'Pause'}</span>
                </Button>
                <div>
                  <Badge variant="outline" className="text-lg py-1 px-4 border-accent">Score: {score}</Badge>
                  <div className="flex items-center gap-2 mt-1">
                     <Shield className="h-4 w-4 text-cyan-400"/>
                     <Progress value={shipIntegrityPercentage} className="w-32 h-2"/>
                  </div>
                </div>
            </div>

            <div className="flex flex-col items-center">
                <Badge variant="secondary" className="text-md py-2 px-4">
                    <Clock className="mr-2 h-4 w-4"/>
                    Time Left: <span className="font-bold ml-1">{formatTime(gameTime)}</span>
                </Badge>
                <AnimatePresence>
                {(engineStatus === 'broken' || isUnderAsteroidAttack) && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-1"
                    >
                    <Badge variant='destructive' className="text-sm py-1 px-3 transition-colors duration-500 animate-pulse">
                        <AlertTriangle className="mr-2 h-4 w-4"/>
                         {engineStatus === 'broken' ? 'ELECTRICAL FAILURE' : 'ASTEROID ATTACK'}
                    </Badge>
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
            
            <div className="text-sm text-muted-foreground flex items-center gap-2 bg-card p-2 rounded-lg border">
              <Gamepad2 className="w-5 h-5 text-accent"/>
              <div>
                <p>Move: <span className="font-bold text-foreground">W, A, S, D</span></p>
                <p>Interact: <span className="font-bold text-foreground">E</span></p>
              </div>
            </div>
          </div>
        </div>

      <div
        className="relative bg-card/50 border-2 border-primary rounded-lg shadow-2xl shadow-primary/20 overflow-hidden flex flex-col"
        style={{ width: SHIP_WIDTH, height: SHIP_HEIGHT }}
      >
        {/* Game Area */}
        <div className="relative w-full h-full bg-grid-pattern bg-repeat">
          <AnimatePresence>
          {interaction && (
            <motion.div
              style={getPromptPosition()}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bg-background/80 p-2 px-3 rounded-lg border text-accent font-headline z-20 text-sm whitespace-nowrap"
            >
              {interaction.prompt}
            </motion.div>
          )}
          </AnimatePresence>
           <AnimatePresence>
            {isPaused && (
                 <motion.div
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-30"
               >
                 <div className="text-center">
                   <h3 className="text-5xl font-bold text-accent">PAUSED</h3>
                   <Button className="mt-4" onClick={() => setIsPaused(false)}>Resume</Button>
                 </div>
               </motion.div>
            )}
           </AnimatePresence>
          
          <div className="absolute top-2 left-2 p-2 border-b border-r border-dashed rounded-br-lg text-muted-foreground text-sm z-0">Cockpit</div>
          <div className="absolute bottom-2 right-2 p-2 border-t border-l border-dashed rounded-tl-lg text-muted-foreground text-sm z-0">Engineering</div>

          {/* Navigation Console */}
          <div className="absolute flex flex-col items-center" style={{ left: ZONES.NAV_CONSOLE.x, top: ZONES.NAV_CONSOLE.y, transform: 'translate(-50%, -50%)' }}>
            <div className="w-24 h-16 bg-slate-700 border-2 border-slate-500 rounded-md p-1">
              <div className="w-full h-full bg-slate-800 rounded-sm flex items-center justify-center overflow-hidden">
                  {isApproachingVictory ? (
                     <Image src="https://picsum.photos/200/150" data-ai-hint="photo earth" alt="Earth" width={96} height={64} className="object-cover" />
                  ) : (
                    <div className="w-16 h-8 bg-cyan-400/20 rounded-sm border border-cyan-400 animate-pulse"></div>
                  )}
              </div>
            </div>
            <span className="text-xs mt-1 text-muted-foreground">{ZONES.NAV_CONSOLE.name}</span>
          </div>
          
          {/* Defense Console */}
          <div className="absolute flex flex-col items-center" style={{ left: ZONES.DEFENSE_CONSOLE.x, top: ZONES.DEFENSE_CONSOLE.y, transform: 'translate(-50%, -50%)'}}>
            <div className={`w-24 h-16 bg-slate-700 border-2 rounded-md p-1 transition-colors ${isUnderAsteroidAttack ? 'border-red-500 animate-pulse' : 'border-slate-500'}`}>
              <div className="w-full h-full bg-slate-800 rounded-sm flex items-center justify-center">
                  <div className={`w-16 h-8 rounded-sm border transition-colors ${isUnderAsteroidAttack ? 'bg-red-500/20 border-red-500' : 'bg-green-500/20 border-green-500'}`}></div>
              </div>
            </div>
            <span className="text-xs mt-1 text-muted-foreground">{ZONES.DEFENSE_CONSOLE.name}</span>
          </div>

          {/* Electrical Panel */}
          <div className="absolute flex flex-col items-center" style={{ left: ZONES.ELECTRICAL_PANEL.x, top: ZONES.ELECTRICAL_PANEL.y, transform: 'translate(-50%, -50%)' }}>
            <div className={`w-24 h-32 bg-slate-800 border-2 rounded-lg p-2 flex flex-col justify-between ${engineStatus === 'ok' ? 'border-green-500' : 'border-red-500 animate-engine-glow'}`}>
                <div className="h-4 bg-slate-600 rounded-sm"></div>
                <div className="h-12 bg-slate-700 rounded-md"></div>
                <div className="h-4 bg-slate-600 rounded-sm"></div>
            </div>
            <span className="text-xs mt-1 text-muted-foreground">{ZONES.ELECTRICAL_PANEL.name}</span>
          </div>

          <Player
            initialPosition={{ x: SHIP_WIDTH / 2, y: GAME_AREA_HEIGHT / 2 }}
            onPositionChange={setPlayerPosition}
            size={PLAYER_SIZE}
            bounds={{ width: SHIP_WIDTH, height: GAME_AREA_HEIGHT }}
            isMovementPaused={!isGameActive || activeMinigame !== null}
          />
        </div>
      </div>
      
      <EngineRepairMinigame
        open={activeMinigame === 'engine'}
        onClose={(success) => onMinigameClose('engine', success)}
        difficulty={eventIntensity}
      />
      <NavigationMinigame
        open={activeMinigame === 'navigation'}
        onClose={(success) => onMinigameClose('navigation', success)}
        difficulty={eventIntensity}
      />
      <AsteroidDefenseMinigame
        open={activeMinigame === 'defense'}
        onClose={(success) => onMinigameClose('defense', success)}
        difficulty={eventIntensity}
       />
    </motion.div>
  );
}
    