import React, { useRef, useEffect } from 'react';
import Player from './Player';
import NavigationConsole from './NavigationConsole'; // Import the NavigationConsole

const SHIP_WIDTH = 1000;
const SHIP_HEIGHT = 600;

const ShipInterior: React.FC = () => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null); // Ref for camera movement
    // Basic setup for a 2D scene, could involve canvas or simply DOM elements
    // For a more complex game, a library like PixiJS or Phaser would be used here.
    // For this example, we'll just use basic styling to represent the space.
    if (sceneRef.current) {
      sceneRef.current.style.position = 'relative';
      sceneRef.current.style.width = '1000px'; // Example size
      sceneRef.current.style.height = '600px'; // Example size
      sceneRef.current.style.backgroundColor = '#222'; // Dark background
      sceneRef.current.style.overflow = 'hidden'; // Keep elements inside
    }
  }, []);

  // Basic camera follow effect
  useEffect(() => {
    const handleCameraFollow = () => {
      const playerElement = document.querySelector('.player') as HTMLElement;
      const cameraElement = cameraRef.current;
      if (playerElement && cameraElement) {
        const playerRect = playerElement.getBoundingClientRect();
        const sceneRect = sceneRef.current?.getBoundingClientRect();

        if (!sceneRect) return;

        // Calculate player position relative to the scene
        const playerXInScene = playerRect.left - sceneRect.left + playerRect.width / 2;
        const playerYInScene = playerRect.top - sceneRect.top + playerRect.height / 2;

        // Calculate the desired camera position to center on the player
        // Subtract half of the scene/viewport size to center
        let cameraX = playerXInScene - sceneRect.width / 2;
        let cameraY = playerYInScene - sceneRect.height / 2;

        // Placeholder for clamping camera within ship bounds
        // These bounds should be based on the actual ship layout
        const maxX = SHIP_WIDTH - sceneRect.width;
        const maxY = SHIP_HEIGHT - sceneRect.height;
        cameraX = Math.max(0, Math.min(cameraX, maxX));
        cameraY = Math.max(0, Math.min(cameraY, maxY));

        cameraElement.style.transform = `translate(${-cameraX}px, ${-cameraY}px)`;
      }
    };

    // This is a simple approach; a game loop would be better for smoother updates
    // For now, we'll rely on the player's position updates potentially triggering this.
    // A MutationObserver or a dedicated game loop (requestAnimationFrame) would be more robust.
    // We'll refine this later if needed.
    const observer = new MutationObserver(handleCameraFollow);
    const playerElement = document.querySelector('.player');
    if (playerElement) {
        observer.observe(playerElement, { attributes: true, attributeFilter: ['style'] });
    }

    // Initial follow
    handleCameraFollow();

    return () => {
      observer.disconnect();
    };
  }, []); // Dependency array could include player position state if managed higher up

  return (
    <div ref={sceneRef} className="ship-interior">
       {/* This div acts as the camera/viewport */}
      <div ref={cameraRef} className="camera-viewport" style={{ position: 'absolute', width: '100%', height: '100%' }}>
      {/* Parallax Starfield background would go here, likely as a separate element
          with a background image and CSS animation (Not gameplay critical) */}
      <NavigationConsole position={{ x: 200, y: 300 }} /> {/* Example position in cockpit area */}
      <Player />
      {/* Other ship objects (consoles, engine) will be added here */}
    </div>
    </div>
  );
};

export default ShipInterior;