
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState } from '@/app/page';
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from '@/hooks/use-mobile';
import NavigationMinigame from './navigation-minigame';
import AsteroidDefenseMinigame from './asteroid-defense-minigame';
import LifeSupportMinigame from './life-support-minigame';
import Joystick from './joystick';
import Starfield from './starfield';
import { Badge } from './ui/badge';
import { Gamepad2, Shield, Pause, Play, AlertTriangle, Rocket, Globe, HeartPulse, Fan, Home } from 'lucide-react';
import { motion, AnimatePresence, useAnimate } from 'framer-motion';
import { Button } from './ui/button';
import Image from 'next/image';
import { Progress } from './ui/progress';

// World dimensions
const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 900;

// Viewport dimensions
const SHIP_WIDTH = 800;
const SHIP_HEIGHT = 600;
const HUD_HEIGHT = 100;
const TOTAL_WIDTH = SHIP_WIDTH;
const TOTAL_HEIGHT = SHIP_HEIGHT + HUD_HEIGHT;
const PLAYER_SIZE = 40;
const INTERACTION_DISTANCE = 70;
const WIN_TIME_SECONDS = 5 * 60; // 5 minutes to win
const EVENT_INTERVAL_MS = 30000; // 30 seconds between events
const ENGINE_OVERLOAD_SECONDS = 10 * 60; // 10 minutes to lose

const ZONES = {
  NAV_CONSOLE: { x: WORLD_WIDTH / 2 - 200, y: WORLD_HEIGHT / 2 - 100, name: "Navigation" },
  DEFENSE_CONSOLE: { x: WORLD_WIDTH / 2 + 200, y: WORLD_HEIGHT / 2 - 100, name: "Defense" },
  LIFE_SUPPORT: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 + 150, name: "Life Support" },
};

type ZoneName = keyof typeof ZONES | null;

interface GameUIProps {
    initialState: GameState;
    onStateChange: (newState: GameState) => void;
    onGameWin: (finalState: GameState) => void;
    onGameLose: (finalState: GameState, message: string) => void;
    onReturnToMenu: () => void;
    isMobileMode: boolean;
}

export default function GameUI({ initialState, onStateChange, onGameWin, onGameLose, onReturnToMenu, isMobileMode }: GameUIProps) {
  const [gameState, setGameState] = useState(initialState);
  const [joystickVector, setJoystickVector] = useState({ x: 0, y: 0 });
  const [interaction, setInteraction] = useState<{prompt: string, zone: ZoneName} | null>(null);
  const [activeMinigame, setActiveMinigame] = useState<'navigation' | 'defense' | 'life-support' | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const gameTimerRef = useRef<NodeJS.Timeout>();
  const eventIntervalRef = useRef<NodeJS.Timeout>();
  const passiveDamageTimerRef = useRef<NodeJS.Timeout>();
  const [scope, animate] = useAnimate();
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const gameLoopRef = useRef<number>();
  const isInitialMount = useRef(true);

  const {
    score,
    gameTime,
    engineTime,
    shipHits,
    eventIntensity,
    isUnderAsteroidAttack,
    isNavCourseDeviating,
    isLifeSupportFailing,
    playerPosition,
    playerVelocity,
  } = gameState;

  // Track previous crisis states to show toast only on change
  const prevCrisisState = useRef({
    isUnderAsteroidAttack,
    isNavCourseDeviating,
    isLifeSupportFailing,
  });


  const isGameActive = !isPaused;
  const isApproachingVictory = gameTime >= WIN_TIME_SECONDS - 60;
  const isCrisisActive = isUnderAsteroidAttack || isNavCourseDeviating || isLifeSupportFailing;
  
  // This is a stable function to update state that can be used in callbacks
  const handleStateUpdate = useCallback((updater: (prevState: GameState) => GameState) => {
    setGameState(updater);
  }, [setGameState]);

  const takeHit = useCallback(() => {
    setIsShaking(true);
    handleStateUpdate(prevState => ({ 
      ...prevState,
      shipHits: prevState.shipHits + 1,
      engineTime: Math.max(0, prevState.engineTime - 2)
    }));
    setTimeout(() => setIsShaking(false), 500);
  }, [handleStateUpdate]);
  
  useEffect(() => {
    if (isInitialMount.current) return;
    if (shipHits >= 10) {
      onGameLose(gameState, "The ship's hull has been breached!");
    }
  }, [shipHits, onGameLose, gameState]);
  
  useEffect(() => {
    if (isInitialMount.current) return;
    if (engineTime <= 0) {
      onGameLose(gameState, "The engine has overloaded!");
    }
  }, [engineTime, onGameLose, gameState]);

  useEffect(() => {
    if (isInitialMount.current) return;
    if (gameTime >= WIN_TIME_SECONDS) {
        onGameWin(gameState);
    }
  }, [gameTime, onGameWin, gameState]);

  // Bubble up state changes to parent
  useEffect(() => {
    onStateChange(gameState);
  }, [gameState, onStateChange]);


  const triggerInteraction = useCallback(() => {
    if (!isGameActive || !interaction || activeMinigame) return;

    if (interaction.zone === 'NAV_CONSOLE' && isNavCourseDeviating) {
      setActiveMinigame('navigation');
    } else if (interaction.zone === 'DEFENSE_CONSOLE') { 
      setActiveMinigame('defense');
    } else if (interaction.zone === 'LIFE_SUPPORT' && isLifeSupportFailing) {
      setActiveMinigame('life-support');
    }
  }, [isGameActive, interaction, activeMinigame, isNavCourseDeviating, isLifeSupportFailing]);

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
    if (!isMobileMode) {
      window.addEventListener('keydown', handleInteractionKey);
      return () => window.removeEventListener('keydown', handleInteractionKey);
    }
  }, [handleInteractionKey, isMobileMode]);
  
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
            if (isUnderAsteroidAttack) {
              closestZone = { prompt: `Press [E] to ACTIVATE DEFENSES!`, zone: 'DEFENSE_CONSOLE'};
            } else {
              closestZone = { prompt: `Defenses Online`, zone: 'DEFENSE_CONSOLE'};
            }
          } else if (zoneKey === 'NAV_CONSOLE') {
            if (isNavCourseDeviating) {
              closestZone = { prompt: 'Press [E] to CORRECT COURSE!', zone: 'NAV_CONSOLE'};
            } else {
              closestZone = { prompt: 'Awaiting Coordinates', zone: 'NAV_CONSOLE'};
            }
          } else if (zoneKey === 'LIFE_SUPPORT') {
            if (isLifeSupportFailing) {
              closestZone = { prompt: 'Press [E] to RESTORE LIFE SUPPORT!', zone: 'LIFE_SUPPORT'};
            } else {
              closestZone = { prompt: 'Systems Stable', zone: 'LIFE_SUPPORT'};
            }
          }
          break; 
      }
    }
    
    if (closestZone?.prompt !== interaction?.prompt) {
        setInteraction(closestZone);
    }

  }, [playerPosition, isGameActive, interaction, activeMinigame, isUnderAsteroidAttack, isNavCourseDeviating, isLifeSupportFailing]);

  const triggerRandomEvent = useCallback(() => {
    handleStateUpdate(prevState => {
      // Check for crisis inside the updater to get the freshest state
      if (prevState.isUnderAsteroidAttack || prevState.isNavCourseDeviating || prevState.isLifeSupportFailing) {
        return prevState;
      }
      
      const eventType = Math.random();
      let newState = {...prevState};

      if (eventType < 0.33) {
        newState.isNavCourseDeviating = true;
      } else if (eventType < 0.66) {
        newState.isUnderAsteroidAttack = true;
      } else {
        newState.isLifeSupportFailing = true;
      }
      return newState;
    });

  }, [handleStateUpdate]);

  // Effect to show toast notifications when a crisis starts
  useEffect(() => {
    if (isUnderAsteroidAttack && !prevCrisisState.current.isUnderAsteroidAttack) {
      toast({ title: "INCOMING!", description: "Asteroid field detected! Get to the defense console!", variant: 'destructive' });
    }
    if (isNavCourseDeviating && !prevCrisisState.current.isNavCourseDeviating) {
      toast({ title: "Alert!", description: "Course deviation detected! Get to the navigation console!", variant: 'destructive' });
    }
    if (isLifeSupportFailing && !prevCrisisState.current.isLifeSupportFailing) {
      toast({ title: "Warning!", description: "Life support systems are failing!", variant: 'destructive' });
    }
    
    // Update previous state ref
    prevCrisisState.current = {
      isUnderAsteroidAttack,
      isNavCourseDeviating,
      isLifeSupportFailing,
    };
  }, [isUnderAsteroidAttack, isNavCourseDeviating, isLifeSupportFailing, toast]);


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
        handleStateUpdate(prevState => ({ 
          ...prevState,
          gameTime: prevState.gameTime + 1,
          engineTime: prevState.engineTime - 1,
        }));
      }, 1000);
    } else {
        if(gameTimerRef.current) clearInterval(gameTimerRef.current);
    }
    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
    };
  }, [isGameActive, handleStateUpdate]);
  
   // Initial setup
  useEffect(() => {
    if (passiveDamageTimerRef.current) clearInterval(passiveDamageTimerRef.current);

    // Start first event quickly if it's a new game
    if (isInitialMount.current && initialState.gameTime < 5) {
      const timeoutId = setTimeout(triggerRandomEvent, 5000);
      isInitialMount.current = false;
      return () => clearTimeout(timeoutId);
    }
    
  }, [triggerRandomEvent, initialState.gameTime]);
  
  // Set isInitialMount to false after first render, if not already done
  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
    }
  }, []);
  
   // Keyboard input listeners
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      keysPressed.current[event.key.toLowerCase()] = true;
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      keysPressed.current[event.key.toLowerCase()] = false;
    };

    if (!isMobileMode) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [isMobileMode]);

  // Game loop for smooth movement
  const gameLoop = useCallback(() => {
    const isMovementPaused = !isGameActive || activeMinigame !== null;
    if (!isMovementPaused) {
        handleStateUpdate(prevState => {
            let { x: posX, y: posY } = prevState.playerPosition;
            let { x: velX, y: velY } = prevState.playerVelocity;

            const acceleration = 0.5;
            const friction = 0.9;
            const maxSpeed = 7;

            // Keyboard input (PC mode)
            if (!isMobileMode) {
                if (keysPressed.current['w']) velY -= acceleration;
                if (keysPressed.current['s']) velY += acceleration;
                if (keysPressed.current['a']) velX -= acceleration;
                if (keysPressed.current['d']) velX += acceleration;
            }

            // Joystick input (Mobile mode)
            if (isMobileMode && (joystickVector.x !== 0 || joystickVector.y !== 0)) {
                velX += joystickVector.x * acceleration;
                velY += joystickVector.y * acceleration;
            }

            // Cap speed
            const speed = Math.hypot(velX, velY);
            if (speed > maxSpeed) {
                velX = (velX / speed) * maxSpeed;
                velY = (velY / speed) * maxSpeed;
            }

            // Apply friction
            velX *= friction;
            velY *= friction;
            
            // Stop if velocity is very low
            if (Math.abs(velX) < 0.1) velX = 0;
            if (Math.abs(velY) < 0.1) velY = 0;

            // Update position
            posX += velX;
            posY += velY;

            // Clamp position to world bounds
            const clampedX = Math.max(PLAYER_SIZE / 2, Math.min(posX, WORLD_WIDTH - PLAYER_SIZE / 2));
            const clampedY = Math.max(PLAYER_SIZE / 2, Math.min(posY, WORLD_HEIGHT - PLAYER_SIZE / 2));

            // Bounce off walls
            if (posX !== clampedX) velX *= -0.5;
            if (posY !== clampedY) velY *= -0.5;

            return {
                ...prevState,
                playerPosition: { x: clampedX, y: clampedY },
                playerVelocity: { x: velX, y: velY },
            };
        });
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [isGameActive, activeMinigame, joystickVector, handleStateUpdate, isMobileMode]);
  
  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameLoop]);
  
  // Camera follow animation and player clamping
  useEffect(() => {
    if (scope.current) {
      // Calculate camera's ideal top-left corner position to center the player
      const idealCameraX = -playerPosition.x + SHIP_WIDTH / 2;
      const idealCameraY = -playerPosition.y + SHIP_HEIGHT / 2;

      // Clamp the camera's position so it doesn't show areas outside the world
      const clampedCameraX = Math.max(-(WORLD_WIDTH - SHIP_WIDTH), Math.min(0, idealCameraX));
      const clampedCameraY = Math.max(-(WORLD_HEIGHT - SHIP_HEIGHT), Math.min(0, idealCameraY));

      // Animate the camera to its new clamped position
      animate(scope.current, { x: clampedCameraX, y: clampedCameraY }, { type: "spring", stiffness: 100, damping: 20, mass: 0.5 });
      
      // Now, determine the visible bounds for the player based on the *actual* camera position
      handleStateUpdate(prevState => {
        const playerMinX = -clampedCameraX + (PLAYER_SIZE / 2);
        const playerMaxX = -clampedCameraX + SHIP_WIDTH - (PLAYER_SIZE / 2);
        const playerMinY = -clampedCameraY + (PLAYER_SIZE / 2);
        const playerMaxY = -clampedCameraY + SHIP_HEIGHT - (PLAYER_SIZE / 2);

        const clampedPlayerX = Math.max(playerMinX, Math.min(prevState.playerPosition.x, playerMaxX));
        const clampedPlayerY = Math.max(playerMinY, Math.min(prevState.playerPosition.y, playerMaxY));
        
        // Only update state if there's a change to prevent potential loops
        if (clampedPlayerX !== prevState.playerPosition.x || clampedPlayerY !== prevState.playerPosition.y) {
           return {
            ...prevState,
            playerPosition: {
              x: clampedPlayerX,
              y: clampedPlayerY,
            }
          };
        }
        return prevState;
      });
    }
  }, [playerPosition, animate, scope, handleStateUpdate]);
  
  const onMinigameClose = (type: 'navigation' | 'defense' | 'life-support', success: boolean, manualClose: boolean) => {
    setActiveMinigame(null);

    if (passiveDamageTimerRef.current) {
        clearInterval(passiveDamageTimerRef.current);
    }

    if (success) {
        const points = type === 'life-support' ? 50 : (type === 'navigation' ? 100 : 200);
        handleStateUpdate(prevState => ({
          ...prevState,
          score: prevState.score + points,
          isUnderAsteroidAttack: type === 'defense' ? false : prevState.isUnderAsteroidAttack,
          isNavCourseDeviating: type === 'navigation' ? false : prevState.isNavCourseDeviating,
          isLifeSupportFailing: type === 'life-support' ? false : prevState.isLifeSupportFailing,
          eventIntensity: Math.min(10, prevState.eventIntensity + 0.5),
        }));
        toast({ title: "Success!", description: `+${points} points!`, className: "border-green-500" });

    } else if (!manualClose) {
        takeHit();
        handleStateUpdate(prevState => ({...prevState, eventIntensity: Math.max(1, prevState.eventIntensity - 1) }));
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
  const engineTimePercentage = (engineTime / ENGINE_OVERLOAD_SECONDS) * 100;
  const interactionText = interaction?.prompt.replace('Press [E] to ', '');

  return (
    <div
      className="bg-black font-body text-foreground flex flex-col items-center shadow-2xl shadow-primary/40 origin-center relative"
      style={{
        width: TOTAL_WIDTH,
        height: TOTAL_HEIGHT,
        maxWidth: '100%',
        maxHeight: '100%',
        aspectRatio: `${TOTAL_WIDTH} / ${TOTAL_HEIGHT}`,
      }}
    >
      <motion.div
          className="w-full h-full flex flex-col"
          animate={{ x: isShaking ? [-5, 5, -5, 5, -2, 2, 0] : 0 }}
          transition={{ duration: 0.5 }}
      >
      {/* HUD */}
      <div
        className="w-full bg-background/80 border-b-2 border-primary-foreground/20 backdrop-blur-sm z-20"
        style={{ height: HUD_HEIGHT }}
      >
        <div className="p-2 flex flex-col justify-between h-full">
            {/* Top Row: Journey & Engine Progress */}
            <div className="flex items-center gap-4 w-full">
              <Rocket className="w-5 h-5 text-accent" />
              <Progress value={journeyProgressPercentage} className="w-full h-2 [&>*]:bg-green-400" />
              <Globe className="w-5 h-5 text-green-400" />
              <Fan className="w-5 h-5 text-destructive" />
              <Progress value={engineTimePercentage} className="w-full h-2 bg-destructive/30 [&>*]:bg-destructive" />
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
                <div className="flex items-center gap-4">
                  <Badge
                    variant="outline"
                    className="text-lg py-1 px-4 border-accent"
                  >
                    Score: {score}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-cyan-400" />
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
              {!isMobileMode && (
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
        className="relative bg-card/50 border-2 border-primary rounded-lg shadow-2xl shadow-primary/20 overflow-hidden"
        style={{ width: SHIP_WIDTH, height: SHIP_HEIGHT }}
      >
        <Starfield />
         <motion.div ref={scope} className="absolute top-0 left-0 bg-grid-pattern" style={{width: WORLD_WIDTH, height: WORLD_HEIGHT}}>
            {/* World Content */}
            <div className="absolute inset-0" style={{backgroundSize: '40px 40px'}}></div>

            <AnimatePresence>
              {interaction && !isMobileMode && (
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
                      isLifeSupportFailing ? 'text-red-500 animate-pulse' : 'text-green-500'
                    }`}
                  />
                </div>
              </div>
              <span className="text-xs mt-1 text-muted-foreground">
                {ZONES.LIFE_SUPPORT.name}
              </span>
            </div>

            {/* Player */}
            <motion.div
                className="absolute flex items-center justify-center rounded-full bg-accent z-10"
                animate={{ 
                    x: playerPosition.x, 
                    y: playerPosition.y 
                }}
                transition={{ type: "tween", ease: "linear", duration: 0 }}
                style={{
                    width: PLAYER_SIZE,
                    height: PLAYER_SIZE,
                    boxShadow: '0 0 15px hsl(var(--accent))',
                    transform: 'translate(-50%, -50%)',
                    top: 0,
                    left: 0,
                }}
                >
                <div 
                    className="w-4/5 h-2/5 bg-accent-foreground/50 rounded-full"
                    style={{
                    boxShadow: 'inset 0 0 5px rgba(0,0,0,0.4)',
                    }}
                ></div>
            </motion.div>
        </motion.div>
        
        <AnimatePresence>
            {isPaused && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-30"
            >
                <div className="text-center flex flex-col gap-4">
                  <h3 className="text-5xl font-bold text-accent">PAUSED</h3>
                  <Button className="mt-4" onClick={() => setIsPaused(false)}>
                      Resume
                  </Button>
                  <Button variant="outline" onClick={onReturnToMenu}>
                    <Home className="mr-2 h-4 w-4" />
                    Return to Menu
                  </Button>
                </div>
            </motion.div>
            )}
        </AnimatePresence>
      </div>
      </motion.div>

      {/* Mobile Controls Overlay */}
      {isMobileMode && isGameActive && (
        <div className="absolute inset-0 w-full h-full pointer-events-none z-40">
            <div className="absolute bottom-5 left-5 pointer-events-auto">
              <Joystick onMove={setJoystickVector} />
            </div>
          
            {interaction && (
            <div className="absolute bottom-8 right-5 pointer-events-auto">
              <Button
                onClick={triggerInteraction}
                className="rounded-full w-20 h-20 text-lg bg-accent/80 hover:bg-accent border-2 border-accent-foreground/50 shadow-lg backdrop-blur-sm"
              >
                {interactionText}
              </Button>
            </div>
            )}
        </div>
      )}


        <NavigationMinigame
          open={activeMinigame === 'navigation'}
          onClose={(success, manual) => onMinigameClose('navigation', success, manual)}
          difficulty={eventIntensity}
        />
        <AsteroidDefenseMinigame
          open={activeMinigame === 'defense'}
          onClose={(success) => onMinigameClose('defense', success, false)}
          difficulty={eventIntensity}
          isUnderAttack={isUnderAsteroidAttack}
        />
        <LifeSupportMinigame
          open={activeMinigame === 'life-support'}
          onClose={(success, manual) => onMinigameClose('life-support', success, manual)}
          difficulty={eventIntensity}
        />
    </div>
  );
}





