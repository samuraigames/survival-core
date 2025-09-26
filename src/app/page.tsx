"use client";

import { useState, useCallback, useEffect } from 'react';
import GameUI from '@/components/game-ui';
import StartScreen from '@/components/start-screen';
import GameOverScreen from '@/components/game-over-screen';
import { useIsMobile } from '@/hooks/use-mobile';
import OrientationLock from '@/components/orientation-lock';

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
  playerPosition: { x: 600, y: 450 }, // Centered in a 1200x900 world
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
  const isMobile = useIsMobile();

  useEffect(() => {
    // Default to mobile mode if on a mobile device, otherwise PC mode.
    setIsMobileMode(isMobile);
  }, [isMobile]);

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
          />
        );
    }
  };

  return (
    <main className="w-screen bg-black flex items-center justify-center">
      <OrientationLock isMobile={isMobile}>
        {renderGameStatus()}
      </OrientationLock>
    </main>
  );
}
