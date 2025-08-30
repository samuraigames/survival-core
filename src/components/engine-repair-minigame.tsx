"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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

  const resetGame = useCallback(() => {
    const startNodes = Array.from({ length: numWires }, (_, i) => i);
    const solution = [...startNodes];
    const endNodes = shuffle([...startNodes]); // Ensure a new shuffle on each reset
    setWirePuzzle({ starts: startNodes, ends: endNodes, solution });
    setConnections(Array(numWires).fill(-1));
    setCompleted(false);
    setFailed(false);
    setTimeLeft(60); // Reset timer

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
          if (prev <= 1) {
              if(timerRef.current) clearInterval(timerRef.current);
              setFailed(true);
              setTimeout(() => onClose(false), 1500);
              return 0;
          }
          return prev - 1;
      });
    }, 1000);
  }, [numWires, onClose]);

  useEffect(() => {
    if (open) {
      resetGame();
    } else {
        if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [open, resetGame]);

  const getPointCoords = (index: number, side: 'left' | 'right') => {
    const y = (index + 1) * (300 / (numWires + 1));
    const x = side === 'left' ? 50 : 350;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    if (completed || failed) return;
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    
    // Un-set the current connection if user clicks on an already connected start node
    const newConnections = [...connections];
    newConnections[index] = -1;
    setConnections(newConnections);

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
    
    // Check if the end point is already connected to another wire
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
    let allCorrect = true;
    let allConnected = true;
    for (let i = 0; i < numWires; i++) {
        if(conns[i] === -1) {
            allConnected = false;
            allCorrect = false;
            break;
        }
        const startNodeColorIndex = wirePuzzle.starts[i];
        const connectedEndNodeColorIndex = wirePuzzle.ends[conns[i]];
        
        if (startNodeColorIndex !== connectedEndNodeColorIndex) {
            allCorrect = false;
        }
    }

    if (allConnected && allCorrect) {
      setCompleted(true);
      if(timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => onClose(true), 1500);
    }
  };
  
  const Node = ({ index, side }: { index: number; side: 'left' | 'right' }) => {
    const { x, y } = getPointCoords(index, side);
    const colorIndex = side === 'left' ? wirePuzzle.starts[index] : wirePuzzle.ends[index];
    const color = colorIndex !== undefined ? WIRE_COLORS[colorIndex] : '#ffffff';
    
    return (
      <motion.circle
        cx={x}
        cy={y}
        r={20}
        fill={color}
        stroke="#ffffff"
        strokeWidth="3"
        className="cursor-pointer"
        whileHover={{ scale: 1.1 }}
        onMouseDown={side === 'left' ? (e) => handleMouseDown(e, index) : undefined}
        onMouseUp={side === 'right' ? (e) => handleMouseUp(e, index) : undefined}
        onMouseLeave={() => setCurrentDrag(null)}
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
            {wirePuzzle.starts.map((_,i) => <Node key={`start-${i}`} index={i} side="left" />)}
            {wirePuzzle.ends.map((_, i) => <Node key={`end-${i}`} index={i} side="right" />)}

            {connections.map((endIndex, startIndex) => {
              if (endIndex === -1) return null;
              const startCoords = getPointCoords(startIndex, 'left');
              const endCoords = getPointCoords(endIndex, 'right');
              const startColorIndex = wirePuzzle.starts[startIndex];
              const endColorIndex = wirePuzzle.ends[endIndex];
              const isCorrect = startColorIndex === endColorIndex;
              const color = isCorrect ? WIRE_COLORS[startColorIndex] : '#ef4444';
              return (
                <line
                  key={`${startIndex}-${endIndex}`}
                  x1={startCoords.x}
                  y1={startCoords.y}
                  x2={endCoords.x}
                  y2={endCoords.y}
                  stroke={color}
                  strokeWidth="8"
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
                stroke={WIRE_COLORS[wirePuzzle.starts[currentDrag.from]]}
                strokeWidth="8"
                strokeDasharray="10 5"
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
