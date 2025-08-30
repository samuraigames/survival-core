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
import { Gamepad2, Wrench, Shield, Clock, Pause, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';

const SHIP_WIDTH = 800;
const SHIP_HEIGHT = 600;
const HUD_HEIGHT = 80;
const GAME_AREA_HEIGHT = SHIP_HEIGHT - HUD_HEIGHT;
const PLAYER_SIZE = 40;
const INTERACTION_DISTANCE = 70;
const WIN_TIME_SECONDS = 20 * 60; // 20 minutes to win

const ZONES = {
  NAV_CONSOLE: { x: SHIP_WIDTH / 4, y: 100, name: "Navigation" },
  ELECTRICAL_PANEL: { x: SHIP_WIDTH / 2, y: GAME_AREA_HEIGHT - 80, name: "Electrical" },
  DEFENSE_CONSOLE: { x: SHIP_WIDTH * 0.75, y: 100, name: "Defense" },
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
  const { toast } = useToast();
  const gameLoopRef = useRef<NodeJS.Timeout>();
  const lastEventTimeRef = useRef<number>(Date.now());
  const playerSkillRef = useRef(1);
  const gameTimerRef = useRef<NodeJS.Timeout>();

  const isGameActive = gameState === 'playing' && !isPaused && !activeMinigame;

  const handleInteraction = useCallback((e: KeyboardEvent) => {
    if (gameState !== 'playing' || isPaused || activeMinigame) return;
    if (e.key === 'e' || e.key === 'E') {
      if (interaction?.zone === 'NAV_CONSOLE') {
        setActiveMinigame('navigation');
      } else if (interaction?.zone === 'ELECTRICAL_PANEL' && engineStatus === 'broken') {
        setActiveMinigame('engine');
      } else if (interaction?.zone === 'DEFENSE_CONSOLE') {
        setActiveMinigame('defense');
      }
    }
  }, [gameState, activeMinigame, interaction, engineStatus, isPaused]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleInteraction);
    return () => window.removeEventListener('keydown', handleInteraction);
  }, [handleInteraction]);

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

  const runGameLoop = useCallback(async () => {
    if (!isGameActive) return;
    try {
      const difficulty = await adjustDifficulty({
        playerSkillLevel: playerSkillRef.current,
        timeSinceLastEvent: (Date.now() - lastEventTimeRef.current) / 1000,
        currentScore: score,
      });

      setEventIntensity(difficulty.eventIntensity);
      
      const nextEventDelay = difficulty.suggestedDelay * 1000;
      gameLoopRef.current = setTimeout(() => {
        if (!isGameActive) return;
        const eventType = Math.random();
        if (eventType < 0.4 && engineStatus === 'ok') {
          setEngineStatus('broken');
          toast({ title: "Warning!", description: "Electrical panel malfunction!", variant: "destructive" });
        } else if (eventType < 0.7) {
          setActiveMinigame('navigation');
          toast({ title: "Alert!", description: "Navigation challenge incoming!" });
        } else {
            setActiveMinigame('defense');
            toast({ title: "INCOMING!", description: "Asteroid field detected!" });
        }
        lastEventTimeRef.current = Date.now();
        runGameLoop();
      }, nextEventDelay);

    } catch (error) {
      console.error("AI Difficulty Adjustment Failed:", error);
      // Fallback timer if AI fails, to prevent the game from stopping.
      gameLoopRef.current = setTimeout(runGameLoop, 20000); 
    }
  }, [isGameActive, score, engineStatus, setEngineStatus, setEventIntensity, toast]);

  useEffect(() => {
    if (isGameActive) {
      lastEventTimeRef.current = Date.now();
      runGameLoop();

      gameTimerRef.current = setInterval(() => {
        setGameTime(t => {
            const newTime = t + 1;
            if (newTime >= WIN_TIME_SECONDS) {
                setGameState('game-over');
                setGameWon(true);
                if (gameTimerRef.current) clearInterval(gameTimerRef.current);
                if (gameLoopRef.current) clearTimeout(gameLoopRef.current);
            }
            return newTime;
        });
      }, 1000);
    }
    return () => {
      if (gameLoopRef.current) clearTimeout(gameLoopRef.current);
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, [isGameActive, runGameLoop]);

  useEffect(() => {
    const checkInteractions = () => {
      if (!isGameActive) {
        if (interaction) setInteraction(null);
        return;
      }
      
      const navDist = Math.hypot(playerPosition.x - ZONES.NAV_CONSOLE.x, playerPosition.y - ZONES.NAV_CONSOLE.y);
      const electricalDist = Math.hypot(playerPosition.x - ZONES.ELECTRICAL_PANEL.x, playerPosition.y - ZONES.ELECTRICAL_PANEL.y);
      const defenseDist = Math.hypot(playerPosition.x - ZONES.DEFENSE_CONSOLE.x, playerPosition.y - ZONES.DEFENSE_CONSOLE.y);
  
      let newInteraction: {prompt: string, zone: ZoneName} | null = null;
  
      if (defenseDist < INTERACTION_DISTANCE) {
          newInteraction = { prompt: `Press [E] to use ${ZONES.DEFENSE_CONSOLE.name}`, zone: 'DEFENSE_CONSOLE' };
      } else if (navDist < INTERACTION_DISTANCE) {
          newInteraction = { prompt: `Press [E] to use ${ZONES.NAV_CONSOLE.name}`, zone: 'NAV_CONSOLE' };
      } else if (electricalDist < INTERACTION_DISTANCE) {
        if (engineStatus === 'broken') {
          newInteraction = { prompt: `Press [E] to repair ${ZONES.ELECTRICAL_PANEL.name}`, zone: 'ELECTRICAL_PANEL' };
        } else {
          newInteraction = { prompt: `${ZONES.ELECTRICAL_PANEL.name}: All systems nominal.`, zone: 'ELECTRICAL_PANEL' };
        }
      }
      
      if (newInteraction?.prompt !== interaction?.prompt) {
        setInteraction(newInteraction);
      }
    };

    const intervalId = setInterval(checkInteractions, 100);

    return () => clearInterval(intervalId);

  }, [playerPosition, engineStatus, isGameActive, interaction]);

  const handleStartGame = () => {
    resetGame();
    setPlayerPosition({ x: SHIP_WIDTH / 2, y: GAME_AREA_HEIGHT / 2 });
    setGameState('playing');
    setShipHits(0);
    setGameTime(0);
    setGameWon(false);
    setIsPaused(false);
  };
  
  if (gameState === 'start') {
    return <StartScreen onStart={handleStartGame} />;
  }
  
  if (gameState === 'game-over') {
    return <GameOverScreen score={score} onRestart={handleStartGame} won={gameWon} />;
  }

  const onMinigameClose = (type: 'engine' | 'navigation' | 'defense', success: boolean) => {
    setActiveMinigame(null);
    if (success) {
      const points = type === 'engine' ? 150 : (type === 'navigation' ? 100 : 200);
      setScore(s => s + points * Math.floor(eventIntensity / 2));
      toast({ title: "Success!", description: `+${points * Math.floor(eventIntensity / 2)} points!`, className: "border-green-500" });
      if (type === 'engine') setEngineStatus('ok');
      playerSkillRef.current = Math.min(10, playerSkillRef.current + 0.5);
    } else {
      if (type === 'engine') {
        setGameState('game-over');
      } else if(type === 'defense' || type === 'navigation') {
        takeHit();
        playerSkillRef.current = Math.max(1, playerSkillRef.current - 1);
        toast({ title: "Failed!", description: "Ship integrity compromised.", variant: 'destructive'});
      }
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
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

  return (
    <motion.div 
      className="w-full h-full flex items-center justify-center font-body text-foreground bg-black"
      animate={{ x: isShaking ? [-5, 5, -5, 5, -2, 2, 0] : 0 }}
      transition={{ duration: 0.5 }}
    >
      <div
        className="relative bg-card/50 border-2 border-primary rounded-lg shadow-2xl shadow-primary/20 overflow-hidden flex flex-col"
        style={{ width: SHIP_WIDTH, height: SHIP_HEIGHT }}
      >
        {/* HUD */}
        <div className="w-full bg-background/80 border-b-2 border-primary-foreground/20 backdrop-blur-sm z-20" style={{ height: HUD_HEIGHT}}>
          <div className="p-4 flex justify-between items-center h-full">
            <div className='flex items-center gap-4'>
              <Badge variant="outline" className="text-lg py-2 px-4 border-accent">Score: {score}</Badge>
               <Button variant="outline" size="icon" onClick={() => setIsPaused(!isPaused)}>
                {isPaused ? <Play /> : <Pause />}
                <span className="sr-only">{isPaused ? 'Resume' : 'Pause'}</span>
              </Button>
            </div>
            <div className="flex items-center gap-4">
               <Badge variant="secondary" className="text-md py-2 px-4">
                <Shield className="mr-2 h-4 w-4 text-cyan-400"/>
                Ship Integrity: <span className="font-bold ml-1">{100 - shipHits * 10}%</span>
              </Badge>
              <Badge variant={engineStatus === 'ok' ? 'secondary' : 'destructive'} className="text-md py-2 px-4 transition-colors duration-500">
                <Wrench className="mr-2 h-4 w-4"/>
                Electrical: <span className="font-bold ml-1">{engineStatus.toUpperCase()}</span>
              </Badge>
               <Badge variant="secondary" className="text-md py-2 px-4">
                <Clock className="mr-2 h-4 w-4"/>
                Time: <span className="font-bold ml-1">{formatTime(gameTime)}</span>
              </Badge>
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

        {/* Game Area */}
        <div className="relative w-full bg-grid-pattern bg-repeat" style={{ height: GAME_AREA_HEIGHT }}>
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
              <div className="w-full h-full bg-slate-800 rounded-sm flex items-center justify-center">
                  <div className="w-16 h-8 bg-cyan-400/20 rounded-sm border border-cyan-400 animate-pulse"></div>
              </div>
            </div>
            <span className="text-xs mt-1 text-muted-foreground">{ZONES.NAV_CONSOLE.name}</span>
          </div>
          
          {/* Defense Console */}
          <div className="absolute flex flex-col items-center" style={{ left: ZONES.DEFENSE_CONSOLE.x, top: ZONES.DEFENSE_CONSOLE.y, transform: 'translate(-50%, -50%)'}}>
            <div className="w-24 h-16 bg-slate-700 border-2 border-slate-500 rounded-md p-1">
              <div className="w-full h-full bg-slate-800 rounded-sm flex items-center justify-center">
                  <div className="w-16 h-8 bg-red-500/20 rounded-sm border border-red-500 animate-pulse"></div>
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
            isMovementPaused={!isGameActive}
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

    