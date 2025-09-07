"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Player from './player';
import { useGame } from '@/hooks/use-game';
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from '@/hooks/use-mobile';
import NavigationMinigame from './navigation-minigame';
import AsteroidDefenseMinigame from './asteroid-defense-minigame';
import LifeSupportMinigame from './life-support-minigame';
import StartScreen from './start-screen';
import GameOverScreen from './game-over-screen';
import Joystick from './joystick';
import { Badge } from './ui/badge';
import { Gamepad2, Shield, Pause, Play, AlertTriangle, Rocket, Globe, HeartPulse } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import Image from 'next/image';
import { Progress } from './ui/progress';

const SHIP_WIDTH = 800;
const SHIP_HEIGHT = 600;
const HUD_HEIGHT = 100;
const TOTAL_WIDTH = SHIP_WIDTH;
const TOTAL_HEIGHT = SHIP_HEIGHT + HUD_HEIGHT;
const GAME_AREA_HEIGHT = SHIP_HEIGHT; 
const PLAYER_SIZE = 40;
const INTERACTION_DISTANCE = 70;
const WIN_TIME_SECONDS = 5 * 60; // 5 minutes to win
const EVENT_INTERVAL_MS = 30000; // 30 seconds between events

const ZONES = {
  NAV_CONSOLE: { x: SHIP_WIDTH / 4, y: 150, name: "Navigation" },
  DEFENSE_CONSOLE: { x: SHIP_WIDTH * 0.75, y: 150, name: "Defense" },
  LIFE_SUPPORT: { x: SHIP_WIDTH / 2, y: SHIP_HEIGHT - 100, name: "Life Support" },
};

type ZoneName = keyof typeof ZONES | null;

export default function GameUI() {
  const { gameState, setGameState, score, setScore, eventIntensity, setEventIntensity, resetGame } = useGame();
  const [playerPosition, setPlayerPosition] = useState({ x: SHIP_WIDTH / 2, y: GAME_AREA_HEIGHT / 2 });
  const [joystickVector, setJoystickVector] = useState({ x: 0, y: 0 });
  const [interaction, setInteraction] = useState<{prompt: string, zone: ZoneName} | null>(null);
  const [activeMinigame, setActiveMinigame] = useState<'navigation' | 'defense' | 'life-support' | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [shipHits, setShipHits] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [isUnderAsteroidAttack, setIsUnderAsteroidAttack] = useState(false);
  const [isNavCourseDeviating, setIsNavCourseDeviating] = useState(false);
  const [isLifeSupportFailing, setIsLifeSupportFailing] = useState(false);
  
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const gameTimerRef = useRef<NodeJS.Timeout>();
  const eventIntervalRef = useRef<NodeJS.Timeout>();
  const passiveDamageTimerRef = useRef<NodeJS.Timeout>();

  const isGameActive = gameState === 'playing' && !isPaused;
  const isApproachingVictory = gameTime >= WIN_TIME_SECONDS - 60;
  const isCrisisActive = isUnderAsteroidAttack || isNavCourseDeviating || isLifeSupportFailing;

  const takeHit = useCallback(() => {
    setIsShaking(true);
    setShipHits(h => h + 1);
    setTimeout(() => setIsShaking(false), 500);
  }, []);

  useEffect(() => {
    if (shipHits >= 10 && gameState === 'playing') {
      setGameState('game-over');
    }
  }, [shipHits, gameState, setGameState]);
  
  const triggerInteraction = useCallback(() => {
    if (!isGameActive || !interaction || activeMinigame) return;

    if (interaction?.zone === 'NAV_CONSOLE') {
      setActiveMinigame('navigation');
    } else if (interaction?.zone === 'DEFENSE_CONSOLE') {
      setActiveMinigame('defense');
    } else if (interaction?.zone === 'LIFE_SUPPORT') {
      setActiveMinigame('life-support');
    }
  }, [isGameActive, interaction, activeMinigame]);

  // Passive damage from unattended crises
  useEffect(() => {
    if (passiveDamageTimerRef.current) {
        clearInterval(passiveDamageTimerRef.current);
    }

    if (isGameActive && isCrisisActive) {
        passiveDamageTimerRef.current = setInterval(() => {
            if (isUnderAsteroidAttack && activeMinigame !== 'defense') {
                takeHit();
                toast({ title: "Ship taking damage!", description: "Defenses are offline!", variant: "destructive" });
            }
            if (isNavCourseDeviating && activeMinigame !== 'navigation') {
                takeHit();
                toast({ title: "Off Course!", description: "Ship integrity failing from course deviation!", variant: "destructive" });
            }
            if (isLifeSupportFailing && activeMinigame !== 'life-support') {
                takeHit();
                toast({ title: "Life Support Critical!", description: "Atmosphere is becoming toxic!", variant: "destructive" });
            }
        }, 5000);
    }

    return () => {
        if (passiveDamageTimerRef.current) {
            clearInterval(passiveDamageTimerRef.current);
        }
    };
  }, [isGameActive, isUnderAsteroidAttack, isNavCourseDeviating, isLifeSupportFailing, activeMinigame, takeHit, toast, isCrisisActive]);


  const handleInteractionKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'e' || e.key === 'E') {
        triggerInteraction();
    }
  }, [triggerInteraction]);
  
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
          if (zoneKey === 'DEFENSE_CONSOLE') {
              closestZone = {
                prompt: isUnderAsteroidAttack ? `Press [E] to ACTIVATE DEFENSES!` : `Press [E] to use ${zone.name}`,
                zone: 'DEFENSE_CONSOLE'
              };
          } else if (zoneKey === 'NAV_CONSOLE') {
              closestZone = {
                prompt: isNavCourseDeviating ? 'Press [E] to CORRECT COURSE!' : `Press [E] to use ${zone.name}`,
                zone: 'NAV_CONSOLE'
              };
          } else if (zoneKey === 'LIFE_SUPPORT') {
            closestZone = {
              prompt: isLifeSupportFailing ? 'Press [E] to RESTORE LIFE SUPPORT!' : `Press [E] to use ${zone.name}`,
              zone: 'LIFE_SUPPORT'
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

  }, [playerPosition, isGameActive, interaction, activeMinigame, isUnderAsteroidAttack, isNavCourseDeviating, isLifeSupportFailing]);

  const triggerRandomEvent = useCallback(() => {
    if (!isGameActive || isCrisisActive) return;

    const eventType = Math.random();
    if (eventType < 0.33) {
      setIsNavCourseDeviating(true);
      toast({ title: "Alert!", description: "Course deviation detected! Get to the navigation console!", variant: "destructive" });
    } else if (eventType < 0.66) {
      setIsUnderAsteroidAttack(true);
      toast({ title: "INCOMING!", description: "Asteroid field detected! Get to the defense console!", variant: 'destructive' });
    } else {
      setIsLifeSupportFailing(true);
      toast({ title: "Warning!", description: "Life support systems are failing!", variant: 'destructive' });
    }
  }, [isGameActive, toast, isCrisisActive]);

  // Main Event Scheduling Loop
  useEffect(() => {
    if (isGameActive) {
      if (eventIntervalRef.current) clearInterval(eventIntervalRef.current);
      eventIntervalRef.current = setInterval(triggerRandomEvent, EVENT_INTERVAL_MS);
    } else {
      if (eventIntervalRef.current) clearInterval(eventIntervalRef.current);
    }
    
    return () => {
      if (eventIntervalRef.current) clearInterval(eventIntervalRef.current);
    };
  }, [isGameActive, triggerRandomEvent]);


  // Game Timer
  useEffect(() => {
    if (isGameActive) {
      gameTimerRef.current = setInterval(() => {
        setGameTime(t => t + 1);
      }, 1000);
    } else {
        if(gameTimerRef.current) clearInterval(gameTimerRef.current);
    }
    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
    };
  }, [isGameActive]);

  // Win Condition Check
  useEffect(() => {
    if (gameTime >= WIN_TIME_SECONDS && gameState === 'playing') {
      setGameState('game-over');
      setGameWon(true);
    }
  }, [gameTime, gameState, setGameState]);

  // Game Over Cleanup
  useEffect(() => {
    if (gameState === 'game-over') {
        if (passiveDamageTimerRef.current) clearInterval(passiveDamageTimerRef.current);
        if (eventIntervalRef.current) clearInterval(eventIntervalRef.current);
        if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    }
  }, [gameState]);


  const handleStartGame = () => {
    resetGame();
    setPlayerPosition({ x: SHIP_WIDTH / 2, y: GAME_AREA_HEIGHT / 2 });
    setGameState('playing');
    setShipHits(0);
    setGameTime(0);
    setGameWon(false);
    setIsPaused(false);
    setIsUnderAsteroidAttack(false);
    setIsNavCourseDeviating(false);
    setIsLifeSupportFailing(false);
    
    if (eventIntervalRef.current) clearInterval(eventIntervalRef.current);
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (passiveDamageTimerRef.current) clearInterval(passiveDamageTimerRef.current);

    setTimeout(triggerRandomEvent, 1000); 
  };
  
  if (gameState === 'start') {
    return <StartScreen onStart={handleStartGame} />;
  }
  
  if (gameState === 'game-over') {
    return <GameOverScreen score={score} onRestart={handleStartGame} won={gameWon} />;
  }
  
  const onMinigameClose = (type: 'navigation' | 'defense' | 'life-support', success: boolean) => {
    setActiveMinigame(null);

    if (passiveDamageTimerRef.current) {
        clearInterval(passiveDamageTimerRef.current);
    }

    if (success) {
        const points = type === 'life-support' ? 50 : (type === 'navigation' ? 100 : 200);
        setScore(s => s + points);
        toast({ title: "Success!", description: `+${points} points!`, className: "border-green-500" });

        if (type === 'defense') setIsUnderAsteroidAttack(false);
        if (type === 'navigation') setIsNavCourseDeviating(false);
        if (type === 'life-support') setIsLifeSupportFailing(false);

        setEventIntensity(e => Math.min(10, e + 0.5));

    } else {
        takeHit();
        setEventIntensity(e => Math.max(1, e - 1));
        toast({ title: "Failed!", description: "Ship integrity compromised.", variant: 'destructive' });
    }
  };

  const getPromptPosition = () => {
    if (!interaction?.zone) return { display: 'none' };
    const zone = ZONES[interaction.zone];
    return {
        left: zone.x,
        top: zone.y + 40,
        transform: 'translateX(-50%)',
    };
  };
  
  const getAlertMessage = () => {
    if (isUnderAsteroidAttack) return 'ASTEROID ATTACK';
    if (isNavCourseDeviating) return 'COURSE DEVIATION';
    if (isLifeSupportFailing) return 'LIFE SUPPORT FAILURE';
    return null;
  }

  const alertMessage = getAlertMessage();
  const shipIntegrityPercentage = 100 - shipHits * 10;
  const journeyProgressPercentage = (gameTime / WIN_TIME_SECONDS) * 100;
  const interactionText = interaction?.prompt.replace('Press [E] to ', '');

  return (
    <div className="w-full h-full p-4 box-border flex items-center justify-center">
      <motion.div
        className="w-full max-w-full max-h-full bg-black font-body text-foreground flex flex-col items-center shadow-2xl shadow-primary/40"
        style={{
          aspectRatio: `${TOTAL_WIDTH} / ${TOTAL_HEIGHT}`,
        }}
        animate={{ x: isShaking ? [-5, 5, -5, 5, -2, 2, 0] : 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* HUD */}
        <div
          className="w-full bg-background/80 border-b-2 border-primary-foreground/20 backdrop-blur-sm z-20"
          style={{ height: HUD_HEIGHT }}
        >
          <div className="p-2 flex flex-col justify-between h-full">
            {/* Top Row: Journey Progress */}
            <div className="flex items-center gap-2 w-full">
              <Rocket className="w-6 h-6 text-accent" />
              <Progress value={journeyProgressPercentage} className="w-full h-3" />
              <Globe className="w-6 h-6 text-green-400" />
            </div>

            {/* Bottom Row: Controls, Status, and Alerts */}
            <div className="flex justify-between items-center">
              {/* Left Section: Pause & Status */}
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsPaused(!isPaused)}
                >
                  {isPaused ? <Play /> : <Pause />}
                  <span className="sr-only">
                    {isPaused ? 'Resume' : 'Pause'}
                  </span>
                </Button>
                <div>
                  <Badge
                    variant="outline"
                    className="text-lg py-1 px-4 border-accent"
                  >
                    Score: {score}
                  </Badge>
                  <div className="flex items-center gap-2 mt-1">
                    <Shield className="h-4 w-4 text-cyan-400" />
                    <Progress value={shipIntegrityPercentage} className="w-32 h-2" />
                  </div>
                </div>
              </div>

              {/* Center Section: Alerts */}
              <div className="flex flex-col items-center gap-1">
                <AnimatePresence>
                  {alertMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Badge
                        variant="destructive"
                        className="text-sm py-1 px-3 transition-colors duration-500 animate-pulse"
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        {alertMessage}
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Right Section: Controls */}
              {!isMobile && (
                <div className="text-sm text-muted-foreground flex items-center gap-2 bg-card p-2 rounded-lg border">
                  <Gamepad2 className="w-5 h-5 text-accent" />
                  <div>
                    <p>
                      Move: <span className="font-bold text-foreground">W, A, S, D</span>
                    </p>
                    <p>
                      Interact: <span className="font-bold text-foreground">E</span>
                    </p>
                  </div>
                </div>
              )}
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
              {interaction && !isMobile && (
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
                    <Button className="mt-4" onClick={() => setIsPaused(false)}>
                      Resume
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute top-2 left-2 p-2 border-b border-r border-dashed rounded-br-lg text-muted-foreground text-sm z-0">
              Cockpit
            </div>
            <div className="absolute bottom-2 right-2 p-2 border-t border-l border-dashed rounded-tl-lg text-muted-foreground text-sm z-0">
              Main Bay
            </div>

            {/* Navigation Console */}
            <div
              className="absolute flex flex-col items-center"
              style={{
                left: ZONES.NAV_CONSOLE.x,
                top: ZONES.NAV_CONSOLE.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className={`w-24 h-16 bg-slate-700 border-2 rounded-md p-1 transition-colors ${
                  isNavCourseDeviating
                    ? 'border-red-500 animate-pulse'
                    : 'border-slate-500'
                }`}
              >
                <div className="w-full h-full bg-slate-800 rounded-sm flex items-center justify-center overflow-hidden">
                  {isApproachingVictory ? (
                    <Image
                      src="https://picsum.photos/200/150"
                      data-ai-hint="photo earth"
                      alt="Earth"
                      width={96}
                      height={64}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-16 h-8 bg-cyan-400/20 rounded-sm border border-cyan-400 animate-pulse"></div>
                  )}
                </div>
              </div>
              <span className="text-xs mt-1 text-muted-foreground">
                {ZONES.NAV_CONSOLE.name}
              </span>
            </div>

            {/* Defense Console */}
            <div
              className="absolute flex flex-col items-center"
              style={{
                left: ZONES.DEFENSE_CONSOLE.x,
                top: ZONES.DEFENSE_CONSOLE.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className={`w-24 h-16 bg-slate-700 border-2 rounded-md p-1 transition-colors ${
                  isUnderAsteroidAttack
                    ? 'border-red-500 animate-pulse'
                    : 'border-slate-500'
                }`}
              >
                <div className="w-full h-full bg-slate-800 rounded-sm flex items-center justify-center">
                  <div
                    className={`w-16 h-8 rounded-sm border transition-colors ${
                      isUnderAsteroidAttack
                        ? 'bg-red-500/20 border-red-500'
                        : 'bg-green-500/20 border-green-500'
                    }`}
                  ></div>
                </div>
              </div>
              <span className="text-xs mt-1 text-muted-foreground">
                {ZONES.DEFENSE_CONSOLE.name}
              </span>
            </div>

            {/* Life Support Console */}
            <div
              className="absolute flex flex-col items-center"
              style={{
                left: ZONES.LIFE_SUPPORT.x,
                top: ZONES.LIFE_SUPPORT.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className={`w-24 h-16 bg-slate-700 border-2 rounded-md p-1 transition-colors ${
                  isLifeSupportFailing
                    ? 'border-red-500 animate-pulse'
                    : 'border-slate-500'
                }`}
              >
                <div className="w-full h-full bg-slate-800 rounded-sm flex items-center justify-center">
                  <HeartPulse
                    className={`w-12 h-12 transition-colors ${
                      isLifeSupportFailing ? 'text-red-500' : 'text-green-500'
                    }`}
                  />
                </div>
              </div>
              <span className="text-xs mt-1 text-muted-foreground">
                {ZONES.LIFE_SUPPORT.name}
              </span>
            </div>

            <Player
              initialPosition={{
                x: SHIP_WIDTH / 2,
                y: GAME_AREA_HEIGHT / 2,
              }}
              onPositionChange={setPlayerPosition}
              size={PLAYER_SIZE}
              bounds={{ width: SHIP_WIDTH, height: GAME_AREA_HEIGHT }}
              isMovementPaused={!isGameActive || activeMinigame !== null}
              joystickVector={joystickVector}
            />
          </div>

          {isMobile && isGameActive && (
            <div className="absolute bottom-5 left-5 z-20">
              <Joystick onMove={setJoystickVector} />
            </div>
          )}

          {isMobile && isGameActive && interaction && (
            <div className="absolute bottom-8 right-5 z-20">
              <Button
                onClick={triggerInteraction}
                className="rounded-full w-20 h-20 text-lg bg-accent/80 hover:bg-accent border-2 border-accent-foreground/50 shadow-lg backdrop-blur-sm"
              >
                {interactionText}
              </Button>
            </div>
          )}
        </div>

        <NavigationMinigame
          open={activeMinigame === 'navigation'}
          onClose={(success) => onMinigameClose('navigation', success)}
          difficulty={eventIntensity}
        />
        <AsteroidDefenseMinigame
          open={activeMinigame === 'defense'}
          onClose={(success) => onMinigameClose('defense', success)}
          difficulty={eventIntensity}
          isUnderAttack={isUnderAsteroidAttack}
        />
        <LifeSupportMinigame
          open={activeMinigame === 'life-support'}
          onClose={(success) => onMinigameClose('life-support', success)}
          difficulty={eventIntensity}
        />
      </motion.div>
    </div>
  );
}

    