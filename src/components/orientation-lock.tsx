
"use client";

import { useState, useEffect } from 'react';
import { RotateCw } from 'lucide-react';
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

    // Use a function reference for adding and removing the listener
    const orientationChangeHandler = () => checkOrientation();

    // Re-check on both resize and orientation change
    window.addEventListener('resize', orientationChangeHandler);
    if (window.screen.orientation) {
        window.screen.orientation.addEventListener('change', orientationChangeHandler);
    } else {
        window.addEventListener('orientationchange', orientationChangeHandler);
    }

    return () => {
      window.removeEventListener('resize', orientationChangeHandler);
      if (window.screen.orientation) {
        window.screen.orientation.removeEventListener('change', orientationChangeHandler);
      } else {
        window.removeEventListener('orientationchange', orientationChangeHandler);
      }
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
            <RotateCw className="w-16 h-16 text-accent mb-4 animate-pulse" />
            <h1 className="text-2xl font-headline text-foreground mb-2">
              Please Rotate Your Device
            </h1>
            <p className="text-lg text-muted-foreground">
              This game is best played in landscape mode.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={!isLandscape ? 'hidden' : 'w-full h-full'}>
        {children}
      </div>
    </div>
  );
};

export default OrientationLock;
