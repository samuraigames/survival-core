"use client"
import React, { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

interface JoystickProps {
    onMove: (vector: { x: number; y: number }) => void;
}

const JOYSTICK_SIZE = 100;
const KNOB_SIZE = 50;

const Joystick: React.FC<JoystickProps> = ({ onMove }) => {
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const knobX = useMotionValue(0);
    const knobY = useMotionValue(0);

    const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        
        const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
        const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

        const x = clientX - (rect.left + rect.width / 2);
        const y = clientY - (rect.top + rect.height / 2);

        const angle = Math.atan2(y, x);
        const distance = Math.min(Math.hypot(x, y), JOYSTICK_SIZE / 2 - KNOB_SIZE / 4);

        const newX = Math.cos(angle) * distance;
        const newY = Math.sin(angle) * distance;

        knobX.set(newX);
        knobY.set(newY);
        
        const maxDistance = JOYSTICK_SIZE / 2 - KNOB_SIZE / 4;
        onMove({
            x: newX / maxDistance,
            y: newY / maxDistance,
        });
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        knobX.set(0);
        knobY.set(0);
        onMove({ x: 0, y: 0 });
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
            onPointerDown={(e) => {
                e.preventDefault();
                setIsDragging(true);
            }}
            onPointerMove={isDragging ? handleDrag : undefined}
            onPointerUp={handleDragEnd}
            onPointerLeave={isDragging ? handleDragEnd : undefined}
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
