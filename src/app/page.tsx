import GameUI from '@/components/game-ui';
import { GameProvider } from '@/contexts/game-context';

export default function Home() {
  return (
    <main className="w-screen min-h-screen bg-background flex flex-col items-center justify-center">
      <GameProvider>
        <GameUI />
      </GameProvider>
    </main>
  );
}
