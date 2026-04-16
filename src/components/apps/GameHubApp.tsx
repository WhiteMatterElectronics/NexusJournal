import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Gamepad2, X, Play } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Game {
  id: string;
  name: string;
  url: string;
  icon: string;
}

const GAMES: Game[] = [
  { id: 'game1', name: '2048', url: 'https://play2048.co/', icon: '🎮' },
  { id: 'game2', name: 'Tetris', url: 'https://tetris.com/play-tetris', icon: '🧱' },
  { id: 'game3', name: 'Pac-Man', url: 'https://www.google.com/logos/2010/pacman10-i.html', icon: '👻' },
];

export const GameHubApp: React.FC = () => {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  return (
    <div className="flex flex-col h-full bg-black/80 text-hw-blue p-4">
      <div className="flex items-center justify-between mb-4 border-b border-hw-blue/20 pb-2">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">GAME_HUB</span>
        </div>
      </div>

      {!selectedGame ? (
        <div className="grid grid-cols-3 gap-4">
          {GAMES.map(game => (
            <button
              key={game.id}
              onClick={() => setSelectedGame(game)}
              className="p-4 bg-hw-blue/5 border border-hw-blue/10 rounded-xl hover:bg-hw-blue/10 transition-all flex flex-col items-center gap-2"
            >
              <span className="text-4xl">{game.icon}</span>
              <span className="text-xs font-bold uppercase">{game.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold">{selectedGame.name}</span>
            <button onClick={() => setSelectedGame(null)} className="p-1 hover:bg-red-500/20 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          <iframe src={selectedGame.url} className="flex-1 w-full bg-white rounded-lg" />
        </div>
      )}
    </div>
  );
};
