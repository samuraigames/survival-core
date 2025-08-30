"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { shuffle } from 'lodash';
import { Progress } from './ui/progress';

interface EngineRepairMinigameProps {
  open: boolean;
  onClose: (success: boolean) => void;
  difficulty: number; // 1 to 10
}

const WIRE_COLORS = [
  '#ef4444', // red-500
  '#3b82f6', // blue-500
  '#22c55e', // green-500
  '#eab308', // yellow-500
  '#a855f7', // purple-500
  '#f97316', // orange-500
];

const EngineRepairMinigame: React.FC<EngineRepairMinigameProps> = ({ open, onClose, difficulty }) => {
  const [wirePuzzle, setWirePuzzle] = useState<{ starts: number[]; ends: number[]; solution: number[] }>({ starts: [], ends: [], solution: [] });
  const [connections, setConnections] = useState<number[]>([]);
  const [currentDrag, setCurrentDrag] = useState<{ from: number; to: { x: number; y: number } } | null>(null);
  const [completed, setCompleted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const svgRef = useRef<SVGSVGElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  const numWires = useMemo(() => Math.max(3, Math.min(6, Math.floor(difficulty / 2) + 2)), [difficulty]);

  useEffect(() => {
    if (open) {
      const startNodes = Array.from({ length: numWires }, (_, i) => i);
      const solution = [...startNodes];
      const endNodes = shuffle([...startNodes]);
      setWirePuzzle({ starts: startNodes, ends: endNodes, solution });
      setConnections(Array(numWires).fill(-1));
      setCompleted(false);
      setFailed(false);
      setTimeLeft(60);
      
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
            if (prev <= 1) {
                clearInterval(timerRef.current!);
                setFailed(true);
                setTimeout(() => onClose(false), 1500);
                return 0;
            }
            return prev - 1;
        });
      }, 1000);

    } else {
        if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [open, numWires, onClose]);

  const getPointCoords = (index: number, side: 'left' | 'right') => {
    const y = (index + 1) * (300 / (numWires + 1));
    const x = side === 'left' ? 50 : 350;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    if (completed || failed) return;
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    setCurrentDrag({
      from: index,
      to: { x: e.clientX - svgRect.left, y: e.clientY - svgRect.top },
    });
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!currentDrag || completed || failed) return;
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    setCurrentDrag({
      ...currentDrag,
      to: { x: e.clientX - svgRect.left, y: e.clientY - svgRect.top },
    });
  };

  const handleMouseUp = (e: React.MouseEvent, endIndex: number) => {
    if (!currentDrag || completed || failed) return;
    
    // Check if the end point is already connected
    if (connections.some(c => c === endIndex)) {
        setCurrentDrag(null);
        return;
    }

    const newConnections = [...connections];
    newConnections[currentDrag.from] = endIndex;
    setConnections(newConnections);
    setCurrentDrag(null);
    
    checkCompletion(newConnections);
  };

  const checkCompletion = (conns: number[]) => {
    for (let i = 0; i < numWires; i++) {
        const startNode = wirePuzzle.starts[i];
        const expectedEndNode = wirePuzzle.solution[i];
        const connectedEndNodeIndex = conns[i];
        if (connectedEndNodeIndex === -1 || wirePuzzle.ends[connectedEndNodeIndex] !== expectedEndNode) {
            return;
        }
    }
    setCompleted(true);
    if(timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => onClose(true), 1500);
  };
  
  const Node = ({ index, side }: { index: number; side: 'left' | 'right' }) => {
    const { x, y } = getPointCoords(index, side);
    const color = WIRE_COLORS[side === 'left' ? wirePuzzle.starts[index] : wirePuzzle.ends[index]];
    return (
      <motion.circle
        cx={x}
        cy={y}
        r={15}
        fill={color}
        stroke="#ffffff"
        strokeWidth="2"
        className="cursor-pointer"
        whileHover={{ scale: 1.2 }}
        onMouseDown={side === 'left' ? (e) => handleMouseDown(e, index) : undefined}
        onMouseUp={side === 'right' ? (e) => handleMouseUp(e, index) : undefined}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(false)}>
      <DialogContent className="max-w-md bg-card border-accent text-foreground">
        <DialogHeader>
          <DialogTitle className="font-headline text-accent">Electrical Panel Repair</DialogTitle>
          <DialogDescription>Connect the matching colored wires to restore power. You are running out of time!</DialogDescription>
        </DialogHeader>
        <div className="relative w-full h-96">
          <Progress value={(timeLeft/60) * 100} className="mb-2 h-2" />
          <svg ref={svgRef} className="w-full h-80" onMouseMove={handleMouseMove} onMouseUp={() => setCurrentDrag(null)}>
            {wirePuzzle.starts.map(i => <Node key={`start-${i}`} index={i} side="left" />)}
            {wirePuzzle.ends.map((_, i) => <Node key={`end-${i}`} index={i} side="right" />)}

            {connections.map((endIndex, startIndex) => {
              if (endIndex === -1) return null;
              const startCoords = getPointCoords(startIndex, 'left');
              const endCoords = getPointCoords(endIndex, 'right');
              const isCorrect = wirePuzzle.ends[endIndex] === wirePuzzle.solution[startIndex];
              return (
                <line
                  key={`${startIndex}-${endIndex}`}
                  x1={startCoords.x}
                  y1={startCoords.y}
                  x2={endCoords.x}
                  y2={endCoords.y}
                  stroke={isCorrect ? '#22c55e' : '#ef4444'}
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              );
            })}

            {currentDrag && (
              <line
                x1={getPointCoords(currentDrag.from, 'left').x}
                y1={getPointCoords(currentDrag.from, 'left').y}
                x2={currentDrag.to.x}
                y2={currentDrag.to.y}
                stroke={WIRE_COLORS[currentDrag.from]}
                strokeWidth="6"
                strokeDasharray="8 4"
                strokeLinecap="round"
              />
            )}
          </svg>
          <AnimatePresence>
            {completed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
              >
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-green-400">System Restored!</h3>
                  <p>Electrical panel online.</p>
                </div>
              </motion.div>
            )}
            {failed && (
                 <motion.div
                 initial={{ opacity: 0, scale: 0.8 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0 }}
                 className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm"
               >
                 <div className="text-center">
                   <h3 className="text-3xl font-bold text-red-500">Power Failure!</h3>
                   <p>The core has gone critical.</p>
                 </div>
               </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EngineRepairMinigame;
