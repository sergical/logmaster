'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface RetroLeaderboardProps {
  currentPlayerId?: string;
}

export default function RetroLeaderboard({ currentPlayerId }: RetroLeaderboardProps) {
  const [timeFrame, setTimeFrame] = useState<'all' | 'weekly' | 'monthly'>('all');
  const [gameMode] = useState<string | undefined>(undefined);
  
  const leaderboard = useQuery(api.leaderboard.getTopScores, {
    timeFrame,
    gameMode,
    limit: 10,
  });
  
  const playerRank = useQuery(
    api.leaderboard.getPlayerRank,
    currentPlayerId ? { playerId: currentPlayerId as Id<'players'>, gameMode } : "skip"
  );
  
  return (
    <div className="bg-gradient-to-b from-gray-900 to-black p-6 rounded-lg shadow-2xl border-4 border-yellow-600">
      <div className="text-center mb-6">
        <h2 className="text-4xl font-bold text-yellow-400 mb-2 pixel-font animate-pulse">
          🏆 HIGH SCORES 🏆
        </h2>
        
        <div className="flex justify-center gap-2 mb-4">
          {(['all', 'weekly', 'monthly'] as const).map((frame) => (
            <button
              key={frame}
              onClick={() => setTimeFrame(frame)}
              className={`px-4 py-2 rounded text-sm font-bold transition-all ${
                timeFrame === frame
                  ? 'bg-yellow-600 text-black border-2 border-yellow-400'
                  : 'bg-gray-800 text-gray-400 border-2 border-gray-600 hover:bg-gray-700'
              }`}
            >
              {frame.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      
      {playerRank && (
        <div className="bg-green-900/50 p-4 rounded-lg mb-4 border-2 border-green-600 text-center">
          <div className="text-green-400 text-sm">YOUR RANK</div>
          <div className="text-3xl font-bold text-green-300">#{playerRank.rank}</div>
          <div className="text-green-400">{playerRank.highScore} pts</div>
        </div>
      )}
      
      <div className="space-y-2">
        {leaderboard?.map((entry, index) => (
          <div
            key={entry._id}
            className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
              index === 0
                ? 'bg-gradient-to-r from-yellow-600/30 to-yellow-700/30 border-yellow-600'
                : index === 1
                ? 'bg-gradient-to-r from-gray-500/30 to-gray-600/30 border-gray-500'
                : index === 2
                ? 'bg-gradient-to-r from-orange-700/30 to-orange-800/30 border-orange-700'
                : 'bg-gray-800/50 border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold" style={{ minWidth: '40px' }}>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
              </div>
              <div>
                <div className="font-bold text-white">{entry.playerName}</div>
                <div className="text-sm text-gray-400">
                  Combo: {entry.combo}x
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-yellow-400">
                {entry.score.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(entry.achievedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
        
        {(!leaderboard || leaderboard.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-6xl mb-4">🪵</div>
            <div>No scores yet! Be the first to play!</div>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .pixel-font {
          font-family: 'Courier New', monospace;
          text-transform: uppercase;
          letter-spacing: 2px;
          text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  );
}
