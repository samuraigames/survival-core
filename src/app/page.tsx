
"use client";

import { useState, useCallback, useEffect } from 'react';
import GameUI from '@/components/game-ui';
import StartScreen from '@/components/start-screen';
import GameOverScreen from '@/components/game-over-screen';
import OrientationLock from '@/components/orientation-lock';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw } from 'lucide-react';

const MOBILE_BREAKPOINT = 768;
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const checkIsMobile = () => {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return !!isMobile;
};

type GameStatus = 'start' | 'playing' | 'game-over';

const initialGameState = {
  score: 0,
  gameTime: 0,
  engineTime: 600, // ENGINE_OVERLOAD_SECONDS
  shipHits: 0,
  eventIntensity: 1,
  isUnderAsteroidAttack: false,
  isNavCourseDeviating: false,
  isLifeSupportFailing: false,
  playerPosition: { x: 600, y: 450 },
  playerVelocity: { x: 0, y: 0 },
};

export type GameState = typeof initialGameState;

export default function Home() {
  const [gameStatus, setGameStatus] = useState<GameStatus>('start');
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [gameWon, setGameWon] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [isGameInProgress, setIsGameInProgress] = useState(false);
  const [isMobileMode, setIsMobileMode] = useState(false);
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const isMobileDevice = window.innerWidth < MOBILE_BREAKPOINT;
    setIsMobileMode(isMobileDevice);
    if (isMobileDevice) {
      setShowRotatePrompt(true);
    }
  }, []);

  const handleContinueGame = useCallback(() => {
    setGameStatus('playing');
  }, []);

  const handleNewGame = useCallback(() => {
    setGameState(initialGameState);
    setGameWon(false);
    setCustomMessage('');
    setIsGameInProgress(true);
    setGameStatus('playing');
  }, []);
  
  const handleReturnToMenu = useCallback(() => {
    setGameStatus('start');
  }, []);

  const handleGameWin = useCallback((finalState: GameState) => {
    setGameState(finalState);
    setGameWon(true);
    setIsGameInProgress(false);
    setGameStatus('game-over');
  }, []);

  const handleGameLose = useCallback((finalState: GameState, message: string) => {
    setGameState(finalState);
    setGameWon(false);
    setIsGameInProgress(false);
    setCustomMessage(message);
    setGameStatus('game-over');
  }, []);
  
  const handleRestart = useCallback(() => {
      setGameStatus('start');
      setIsGameInProgress(false);
      setGameState(initialGameState);
  }, []);

  const handleRotateAndLock = async () => {
    if (!isMobile) return;
    try {
        if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
        }
        // @ts-ignore
        if (screen.orientation && screen.orientation.lock) {
            // @ts-ignore
            await screen.orientation.lock('landscape');
        }
    } catch (err: any) {
        if (err.name === 'SecurityError' && err.message.includes('allow-orientation-lock')) {
          // This error is expected in sandboxed environments like Studio's preview.
          // We can safely ignore it as the feature will work in a real browser context.
        } else {
          console.error("Could not lock orientation:", err);
        }
    }
    setShowRotatePrompt(false);
  };

  const renderGameStatus = () => {
    switch (gameStatus) {
      case 'start':
        return (
          <StartScreen 
            onStart={handleContinueGame} 
            onNewGame={handleNewGame} 
            isGameInProgress={isGameInProgress}
            isMobileMode={isMobileMode}
            setIsMobileMode={setIsMobileMode}
            isMobile={isMobile}
          />
        );
      case 'playing':
        return (
          <GameUI
            initialState={gameState}
            onStateChange={setGameState}
            onGameWin={handleGameWin}
            onGameLose={handleGameLose}
            onReturnToMenu={handleReturnToMenu}
            isMobileMode={isMobileMode}
          />
        );
      case 'game-over':
        return <GameOverScreen score={gameState.score} onRestart={handleRestart} won={gameWon} customMessage={customMessage} />;
      default:
        return (
          <StartScreen 
            onStart={handleContinueGame} 
            onNewGame={handleNewGame} 
            isGameInProgress={isGameInProgress}
            isMobileMode={isMobileMode}
            setIsMobileMode={setIsMobileMode}
            isMobile={isMobile}
          />
        );
    }
  };

  return (
    <main className="w-screen h-screen bg-black flex items-center justify-center">
       <AnimatePresence>
        {showRotatePrompt && isMobile && (
          <motion.div
            key="rotate-prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleRotateAndLock}
            className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center text-center p-4 cursor-pointer"
          >
            <RotateCw className="w-16 h-16 text-accent mb-4 animate-spin" />
            <h1 className="text-2xl font-headline text-foreground mb-2">
              Tap to Enter Fullscreen
            </h1>
            <p className="text-lg text-muted-foreground">
              This game is best played in landscape mode.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <OrientationLock isMobile={isMobile}>
        {renderGameStatus()}
      </OrientationLock>
    </main>
  );
}
