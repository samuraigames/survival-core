"use client";

import React, { createContext, useState, ReactNode, useCallback } from 'react';

type GameState = 'start' | 'playing' | 'paused' | 'game-over';

interface GameContextType {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  eventIntensity: number;
  setEventIntensity: React.Dispatch<React.SetStateAction<number>>;
  resetGame: () => void;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [gameState, setGameState] = useState<GameState>('start');
  const [score, setScore] = useState(0);
  const [eventIntensity, setEventIntensity] = useState(1);

  const resetGame = useCallback(() => {
    setScore(0);
    setEventIntensity(1);
    setGameState('start');
  }, []);

  return (
    <GameContext.Provider value={{
      gameState, setGameState,
      score, setScore,
      eventIntensity, setEventIntensity,
      resetGame
    }}>
      {children}
    </GameContext.Provider>
  );
};
