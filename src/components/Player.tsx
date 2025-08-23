import React, { useState, useEffect, useRef } from 'react';

interface PlayerProps {
  initialX: number;
  initialY: number;
  speed: number;
}

const Player: React.FC<PlayerProps> = ({ initialX, initialY, speed }) => {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      keysPressed.current[event.key] = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keysPressed.current[event.key] = false;
    };

    const gameLoop = () => {
      setPosition(prevPosition => {
        let newX = prevPosition.x;
        let newY = prevPosition.y;

        if (keysPressed.current['w'] || keysPressed.current['W']) {
          newY -= speed;
        }
        if (keysPressed.current['s'] || keysPressed.current['S']) {
          newY += speed;
        }
        if (keysPressed.current['a'] || keysPressed.current['A']) {
          newX -= speed;
        }
        if (keysPressed.current['d'] || keysPressed.current['D']) {
          newX += speed;
        }

        return { x: newX, y: newY };
      });

      requestAnimationFrame(gameLoop);
    };

    // Start the game loop
    const animationFrameId = requestAnimationFrame(gameLoop);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [speed]);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '30px',
        height: '30px',
        backgroundColor: 'blue',
        // borderRadius: '50%', // Circle shape - keeping as square for now to represent collider
        transform: 'translate(-50%, -50%)', // Center the element on its position
        zIndex: 10,
      }}
    ></div>
  );
};

export default Player;