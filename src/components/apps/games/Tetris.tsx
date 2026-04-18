import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Play, RotateCcw, ArrowLeft, Keyboard, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 20;

const TETROMINOES = {
  I: { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: '#00f2ff' },
  J: { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: '#0077ff' },
  L: { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: '#ffaa00' },
  O: { shape: [[1, 1], [1, 1]], color: '#fbff00' },
  S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: '#00ff44' },
  T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: '#aa00ff' },
  Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: '#ff0055' }
};

type PieceType = keyof typeof TETROMINOES;

interface Piece {
  pos: { x: number, y: number };
  shape: number[][];
  color: string;
}

interface Score {
  name: string;
  score: number;
  date: string;
}

export const Tetris: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'leaderboard'>('menu');
  const [grid, setGrid] = useState<string[][]>(Array.from({ length: ROWS }, () => Array(COLS).fill('')));
  const [activePiece, setActivePiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<PieceType>(getRandomPieceType());
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScores, setHighScores] = useState<Score[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>(null);
  const lastDropTime = useRef<number>(0);
  const isDroppingFast = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem('tetris_leaderboard');
    if (saved) setHighScores(JSON.parse(saved));
  }, []);

  function getRandomPieceType(): PieceType {
    const keys = Object.keys(TETROMINOES) as PieceType[];
    return keys[Math.floor(Math.random() * keys.length)];
  }

  const saveScore = useCallback((newScore: number) => {
    const newScores = [...highScores, { name: 'Operator', score: newScore, date: new Date().toISOString() }]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    setHighScores(newScores);
    localStorage.setItem('tetris_leaderboard', JSON.stringify(newScores));
  }, [highScores]);

  const createPiece = (type: PieceType): Piece => ({
    pos: { x: Math.floor(COLS / 2) - 1, y: 0 },
    shape: TETROMINOES[type].shape,
    color: TETROMINOES[type].color
  });

  const resetGame = () => {
    setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill('')));
    setScore(0);
    setLines(0);
    setLevel(1);
    const firstType = getRandomPieceType();
    setNextPiece(getRandomPieceType());
    setActivePiece(createPiece(firstType));
    setGameState('playing');
  };

  const getGhostPos = (piece: Piece, currentGrid: string[][]) => {
    let ghostPos = { ...piece.pos };
    while (!checkCollision(currentGrid, piece.shape, { x: ghostPos.x, y: ghostPos.y + 1 })) {
      ghostPos.y++;
    }
    return ghostPos;
  };

  const checkCollision = (currentGrid: string[][], shape: number[][], pos: { x: number, y: number }) => {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const newX = pos.x + x;
          const newY = pos.y + y;
          if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && currentGrid[newY][newX] !== '')) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const rotate = (shape: number[][]) => {
    const newShape = shape[0].map((_, i) => shape.map(row => row[i]).reverse());
    return newShape;
  };

  const movePiece = useCallback((dx: number, dy: number) => {
    if (!activePiece || gameState !== 'playing') return false;
    if (!checkCollision(grid, activePiece.shape, { x: activePiece.pos.x + dx, y: activePiece.pos.y + dy })) {
      setActivePiece({ ...activePiece, pos: { x: activePiece.pos.x + dx, y: activePiece.pos.y + dy } });
      return true;
    }
    return false;
  }, [activePiece, grid, gameState]);

  const pieceRotate = useCallback(() => {
    if (!activePiece || gameState !== 'playing') return;
    const rotatedShape = rotate(activePiece.shape);
    if (!checkCollision(grid, rotatedShape, activePiece.pos)) {
      setActivePiece({ ...activePiece, shape: rotatedShape });
    }
  }, [activePiece, grid, gameState]);

  const drop = useCallback(() => {
    if (!activePiece) return;
    if (!movePiece(0, 1)) {
      // Piece landed
      const newGrid = [...grid.map(row => [...row])];
      activePiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const gridY = activePiece.pos.y + y;
            const gridX = activePiece.pos.x + x;
            if (gridY >= 0) newGrid[gridY][gridX] = activePiece.color;
          }
        });
      });

      // Clear lines
      let linesCleared = 0;
      const filteredGrid = newGrid.filter(row => {
        const isFull = row.every(cell => cell !== '');
        if (isFull) linesCleared++;
        return !isFull;
      });
      while (filteredGrid.length < ROWS) {
        filteredGrid.unshift(Array(COLS).fill(''));
      }

      if (linesCleared > 0) {
        setLines(l => l + linesCleared);
        const points = [0, 100, 300, 500, 800][linesCleared] * level;
        setScore(s => s + points);
        setLevel(Math.floor((lines + linesCleared) / 10) + 1);
      }

      setGrid(filteredGrid);
      
      const newType = nextPiece;
      setNextPiece(getRandomPieceType());
      const nextP = createPiece(newType);
      
      if (checkCollision(filteredGrid, nextP.shape, nextP.pos)) {
        setGameState('gameover');
        saveScore(score);
      } else {
        setActivePiece(nextP);
      }
    }
  }, [activePiece, grid, movePiece, nextPiece, level, lines, score, saveScore]);

  const update = useCallback((time: number) => {
    if (gameState !== 'playing') return;
    const speed = isDroppingFast.current ? 50 : Math.max(100, 1000 - (level - 1) * 100);
    if (time - lastDropTime.current > speed) {
      lastDropTime.current = time;
      drop();
    }
    gameLoopRef.current = requestAnimationFrame(update);
  }, [gameState, level, drop]);

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
      if (gameState !== 'playing') return;
      switch (e.key) {
        case 'ArrowLeft': movePiece(-1, 0); break;
        case 'ArrowRight': movePiece(1, 0); break;
        case 'ArrowDown': isDroppingFast.current = true; break;
        case 'ArrowUp': pieceRotate(); break;
        case ' ': // Hard drop
          if (activePiece) {
            const ghost = getGhostPos(activePiece, grid);
            setActivePiece({ ...activePiece, pos: ghost });
            drop(); // This will trigger collision and landing immediately
          }
          break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') isDroppingFast.current = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, movePiece, pieceRotate, activePiece, grid, drop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid (Subtle)
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.05)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= COLS; i++) {
      ctx.beginPath();ctx.moveTo(i * BLOCK_SIZE, 0);ctx.lineTo(i * BLOCK_SIZE, canvas.height);ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
      ctx.beginPath();ctx.moveTo(0, i * BLOCK_SIZE);ctx.lineTo(canvas.width, i * BLOCK_SIZE);ctx.stroke();
    }

    // Static Blocks
    grid.forEach((row, y) => {
      row.forEach((color, x) => {
        if (color !== '') {
          ctx.fillStyle = color;
          ctx.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
          // Highlight
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(x * BLOCK_SIZE + 2, y * BLOCK_SIZE + 2, BLOCK_SIZE / 2, 2);
        }
      });
    });

    // Active Piece
    if (activePiece) {
      // Ghost
      const ghost = getGhostPos(activePiece, grid);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      activePiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            ctx.strokeRect((ghost.x + x) * BLOCK_SIZE + 1, (ghost.y + y) * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
          }
        });
      });

      // Piece
      ctx.fillStyle = activePiece.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = activePiece.color;
      activePiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            ctx.fillRect((activePiece.pos.x + x) * BLOCK_SIZE + 1, (activePiece.pos.y + y) * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
          }
        });
      });
      ctx.shadowBlur = 0;
    }
  }, [grid, activePiece]);

  return (
    <div className="flex items-center justify-center h-full bg-black font-mono text-hw-blue relative overflow-hidden">
      
      <button 
        onClick={onExit}
        className="absolute top-4 right-4 p-2 hover:bg-hw-blue/10 rounded transition-colors z-20"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      {/* Side Info */}
      <div className="flex flex-col gap-6 mr-8 min-w-[120px]">
        <div className="p-3 border border-hw-blue/20 bg-hw-blue/5 rounded">
          <div className="text-[8px] uppercase tracking-widest opacity-40 mb-2">Next_Cycle</div>
          <div className="w-20 h-20 bg-black/50 rounded flex items-center justify-center relative">
            {nextPiece && (
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${TETROMINOES[nextPiece].shape[0].length}, 1fr)` }}>
                {TETROMINOES[nextPiece].shape.map((row, y) => row.map((v, x) => (
                  <div key={`${y}-${x}`} className={cn("w-3 h-3 border border-white/5", v !== 0 ? "bg-hw-blue shadow-[0_0_5px_rgba(0,242,255,0.5)]" : "bg-transparent")} />
                )))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-[8px] uppercase tracking-widest opacity-40">System_Score</div>
            <div className="text-xl font-bold">{score.toString().padStart(6, '0')}</div>
          </div>
          <div>
            <div className="text-[8px] uppercase tracking-widest opacity-40">Load_Level</div>
            <div className="text-xl font-bold">{level.toString().padStart(2, '0')}</div>
          </div>
          <div>
            <div className="text-[8px] uppercase tracking-widest opacity-40">Blocks_Purged</div>
            <div className="text-xl font-bold">{lines.toString().padStart(3, '0')}</div>
          </div>
        </div>
      </div>

      <div className="relative p-2 border border-hw-blue/20 bg-hw-blue/5 rounded-lg shadow-[0_0_20px_rgba(0,242,255,0.1)]">
        <canvas 
          ref={canvasRef} 
          width={COLS * BLOCK_SIZE} 
          height={ROWS * BLOCK_SIZE} 
          className="rounded-sm"
        />

        <AnimatePresence>
          {gameState === 'menu' && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm z-10"
            >
              <h1 className="text-4xl font-black mb-2 tracking-tighter italic text-hw-blue">BLOCK_BREACH</h1>
              <span className="text-[8px] uppercase tracking-[0.4em] opacity-40 mb-8 border-t border-hw-blue/20 pt-1">Tetris Protocol v1.4.2</span>
              
              <div className="flex flex-col gap-3 w-44">
                <button 
                  onClick={resetGame}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-hw-blue text-black font-bold uppercase tracking-widest text-[10px] hover:bg-hw-blue/80 transition-colors"
                >
                  <Play className="w-4 h-4 fill-current" /> Initialize
                </button>
                <button 
                  onClick={() => setGameState('leaderboard')}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-hw-blue/40 text-hw-blue font-bold uppercase tracking-widest text-[10px] hover:bg-hw-blue/10 transition-colors"
                >
                  <Trophy className="w-3 h-3" /> Records
                </button>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-2 opacity-30 text-[8px] uppercase tracking-widest">
                <div className="flex items-center gap-2 italic"><Keyboard className="w-3 h-3" /> Arrows: Move</div>
                <div className="flex items-center gap-2 italic"><RotateCcw className="w-3 h-3" /> Up: Rotate</div>
                <div className="flex items-center gap-2 italic"><ChevronDown className="w-3 h-3" /> Space: Drop</div>
              </div>
            </motion.div>
          )}

          {gameState === 'gameover' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md z-10"
            >
              <div className="w-full h-1 bg-red-500 mb-4 animate-pulse" />
              <h2 className="text-2xl font-black text-red-500 mb-4 italic tracking-widest">CRITICAL_OVERFLOW</h2>
              
              <div className="grid grid-cols-2 gap-8 mb-8 text-center">
                <div>
                  <div className="text-[8px] uppercase tracking-widest opacity-40 mb-1">Final Score</div>
                  <div className="text-3xl font-black text-hw-blue">{score}</div>
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-widest opacity-40 mb-1">Max Level</div>
                  <div className="text-3xl font-black text-hw-blue">{level}</div>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-48">
                <button 
                  onClick={resetGame}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-hw-blue text-black font-bold uppercase tracking-widest text-xs hover:bg-hw-blue/80 shadow-[0_0_15px_rgba(0,242,255,0.3)] transition-all"
                >
                  <RotateCcw className="w-4 h-4" /> Reset Stack
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
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 p-8 z-10"
            >
              <h3 className="text-lg font-black italic mb-6 border-b border-hw-blue/40 w-full pb-2">SECURE_LOGS</h3>
              <div className="w-full space-y-2 flex-1">
                {highScores.length === 0 ? (
                  <div className="text-center py-8 opacity-20 text-[10px] uppercase tracking-widest">Database entry empty</div>
                ) : (
                  highScores.map((s, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-hw-blue/10 py-1">
                      <div className="flex items-center gap-3">
                        <span className="text-hw-blue/20 font-bold">{i + 1}</span>
                        <span className="text-[10px] font-bold uppercase">{s.name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-hw-blue">{s.score.toString().padStart(6, '0')}</span>
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
