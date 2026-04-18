import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Play, RotateCcw, ArrowLeft, Keyboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const BASE_SPEED = 150;

interface Score {
  name: string;
  score: number;
  date: string;
}

export const Snake: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'leaderboard'>('menu');
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState<Score[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>(null);
  const lastUpdateRef = useRef<number>(0);
  const nextDirectionRef = useRef(INITIAL_DIRECTION);

  // Load high scores
  useEffect(() => {
    const saved = localStorage.getItem('snake_leaderboard');
    if (saved) setHighScores(JSON.parse(saved));
  }, []);

  const saveScore = useCallback((newScore: number) => {
    const newScores = [...highScores, { name: 'Player', score: newScore, date: new Date().toISOString() }]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    setHighScores(newScores);
    localStorage.setItem('snake_leaderboard', JSON.stringify(newScores));
  }, [highScores]);

  const generateFood = useCallback(() => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      // Check if food on snake
      if (!snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) break;
    }
    setFood(newFood);
  }, [snake]);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    nextDirectionRef.current = INITIAL_DIRECTION;
    setScore(0);
    setGameState('playing');
    setFood({ x: 5, y: 5 });
  };

  const update = useCallback((time: number) => {
    if (gameState !== 'playing') return;

    if (time - lastUpdateRef.current > Math.max(50, BASE_SPEED - Math.floor(score / 5) * 5)) {
      lastUpdateRef.current = time;
      
      setDirection(nextDirectionRef.current);
      setSnake(prev => {
        const head = { 
          x: prev[0].x + nextDirectionRef.current.x, 
          y: prev[0].y + nextDirectionRef.current.y 
        };

        // Collision Check: Wall
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setGameState('gameover');
          saveScore(score);
          return prev;
        }

        // Collision Check: Self
        if (prev.some(segment => segment.x === head.x && segment.y === head.y)) {
          setGameState('gameover');
          saveScore(score);
          return prev;
        }

        const newSnake = [head, ...prev];
        
        // Food Check
        if (head.x === food.x && head.y === food.y) {
          setScore(s => s + 1);
          generateFood();
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }

    gameLoopRef.current = requestAnimationFrame(update);
  }, [gameState, score, food, generateFood, saveScore]);

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = requestAnimationFrame(update);
    }
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, update]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': if (direction.y !== 1) nextDirectionRef.current = { x: 0, y: -1 }; break;
        case 'ArrowDown': if (direction.y !== -1) nextDirectionRef.current = { x: 0, y: 1 }; break;
        case 'ArrowLeft': if (direction.x !== 1) nextDirectionRef.current = { x: -1, y: 0 }; break;
        case 'ArrowRight': if (direction.x !== -1) nextDirectionRef.current = { x: 1, y: 0 }; break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width / GRID_SIZE;

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid (Subtle)
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.05)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();ctx.moveTo(i * size, 0);ctx.lineTo(i * size, canvas.height);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0, i * size);ctx.lineTo(canvas.width, i * size);ctx.stroke();
    }

    // Food
    ctx.fillStyle = '#ff0055';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff0055';
    ctx.beginPath();
    ctx.arc(food.x * size + size / 2, food.y * size + size / 2, size / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Snake
    snake.forEach((segment, i) => {
      ctx.fillStyle = i === 0 ? '#00f2ff' : 'rgba(0, 242, 255, 0.6)';
      if (i === 0) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f2ff';
      }
      ctx.fillRect(segment.x * size + 1, segment.y * size + 1, size - 2, size - 2);
      ctx.shadowBlur = 0;
    });

  }, [snake, food]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-black font-mono text-hw-blue relative overflow-hidden">
      <div className="absolute top-4 left-4 flex gap-4 text-[10px] uppercase tracking-widest opacity-60">
        <span>Score: {score.toString().padStart(4, '0')}</span>
        <span>High: {(highScores[0]?.score || 0).toString().padStart(4, '0')}</span>
      </div>

      <button 
        onClick={onExit}
        className="absolute top-4 right-4 p-2 hover:bg-hw-blue/10 rounded transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      <div className="relative p-2 border border-hw-blue/20 bg-hw-blue/5 rounded-lg shadow-[0_0_20px_rgba(0,242,255,0.1)]">
        <canvas 
          ref={canvasRef} 
          width={400} 
          height={400} 
          className="rounded-sm"
        />

        <AnimatePresence>
          {gameState === 'menu' && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
            >
              <h1 className="text-4xl font-black mb-8 tracking-tighter italic text-hw-blue">SNAKE.IO</h1>
              <div className="flex flex-col gap-3 w-48">
                <button 
                  onClick={resetGame}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-hw-blue text-black font-bold uppercase tracking-widest text-xs hover:bg-hw-blue/80 transition-colors"
                >
                  <Play className="w-4 h-4" /> Start Loop
                </button>
                <button 
                  onClick={() => setGameState('leaderboard')}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-hw-blue/40 text-hw-blue font-bold uppercase tracking-widest text-[10px] hover:bg-hw-blue/10 transition-colors"
                >
                  <Trophy className="w-3 h-3" /> Hall of Fame
                </button>
              </div>
              <div className="mt-8 flex items-center gap-2 opacity-40">
                <Keyboard className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-widest text-hw-blue">Use Arrow Keys</span>
              </div>
            </motion.div>
          )}

          {gameState === 'gameover' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md"
            >
              <h2 className="text-2xl font-black text-red-500 mb-2 italic">SYSTEM FAILURE</h2>
              <span className="text-[10px] uppercase tracking-widest text-hw-blue/60 mb-6">Connection Terminated</span>
              
              <div className="text-center mb-8">
                <div className="text-[8px] uppercase tracking-[0.2em] opacity-40">Final Score</div>
                <div className="text-5xl font-black text-hw-blue">{score}</div>
              </div>

              <div className="flex flex-col gap-3 w-48">
                <button 
                  onClick={resetGame}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-hw-blue text-black font-bold uppercase tracking-widest text-xs hover:bg-hw-blue/80 transition-colors shadow-[0_0_15px_rgba(0,242,255,0.3)]"
                >
                  <RotateCcw className="w-4 h-4" /> Reboot Loop
                </button>
                <button 
                   onClick={() => setGameState('menu')}
                   className="w-full py-3 text-[10px] uppercase font-bold tracking-widest text-hw-blue/40 hover:text-hw-blue"
                >
                  Return to BIOS
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'leaderboard' && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 p-8"
            >
              <h3 className="text-lg font-black italic mb-6 border-b border-hw-blue/40 w-full pb-2">TOP_OPERATORS</h3>
              <div className="w-full space-y-2 flex-1">
                {highScores.length === 0 ? (
                  <div className="text-center py-8 opacity-20 text-[10px] uppercase tracking-widest">No valid logs found</div>
                ) : (
                  highScores.map((s, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-hw-blue/10 py-1">
                      <div className="flex items-center gap-3">
                        <span className="text-hw-blue/20 font-bold">{i + 1}</span>
                        <span className="text-[10px] font-bold uppercase">{s.name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-hw-blue">{s.score.toString().padStart(4, '0')}</span>
                    </div>
                  ))
                )}
              </div>
              <button 
                onClick={() => setGameState('menu')}
                className="mt-6 w-full py-3 bg-hw-blue/10 border border-hw-blue/20 text-hw-blue font-bold uppercase tracking-widest text-[10px] hover:bg-hw-blue/20"
              >
                Back
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
