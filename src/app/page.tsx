import GameUI from '@/components/game-ui';
import { GameProvider } from '@/contexts/game-context';

export default function Home() {
  return (
    <main className="w-screen h-screen bg-background overflow-hidden">
      <GameProvider>
        <GameUI />
      </GameProvider>
    </main>
  );
}
