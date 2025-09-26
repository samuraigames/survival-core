"use client"
import React, { useRef } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';

interface JoystickProps {
    onMove: (vector: { x: number; y: number }) => void;
}

const JOYSTICK_SIZE = 100;
const KNOB_SIZE = 50;

const Joystick: React.FC<JoystickProps> = ({ onMove }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const knobX = useMotionValue(0);
    const knobY = useMotionValue(0);
    const isDragging = useRef(false);

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        isDragging.current = true;
        (event.target as HTMLElement).setPointerCapture(event.pointerId);
        handleDrag(event);
    };
    
    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (isDragging.current) {
            handleDrag(event);
        }
    };
    
    const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
        isDragging.current = false;
        (event.target as HTMLElement).releasePointerCapture(event.pointerId);
        handleDragEnd();
    };

    const handleDrag = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        
        const x = event.clientX - (rect.left + rect.width / 2);
        const y = event.clientY - (rect.top + rect.height / 2);

        const angle = Math.atan2(y, x);
        const distance = Math.min(Math.hypot(x, y), JOYSTICK_SIZE / 2);

        const newX = Math.cos(angle) * distance;
        const newY = Math.sin(angle) * distance;

        knobX.set(newX);
        knobY.set(newY);
        
        const maxDistance = JOYSTICK_SIZE / 2;
        onMove({
            x: newX / maxDistance,
            y: newY / maxDistance,
        });
    };

    const handleDragEnd = () => {
        onMove({ x: 0, y: 0 });
        animate(knobX, 0, { type: 'spring', stiffness: 400, damping: 20 });
        animate(knobY, 0, { type: 'spring', stiffness: 400, damping: 20 });
    };

    return (
        <motion.div
            ref={containerRef}
            className="rounded-full bg-background/30 backdrop-blur-sm shadow-lg"
            style={{
                width: JOYSTICK_SIZE,
                height: JOYSTICK_SIZE,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                touchAction: 'none',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            <motion.div
                className="rounded-full bg-accent/80 shadow-md border-2 border-accent-foreground/50"
                style={{
                    width: KNOB_SIZE,
                    height: KNOB_SIZE,
                    x: knobX,
                    y: knobY,
                }}
            />
        </motion.div>
    );
};

export default Joystick;
