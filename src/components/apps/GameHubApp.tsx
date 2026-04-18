import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gamepad2, X, Terminal, Trophy, Info, Zap, LayoutGrid, Play } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Snake } from './games/Snake';
import { Tetris } from './games/Tetris';

type GameId = 'snake' | 'tetris';

interface Game {
  id: GameId;
  name: string;
  description: string;
  icon: React.ElementType;
  complexity: string;
  color: string;
  component: React.FC<{ onExit: () => void }>;
}

const GAMES: Game[] = [
  { 
    id: 'snake', 
    name: 'SNAKE.IO', 
    description: 'Bypass firewall segments and expand your data buffer without hitting the perimeter.',
    icon: Zap, 
    complexity: 'EASY',
    color: '#00f2ff',
    component: Snake 
  },
  { 
    id: 'tetris', 
    name: 'BLOCK_BREACH', 
    description: 'Compress anomalous data blocks into solid streams to prevent buffer overflow.',
    icon: LayoutGrid, 
    complexity: 'HARD',
    color: '#aa00ff',
    component: Tetris 
  },
];

export const GameHubApp: React.FC = () => {
  const [selectedGameId, setSelectedGameId] = useState<GameId | null>(null);

  const activeGame = GAMES.find(g => g.id === selectedGameId);

  return (
    <div className="flex flex-col h-full bg-black text-hw-blue overflow-hidden font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hw-blue/20 bg-hw-blue/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-hw-blue/10 border border-hw-blue/20 rounded-lg">
            <Gamepad2 className="w-5 h-5 text-hw-blue" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-[0.2em] block">GAME_HUB</span>
            <span className="text-[9px] text-hw-blue/40 uppercase tracking-widest">Nexus Entertainment Suite</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[8px] text-hw-blue/40 uppercase tracking-widest">Active nodes</span>
            <span className="text-[10px] font-bold">2/2 OPERATIONAL</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative">
        <AnimatePresence mode="wait">
          {!selectedGameId ? (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 max-w-4xl mx-auto w-full h-full flex flex-col justify-center"
            >
              <div className="mb-12">
                <h1 className="text-4xl font-black italic tracking-tighter mb-2">SYSTEM_GAMES</h1>
                <p className="text-[10px] uppercase tracking-widest text-hw-blue/40 max-w-md leading-relaxed">
                  Welcome to the Nexus entertainment buffer. All modules are locally hosted for maximum throughput and zero-latency execution.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {GAMES.map(game => (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGameId(game.id)}
                    className="group relative flex flex-col items-start p-6 bg-hw-blue/5 border border-hw-blue/10 rounded-2xl hover:bg-hw-blue/10 hover:border-hw-blue/30 transition-all text-left overflow-hidden"
                  >
                    {/* Decorative Background */}
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <game.icon size={120} />
                    </div>

                    <div className="flex items-center justify-between w-full mb-4">
                      <div className="p-3 bg-hw-blue/10 rounded-xl" style={{ color: game.color }}>
                        <game.icon className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-2">
                         <span className={cn(
                           "text-[8px] px-2 py-0.5 rounded border uppercase font-bold tracking-widest",
                           game.complexity === 'HARD' ? "border-red-500/40 text-red-500/60" : "border-hw-blue/40 text-hw-blue/60"
                         )}>
                           {game.complexity}
                         </span>
                      </div>
                    </div>

                    <h2 className="text-xl font-black italic mb-2 group-hover:text-white transition-colors uppercase tracking-tight">{game.name}</h2>
                    <p className="text-[10px] text-hw-blue/50 leading-relaxed mb-6">
                      {game.description}
                    </p>

                    <div className="mt-auto flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest group-hover:text-hw-blue transition-colors">
                      <Play className="w-3 h-3 fill-current" /> Execute Module
                    </div>
                  </button>
                ))}
              </div>

              {/* Maintenance Note */}
              <div className="mt-12 p-4 border border-dashed border-hw-blue/10 rounded-xl flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-hw-blue/5 flex items-center justify-center flex-shrink-0 text-hw-blue/40">
                  <Info className="w-4 h-4" />
                </div>
                <div className="text-[9px] text-hw-blue/40 uppercase tracking-widest leading-loose">
                  All external communication ports have been disabled for this app. Security checks are handled locally via your OS profile.
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="game"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10"
            >
              {activeGame && <activeGame.component onExit={() => setSelectedGameId(null)} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Bar */}
      <div className="h-8 border-t border-hw-blue/20 bg-hw-blue/5 px-6 flex items-center justify-between text-[9px] uppercase tracking-widest text-hw-blue/40">
        <div className="flex gap-4 italic font-bold">
          <span className="flex items-center gap-1"><Terminal className="w-3 h-3" /> Kernel: v4.8.2-ent</span>
          <span className="flex items-center gap-1"><Trophy className="w-3 h-3" /> Global Leaderboard Status: Offline (Local Record Only)</span>
        </div>
        <div className="flex gap-4">
          <span>Mem_Alloc: 64MB</span>
          <span>GPU_Accel: Active</span>
        </div>
      </div>
    </div>
  );
};
