"use client";

import { useState, useCallback } from 'react';
import GameUI from '@/components/game-ui';
import StartScreen from '@/components/start-screen';
import GameOverScreen from '@/components/game-over-screen';

type GameState = 'start' | 'playing' | 'game-over';

export default function Home() {
  const [gameState, setGameState] = useState<GameState>('start');
  const [score, setScore] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  const handleStartGame = useCallback(() => {
    setScore(0);
    setGameWon(false);
    setCustomMessage('');
    setGameState('playing');
  }, []);

  const handleGameWin = useCallback((finalScore: number) => {
    setScore(finalScore);
    setGameWon(true);
    setGameState('game-over');
  }, []);

  const handleGameLose = useCallback((finalScore: number, message: string) => {
    setScore(finalScore);
    setGameWon(false);
    setCustomMessage(message);
    setGameState('game-over');
  }, []);
  
  const handleRestart = useCallback(() => {
      setGameState('start');
  }, []);

  const renderGameState = () => {
    switch (gameState) {
      case 'start':
        return <StartScreen onStart={handleStartGame} />;
      case 'playing':
        return <GameUI onGameWin={handleGameWin} onGameLose={handleGameLose} initialScore={score} />;
      case 'game-over':
        return <GameOverScreen score={score} onRestart={handleRestart} won={gameWon} customMessage={customMessage} />;
      default:
        return <StartScreen onStart={handleStartGame} />;
    }
  };

  return (
    <main className="w-screen h-screen bg-black overflow-hidden flex items-center justify-center">
      {renderGameState()}
    </main>
  );
}