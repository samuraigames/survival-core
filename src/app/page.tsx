
"use client";

import { useState, useCallback, useEffect } from 'react';
import GameUI from '@/components/game-ui';
import StartScreen from '@/components/start-screen';
import GameOverScreen from '@/components/game-over-screen';
import OrientationLock from '@/components/orientation-lock';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw } from 'lucide-react';
import { useFirebase, useUser, initiateAnonymousSignIn, useAuth, setDocumentNonBlocking, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { Level } from '@/lib/levels';
import { initialLevels } from '@/lib/levels';
import { initialAchievements } from '@/lib/achievements';
import { doc, getDoc } from 'firebase/firestore';
import type { PlayerProgress } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';


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
  shipHits: 0,
  eventIntensity: 1,
  isUnderAsteroidAttack: false,
  isNavCourseDeviating: false,
  isLifeSupportFailing: false,
  playerPosition: { x: 600, y: 450 },
  playerVelocity: { x: 0, y: 0 },
};

export type GameState = Omit<typeof initialGameState, 'engineTime'> & { engineTime: number };

function AppContent() {
  const [gameStatus, setGameStatus] = useState<GameStatus>('start');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameWon, setGameWon] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [isGameInProgress, setIsGameInProgress] = useState(false);
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);
  const isMobile = useIsMobile();
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);

  const { isUserLoading, user } = useUser();
  const { firestore } = useFirebase();
  const auth = useAuth();
  const [playerProgress, setPlayerProgress] = useState<PlayerProgress | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && !user) {
      initiateAnonymousSignIn(auth);
    }
  }, [isUserLoading, user, auth]);

  useEffect(() => {
    if (user && firestore) {
      const progressRef = doc(firestore, 'users', user.uid, 'playerProgress', 'main');
      getDoc(progressRef).then(docSnap => {
        if (docSnap.exists()) {
          setPlayerProgress(docSnap.data() as PlayerProgress);
        } else {
          const initialProgress: PlayerProgress = {
            unlockedLevelIds: ['easy'],
            completedAchievementIds: [],
            endCreditsUnlocked: false,
          };
          setDocumentNonBlocking(progressRef, initialProgress, { merge: false });
          setPlayerProgress(initialProgress);
        }
      }).catch(serverError => {
        const permissionError = new FirestorePermissionError({
          path: progressRef.path,
          operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
    }
  }, [user, firestore]);

  useEffect(() => {
    const isMobileDevice = window.innerWidth < MOBILE_BREAKPOINT;
    if (isMobileDevice) {
      setShowRotatePrompt(true);
    }
  }, []);

  const handleStartGame = useCallback((level: Level) => {
    setSelectedLevel(level);
    setGameState({
      ...initialGameState,
      engineTime: level.engineOverloadTime,
    });
    setGameWon(false);
    setCustomMessage('');
    setIsGameInProgress(true);
    setGameStatus('playing');
  }, []);
  
  const handleReturnToMenu = useCallback(() => {
    setGameStatus('start');
  }, []);

  const handleGameWin = useCallback(async (finalState: GameState) => {
    if (!user || !firestore || !selectedLevel) return;
  
    setGameState(finalState);
    setGameWon(true);
    setIsGameInProgress(false);
  
    const progressRef = doc(firestore, 'users', user.uid, 'playerProgress', 'main');
    const newAchievementId = selectedLevel.achievementId;
    const nextLevelId = selectedLevel.unlocksNextLevelId;
  
    try {
      const docSnap = await getDoc(progressRef);
      let newProgress: PlayerProgress;
      let currentProgress: PlayerProgress | undefined;
  
      if (docSnap.exists()) {
        currentProgress = docSnap.data() as PlayerProgress;
        newProgress = {
          ...currentProgress,
          completedAchievementIds: [...new Set([...currentProgress.completedAchievementIds, newAchievementId])],
          unlockedLevelIds: nextLevelId ? [...new Set([...currentProgress.unlockedLevelIds, nextLevelId])] : currentProgress.unlockedLevelIds,
          endCreditsUnlocked: !nextLevelId ? true : currentProgress.endCreditsUnlocked,
          completionDateTimes: {
            ...currentProgress.completionDateTimes,
            [newAchievementId]: new Date().toISOString(),
          }
        };
      } else {
        currentProgress = undefined;
        newProgress = {
          unlockedLevelIds: nextLevelId ? ['easy', nextLevelId] : ['easy'],
          completedAchievementIds: [newAchievementId],
          endCreditsUnlocked: !nextLevelId,
          completionDateTimes: {
            [newAchievementId]: new Date().toISOString(),
          }
        };
      }

      // Check if the achievement is newly unlocked
      if (!currentProgress?.completedAchievementIds.includes(newAchievementId)) {
        const achievement = initialAchievements.find(a => a.id === newAchievementId);
        if (achievement) {
          toast({
            title: '🏅 Achievement Unlocked!',
            description: achievement.title,
            className: 'border-amber-400 bg-amber-400/10',
          });
        }
      }
      
      setDocumentNonBlocking(progressRef, newProgress, { merge: true });
      setPlayerProgress(newProgress);
      
      setGameStatus('game-over');
    } catch (serverError) {
        const permissionError = new FirestorePermissionError({
          path: progressRef.path,
          operation: 'get', // The failure could be the initial get
        });
        errorEmitter.emit('permission-error', permissionError);
        // Also set game over, but maybe show a save error
        setCustomMessage("Critical Error: Could not save mission progress.");
        setGameStatus('game-over');
    }
  }, [user, firestore, selectedLevel, toast]);


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
      setGameState(null);
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
            onStart={handleStartGame} 
            isGameInProgress={isGameInProgress}
            isMobile={isMobile}
            levels={initialLevels}
            playerProgress={playerProgress}
          />
        );
      case 'playing':
        if (!gameState || !selectedLevel) return null;
        return (
          <GameUI
            initialState={gameState}
            level={selectedLevel}
            onStateChange={setGameState}
            onGameWin={handleGameWin}
            onGameLose={handleGameLose}
            onReturnToMenu={handleReturnToMenu}
            isMobileMode={isMobile}
          />
        );
      case 'game-over':
        if (!gameState) return null;
        return <GameOverScreen score={gameState.score} onRestart={handleRestart} won={gameWon} customMessage={customMessage} />;
      default:
        return (
          <StartScreen 
            onStart={handleStartGame} 
            isGameInProgress={isGameInProgress}
            isMobile={isMobile}
            levels={initialLevels}
            playerProgress={playerProgress}
          />
        );
    }
  };

  if (isUserLoading || !playerProgress) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center text-white">
        <p>Loading Mission Control...</p>
      </div>
    );
  }

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

export default function Home() {
  return (
      <AppContent />
  )
}
