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
import { Gamepad2, Wrench } from 'lucide-react';

const SHIP_WIDTH = 800;
const SHIP_HEIGHT = 600;
const HUD_HEIGHT = 80;
const GAME_AREA_HEIGHT = SHIP_HEIGHT - HUD_HEIGHT;
const PLAYER_SIZE = 40;
const INTERACTION_DISTANCE = 50;

const ZONES = {
  NAV_CONSOLE: { x: SHIP_WIDTH / 2 - 150, y: 100, name: "Navigation" },
  ENGINE_ROOM: { x: SHIP_WIDTH / 2, y: GAME_AREA_HEIGHT - 80, name: "Engine" },
  DEFENSE_CONSOLE: { x: SHIP_WIDTH / 2 + 150, y: 100, name: "Defense" },
};

export default function GameUI() {
  const { gameState, setGameState, score, setScore, engineStatus, setEngineStatus, eventIntensity, setEventIntensity, resetGame } = useGame();
  const [playerPosition, setPlayerPosition] = useState({ x: SHIP_WIDTH / 2, y: GAME_AREA_HEIGHT / 2 });
  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null);
  const [activeMinigame, setActiveMinigame] = useState<'engine' | 'navigation' | 'defense' | null>(null);
  const { toast } = useToast();
  const gameLoopRef = useRef<NodeJS.Timeout>();
  const lastEventTimeRef = useRef<number>(Date.now());
  const playerSkillRef = useRef(1);

  const handleInteraction = useCallback((e: KeyboardEvent) => {
    if (gameState !== 'playing' || activeMinigame) return;
    if (e.key === 'e' || e.key === 'E') {
      if (interactionPrompt?.includes(ZONES.NAV_CONSOLE.name)) {
        setActiveMinigame('navigation');
      } else if (interactionPrompt?.includes(ZONES.ENGINE_ROOM.name) && engineStatus === 'broken') {
        setActiveMinigame('engine');
      } else if (interactionPrompt?.includes(ZONES.DEFENSE_CONSOLE.name)) {
        setActiveMinigame('defense');
      }
    }
  }, [gameState, activeMinigame, interactionPrompt, engineStatus]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleInteraction);
    return () => window.removeEventListener('keydown', handleInteraction);
  }, [handleInteraction]);

  const runGameLoop = useCallback(async () => {
    if (gameState !== 'playing') return;
    try {
      const difficulty = await adjustDifficulty({
        playerSkillLevel: playerSkillRef.current,
        timeSinceLastEvent: (Date.now() - lastEventTimeRef.current) / 1000,
        currentScore: score,
      });

      setEventIntensity(difficulty.eventIntensity);
      
      const nextEventDelay = difficulty.suggestedDelay * 1000;
      gameLoopRef.current = setTimeout(() => {
        if (gameState !== 'playing') return;
        const eventType = Math.random();
        if (eventType < 0.4 && engineStatus === 'ok') {
          setEngineStatus('broken');
          toast({ title: "Warning!", description: "Engine malfunction detected!", variant: "destructive" });
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
      gameLoopRef.current = setTimeout(runGameLoop, 20000); // Fallback timer
    }
  }, [score, setEngineStatus, setEventIntensity, toast, gameState, engineStatus]);

  useEffect(() => {
    if (gameState === 'playing') {
      lastEventTimeRef.current = Date.now();
      runGameLoop();
    }
    return () => {
      if (gameLoopRef.current) clearTimeout(gameLoopRef.current);
    };
  }, [gameState, runGameLoop]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const navDist = Math.hypot(playerPosition.x - ZONES.NAV_CONSOLE.x, playerPosition.y - ZONES.NAV_CONSOLE.y);
    const engineDist = Math.hypot(playerPosition.x - ZONES.ENGINE_ROOM.x, playerPosition.y - ZONES.ENGINE_ROOM.y);
    const defenseDist = Math.hypot(playerPosition.x - ZONES.DEFENSE_CONSOLE.x, playerPosition.y - ZONES.DEFENSE_CONSOLE.y);

    let promptToShow = null;

    if (defenseDist < INTERACTION_DISTANCE) {
      promptToShow = `Press [E] to use ${ZONES.DEFENSE_CONSOLE.name}`;
    } else if (navDist < INTERACTION_DISTANCE) {
      promptToShow = `Press [E] to use ${ZONES.NAV_CONSOLE.name}`;
    } else if (engineDist < INTERACTION_DISTANCE) {
      if (engineStatus === 'broken') {
        promptToShow = `Press [E] to repair ${ZONES.ENGINE_ROOM.name}`;
      } else {
        promptToShow = `${ZONES.ENGINE_ROOM.name}: All systems nominal.`;
      }
    }
    setInteractionPrompt(promptToShow);

  }, [playerPosition, engineStatus, gameState]);

  const handleStartGame = () => {
    resetGame();
    setPlayerPosition({ x: SHIP_WIDTH / 2, y: GAME_AREA_HEIGHT / 2 });
    setGameState('playing');
  };
  
  if (gameState === 'start') {
    return <StartScreen onStart={handleStartGame} />;
  }
  
  if (gameState === 'game-over') {
    return <GameOverScreen score={score} onRestart={handleStartGame} />;
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
      if(type === 'defense') {
        setGameState('game-over');
      } else {
        playerSkillRef.current = Math.max(1, playerSkillRef.current - 1);
        toast({ title: "Failed!", description: "System integrity reduced.", variant: 'destructive'});
      }
    }
  };
  
  return (
    <div className="w-full h-full flex items-center justify-center font-body text-foreground bg-black">
      <div
        className="relative bg-card/50 border-2 border-primary rounded-lg shadow-2xl shadow-primary/20 overflow-hidden flex flex-col"
        style={{ width: SHIP_WIDTH, height: SHIP_HEIGHT }}
      >
        {/* HUD */}
        <div className="w-full bg-background/80 border-b-2 border-primary-foreground/20 backdrop-blur-sm z-20" style={{ height: HUD_HEIGHT}}>
          <div className="p-4 flex justify-between items-center h-full">
            <div>
              <Badge variant="outline" className="text-lg py-2 px-4 border-accent">Score: {score}</Badge>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={engineStatus === 'ok' ? 'secondary' : 'destructive'} className="text-md py-2 px-4 transition-colors duration-500">
                <Wrench className="mr-2 h-4 w-4"/>
                Engine: <span className="font-bold ml-1">{engineStatus.toUpperCase()}</span>
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
          {interactionPrompt && !activeMinigame && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/80 p-3 rounded-lg border text-accent font-headline animate-pulse z-20">
              {interactionPrompt}
            </div>
          )}
          
          <div className="absolute top-2 left-2 p-2 border-b border-r border-dashed rounded-br-lg text-muted-foreground text-sm z-0">Cockpit</div>
          <div className="absolute bottom-2 right-2 p-2 border-t border-l border-dashed rounded-tl-lg text-muted-foreground text-sm z-0">Engine Room</div>

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

          {/* Engine Room Console */}
          <div className="absolute flex flex-col items-center" style={{ left: ZONES.ENGINE_ROOM.x, top: ZONES.ENGINE_ROOM.y, transform: 'translate(-50%, -50%)' }}>
            <div className={`w-24 h-32 bg-slate-800 border-2 rounded-lg p-2 flex flex-col justify-between ${engineStatus === 'ok' ? 'border-green-500' : 'border-red-500 animate-engine-glow'}`}>
                <div className="h-4 bg-slate-600 rounded-sm"></div>
                <div className="h-12 bg-slate-700 rounded-md"></div>
                <div className="h-4 bg-slate-600 rounded-sm"></div>
            </div>
            <span className="text-xs mt-1 text-muted-foreground">{ZONES.ENGINE_ROOM.name}</span>
          </div>

          <Player
            position={playerPosition}
            onPositionChange={setPlayerPosition}
            size={PLAYER_SIZE}
            bounds={{ width: SHIP_WIDTH, height: GAME_AREA_HEIGHT }}
            isMovementPaused={!!activeMinigame}
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
    </div>
  );
}
