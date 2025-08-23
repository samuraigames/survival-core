import React, { useRef, useState } from 'react';
import { useGame } from '@/contexts/game-context';

interface NavigationConsoleProps {
  position: { x: number; y: number };
}

const NavigationConsole: React.FC<NavigationConsoleProps> = ({ position }) => {
  const [isPlayerInRange, setIsPlayerInRange] = useState(false);
  const { setInteractingStation, playerPosition } = useGame(); // Assuming game context provides player position

  // Placeholder refs for colliders
  const bodyColliderRef = useRef<HTMLDivElement>(null);
  const interactZoneRef = useRef<HTMLDivElement>(null);

  // Basic range check (replace with actual collision detection later)
  // This is a simplified example based on distance
  const checkPlayerRange = () => {
    if (!interactZoneRef.current) return;

    // Get the bounding rectangle of the interact zone
    const zoneRect = interactZoneRef.current.getBoundingClientRect();

    // Assuming playerPosition is in the same coordinate space as the console position
    // This is a very rough check and should be replaced with proper collision detection
    const distance = Math.sqrt(
      Math.pow(playerPosition.x - (position.x + zoneRect.width / 2), 2) +
      Math.pow(playerPosition.y - (position.y + zoneRect.height / 2), 2)
    );

    const inRange = distance < Math.max(zoneRect.width, zoneRect.height) * 0.75; // Adjust multiplier as needed

    if (inRange !== isPlayerInRange) {
      setIsPlayerInRange(inRange);
      if (inRange) {
        setInteractingStation('NavConsole');
      } else {
        setInteractingStation(null); // Clear if leaving range
      }
    }
  };

  // Use a simple interval for range checking for this example,
  // ideally this would be handled by a physics update loop.
  // useEffect(() => {
  //   const interval = setInterval(checkPlayerRange, 100); // Check every 100ms
  //   return () => clearInterval(interval);
  // }, [playerPosition]); // Re-run effect if player position changes

  // Note: The above useEffect is commented out. A better approach would be to use
  // a game loop or physics engine's collision detection to manage `isPlayerInRange`.
  // For now, the `isPlayerInRange` state change and `setInteractingStation`
  // will need to be triggered by the game's main update loop detecting collisions.

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)', // Center the object
      }}
    >
      {/* Body Collider Placeholder */}
      <div
        ref={bodyColliderRef}
        style={{
          width: 80,
          height: 60,
          backgroundColor: 'gray',
          position: 'absolute',
        }}
      >
        {/* Screen */}
        <div
          style={{
            position: 'absolute',
            top: 5,
            left: 10,
            width: 60,
            height: 30,
            backgroundColor: 'lightblue',
            border: '2px solid #333',
          }}
        ></div>
        {/* LED - Placeholder for state indication */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: isPlayerInRange ? 'yellow' : 'green', // Simple visual cue for range
          }}
        ></div>
      </div>

      {/* Interact Zone Trigger Collider Placeholder */}
      <div
        ref={interactZoneRef}
        style={{
          position: 'absolute',
          top: 60, // Position the interact zone in front
          left: 15,
          width: 50,
          height: 30,
          backgroundColor: 'rgba(0, 255, 0, 0.2)', // Semi-transparent green for visualization
          pointerEvents: 'none', // Important: prevent this div from capturing mouse events
        }}
      ></div>

      {/* Interaction Prompt */}
      {isPlayerInRange && (
        <div
          style={{
            position: 'absolute',
            bottom: -20, // Position below the console
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'black',
            color: 'white',
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 12,
            whiteSpace: 'nowrap',
          }}
        >
          E - Use Navigation
        </div>
      )}
    </div>
  );
};

export default NavigationConsole;