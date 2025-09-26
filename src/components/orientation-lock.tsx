"use client";

import { useState, useEffect } from 'react';
import { ScreenRotation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OrientationLockProps {
  children: React.ReactNode;
  isMobile: boolean;
}

const OrientationLock: React.FC<OrientationLockProps> = ({ children, isMobile }) => {
  const [isLandscape, setIsLandscape] = useState(true);

  useEffect(() => {
    if (!isMobile) {
      setIsLandscape(true);
      return;
    }

    const checkOrientation = () => {
      // window.screen.orientation is more reliable
      if (window.screen.orientation) {
        setIsLandscape(window.screen.orientation.type.includes('landscape'));
      } else {
        // Fallback for older browsers
        setIsLandscape(window.innerWidth > window.innerHeight);
      }
    };

    checkOrientation();

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [isMobile]);

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="w-full h-full">
      <AnimatePresence>
        {!isLandscape && (
          <motion.div
            key="orientation-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center text-center p-4"
          >
            <ScreenRotation className="w-16 h-16 text-accent mb-4 animate-pulse" />
            <h1 className="text-2xl font-headline text-foreground mb-2">
              Please Rotate Your Device
            </h1>
            <p className="text-lg text-muted-foreground">
              This game is best played in landscape mode.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ visibility: isLandscape ? 'visible' : 'hidden' }}>
        {children}
      </div>
    </div>
  );
};

export default OrientationLock;
