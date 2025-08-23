"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Player from './player';
import { useGame } from '@/hooks/use-game';
import { adjustDifficulty } from '@/ai/flows/adjust-difficulty';
import { useToast } from "@/hooks/use-toast";
import EngineRepairMinigame from './engine-repair-minigame';
import NavigationMinigame from './navigation-minigame';
import StartScreen from './start-screen';
import { Badge } from './ui/badge';
import { Zap, Map, Wrench, ChevronUp, ChevronLeft, ChevronDown, ChevronRight, Gamepad2 } from 'lucide-react';

const SHIP_WIDTH = 800;
const SHIP_HEIGHT = 500;
const PLAYER_SIZE = 40;
const INTERACTION_DISTANCE = 50;

const ZONES = {
  NAV_CONSOLE: { x: 50, y: 50, name: "Navigation Console" },
  ENGINE_ROOM: { x: 700, y: 400, name: "Engine" },
};

export default function GameUI() {
  const { gameState, setGameState, score, setScore, engineStatus, setEngineStatus, eventIntensity, setEventIntensity } = useGame();
  const [playerPosition, setPlayerPosition] = useState({ x: SHIP_WIDTH / 2, y: SHIP_HEIGHT / 2 });
  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null);
  const [activeMinigame, setActiveMinigame] = useState<'engine' | 'navigation' | null>(null);
  const { toast } = useToast();
  const gameLoopRef = useRef<NodeJS.Timeout>();
  const lastEventTimeRef = useRef<number>(Date.now());
  const playerSkillRef = useRef(1);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameState !== 'playing' || activeMinigame) return;

    setPlayerPosition(prev => {
      let { x, y } = prev;
      const speed = 10;
      if (e.key === 'w' || e.key === 'W') y -= speed;
      if (e.key === 's' || e.key === 'S') y += speed;
      if (e.key === 'a' || e.key === 'A') x -= speed;
      if (e.key === 'd' || e.key === 'D') x += speed;

      return {
        x: Math.max(0, Math.min(x, SHIP_WIDTH - PLAYER_SIZE)),
        y: Math.max(0, Math.min(y, SHIP_HEIGHT - PLAYER_SIZE)),
      };
    });

    if (e.key === 'e' || e.key === 'E') {
      if (interactionPrompt?.includes(ZONES.NAV_CONSOLE.name)) {
        setActiveMinigame('navigation');
      } else if (interactionPrompt?.includes(ZONES.ENGINE_ROOM.name) && engineStatus === 'broken') {
        setActiveMinigame('engine');
      }
    }
  }, [gameState, activeMinigame, interactionPrompt, engineStatus]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  const runGameLoop = useCallback(async () => {
    try {
      const difficulty = await adjustDifficulty({
        playerSkillLevel: playerSkillRef.current,
        timeSinceLastEvent: (Date.now() - lastEventTimeRef.current) / 1000,
        currentScore: score,
      });

      setEventIntensity(difficulty.eventIntensity);
      
      const nextEventDelay = difficulty.suggestedDelay * 1000;
      gameLoopRef.current = setTimeout(() => {
        const isMalfunction = Math.random() < 0.5; // 50/50 chance for now
        if (isMalfunction) {
          setEngineStatus('broken');
          toast({ title: "Warning!", description: "Engine malfunction detected!", variant: "destructive" });
        } else {
          setActiveMinigame('navigation');
          toast({ title: "Alert!", description: "Navigation challenge incoming!" });
        }
        lastEventTimeRef.current = Date.now();
        runGameLoop();
      }, nextEventDelay);

    } catch (error) {
      console.error("AI Difficulty Adjustment Failed:", error);
      // Fallback to a simple timer
      gameLoopRef.current = setTimeout(runGameLoop, 20000);
    }
  }, [score, setEngineStatus, setEventIntensity, toast]);

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

    if (navDist < INTERACTION_DISTANCE) {
      setInteractionPrompt(`Press [E] to use ${ZONES.NAV_CONSOLE.name}`);
    } else if (engineDist < INTERACTION_DISTANCE) {
      if (engineStatus === 'broken') {
        setInteractionPrompt(`Press [E] to repair ${ZONES.ENGINE_ROOM.name}`);
      } else {
        setInteractionPrompt(`${ZONES.ENGINE_ROOM.name}: All systems nominal.`);
      }
    } else {
      setInteractionPrompt(null);
    }
  }, [playerPosition, engineStatus, gameState]);

  const handleStartGame = () => setGameState('playing');
  
  if (gameState === 'start') {
    return <StartScreen onStart={handleStartGame} />;
  }

  const onMinigameClose = (type: 'engine' | 'navigation', success: boolean) => {
    if (success) {
      const points = type === 'engine' ? 150 : 100;
      setScore(s => s + points * Math.floor(eventIntensity / 2));
      toast({ title: "Success!", description: `+${points} points!`, className: "border-green-500" });
      if (type === 'engine') setEngineStatus('ok');
      // Increase skill on success
      playerSkillRef.current = Math.min(10, playerSkillRef.current + 0.5);
    } else {
      // Decrease skill on failure
      playerSkillRef.current = Math.max(1, playerSkillRef.current - 1);
    }
    setActiveMinigame(null);
  };
  
  return (
    <div className="w-full h-full flex items-center justify-center font-body text-foreground">
      <div className="absolute top-4 left-4 flex gap-4 z-20">
        <Badge variant="outline" className="text-lg py-2 px-4 border-accent">Score: {score}</Badge>
        <Badge variant="secondary" className="text-lg py-2 px-4">Engine: <span className={engineStatus === 'ok' ? 'text-green-400' : 'text-red-400'}>{engineStatus.toUpperCase()}</span></Badge>
      </div>

      <div className="absolute top-4 right-4 text-sm text-muted-foreground z-20 flex items-center gap-2 bg-card p-2 rounded-lg border">
        <Gamepad2 className="w-5 h-5 text-accent"/>
        <div>
          <p>Move: <span className="font-bold text-foreground">W, A, S, D</span></p>
          <p>Interact: <span className="font-bold text-foreground">E</span></p>
        </div>
      </div>

      <div
        className="relative bg-card/50 border-2 border-primary rounded-lg shadow-2xl shadow-primary/20"
        style={{ width: SHIP_WIDTH, height: SHIP_HEIGHT }}
      >
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        {interactionPrompt && !activeMinigame && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/80 p-3 rounded-lg border text-accent font-headline animate-pulse">
            {interactionPrompt}
          </div>
        )}
        
        <div className="absolute top-2 left-2 p-2 border-b border-r border-dashed rounded-br-lg text-muted-foreground">Cockpit</div>
        <div className="absolute bottom-2 right-2 p-2 border-t border-l border-dashed rounded-tl-lg text-muted-foreground">Engine Room</div>

        <div className="absolute" style={{ left: ZONES.NAV_CONSOLE.x, top: ZONES.NAV_CONSOLE.y }}>
          <Map className="w-12 h-12 text-accent" />
        </div>

        <div className="absolute" style={{ left: ZONES.ENGINE_ROOM.x, top: ZONES.ENGINE_ROOM.y }}>
          <Wrench className={`w-12 h-12 transition-all duration-500 ${engineStatus === 'ok' ? 'text-green-400' : 'text-red-500 animate-engine-glow'}`} />
        </div>

        <Player position={playerPosition} size={PLAYER_SIZE} />
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
    </div>
  );
}
