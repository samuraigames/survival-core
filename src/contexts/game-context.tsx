"use client";

import React, { createContext, useState, ReactNode, useCallback } from 'react';

type GameState = 'start' | 'playing' | 'paused' | 'game-over';
type EngineStatus = 'ok' | 'broken';

interface GameContextType {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  engineStatus: EngineStatus;
  setEngineStatus: React.Dispatch<React.SetStateAction<EngineStatus>>;
  eventIntensity: number;
  setEventIntensity: React.Dispatch<React.SetStateAction<number>>;
  resetGame: () => void;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [gameState, setGameState] = useState<GameState>('start');
  const [score, setScore] = useState(0);
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('ok');
  const [eventIntensity, setEventIntensity] = useState(1);

  const resetGame = useCallback(() => {
    setScore(0);
    setEngineStatus('ok');
    setEventIntensity(1);
    setGameState('start');
  }, []);

  return (
    <GameContext.Provider value={{
      gameState, setGameState,
      score, setScore,
      engineStatus, setEngineStatus,
      eventIntensity, setEventIntensity,
      resetGame
    }}>
      {children}
    </GameContext.Provider>
  );
};
