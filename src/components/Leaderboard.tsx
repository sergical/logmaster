'use client';

import { useEffect, useState } from 'react';
import * as Sentry from "@sentry/nextjs";

interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  level: number;
  totalChops: number;
  bestCombo: number;
  achievedAt: number;
}

interface LeaderboardProps {
  currentPlayerScore?: number;
  currentPlayerId?: string;
}

export default function Leaderboard({ currentPlayerScore = 0, currentPlayerId }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      Sentry.logger.info("Loading leaderboard data");
      
      const savedLeaderboard = localStorage.getItem('logmaster-leaderboard');
      if (savedLeaderboard) {
        const entries: LeaderboardEntry[] = JSON.parse(savedLeaderboard);
        setLeaderboard(entries.sort((a, b) => b.score - a.score).slice(0, 10));
        
        Sentry.logger.info("Leaderboard loaded successfully", { 
          entriesCount: entries.length 
        });
      } else {
        setLeaderboard(generateMockLeaderboard());
        Sentry.logger.info("Generated mock leaderboard for demo");
      }
    } catch (error) {
      Sentry.logger.error("Failed to load leaderboard", { 
        error: error instanceof Error ? error.message : String(error) 
      });
      setLeaderboard(generateMockLeaderboard());
    } finally {
      setLoading(false);
    }
  };

  const generateMockLeaderboard = (): LeaderboardEntry[] => {
    const mockNames = [
      'WoodChopper_Pro', 'AxeMaster_2024', 'TreeSlayer_X', 'LogLegend_99',
      'ForestKing_Alpha', 'ChopChamp_Elite', 'LumberLord_Max', 'WoodWarrior_Ace',
      'AxeWielder_Prime', 'TreeTerminator'
    ];

    return mockNames.map((name, index) => ({
      id: `mock_${index}`,
      playerName: name,
      score: Math.floor(Math.random() * 50000) + 10000,
      level: Math.floor(Math.random() * 20) + 1,
      totalChops: Math.floor(Math.random() * 1000) + 100,
      bestCombo: Math.floor(Math.random() * 50) + 5,
      achievedAt: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)
    })).sort((a, b) => b.score - a.score);
  };

  const saveToLeaderboard = async (entry: LeaderboardEntry) => {
    try {
      const savedLeaderboard = localStorage.getItem('logmaster-leaderboard');
      let entries: LeaderboardEntry[] = savedLeaderboard ? JSON.parse(savedLeaderboard) : [];
      
      const existingEntryIndex = entries.findIndex(e => e.id === entry.id);
      if (existingEntryIndex >= 0) {
        if (entries[existingEntryIndex].score < entry.score) {
          entries[existingEntryIndex] = entry;
        }
      } else {
        entries.push(entry);
      }
      
      entries = entries.sort((a, b) => b.score - a.score).slice(0, 10);
      localStorage.setItem('logmaster-leaderboard', JSON.stringify(entries));
      setLeaderboard(entries);
      
      Sentry.logger.info("Player added to leaderboard", {
        playerId: entry.id,
        playerName: entry.playerName,
        score: entry.score,
        leaderboardPosition: entries.findIndex(e => e.id === entry.id) + 1
      });
    } catch (error) {
      Sentry.logger.error("Failed to save to leaderboard", {
        error: error instanceof Error ? error.message : String(error),
        playerId: entry.id
      });
    }
  };

  const formatTimeSince = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const getRankEmoji = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🪵';
    }
  };

  const getCurrentPlayerRank = (): number | null => {
    if (!currentPlayerId) return null;
    const rank = leaderboard.findIndex(entry => entry.id === currentPlayerId);
    return rank >= 0 ? rank + 1 : null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-green-800 mb-4 text-center">
          🏆 Leaderboard
        </h2>
        <div className="text-center py-8">
          <div className="animate-spin text-3xl mb-2">🪓</div>
          <p className="text-gray-600">Loading top lumberjacks...</p>
        </div>
      </div>
    );
  }

  const currentRank = getCurrentPlayerRank();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-green-800 mb-2">
          🏆 Hall of Fame
        </h2>
        <p className="text-gray-600 text-sm">Top LogMaster Champions</p>
        {currentRank && (
          <div className="mt-2 inline-block bg-green-100 px-3 py-1 rounded-full text-sm text-green-700">
            Your Rank: #{currentRank}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {leaderboard.map((entry, index) => {
          const rank = index + 1;
          const isCurrentPlayer = entry.id === currentPlayerId;
          
          return (
            <div
              key={entry.id}
              className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                isCurrentPlayer
                  ? 'border-green-500 bg-green-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="text-2xl">
                  {getRankEmoji(rank)}
                </div>
                <div>
                  <div className={`font-bold text-lg ${
                    isCurrentPlayer ? 'text-green-700' : 'text-gray-800'
                  }`}>
                    {entry.playerName}
                  </div>
                  <div className="text-sm text-gray-600">
                    Level {entry.level} • {entry.totalChops} chops • {entry.bestCombo}x best combo
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTimeSince(entry.achievedAt)}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`text-2xl font-bold ${
                  rank === 1 ? 'text-yellow-600' : 
                  rank === 2 ? 'text-gray-600' :
                  rank === 3 ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {entry.score.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">points</div>
              </div>
            </div>
          );
        })}
      </div>

      {leaderboard.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🪵</div>
          <p>No champions yet!</p>
          <p className="text-sm mt-1">Be the first to claim the throne!</p>
        </div>
      )}

      <div className="mt-6 text-center">
        <button
          onClick={loadLeaderboard}
          className="text-green-600 hover:text-green-700 text-sm underline"
        >
          🔄 Refresh Leaderboard
        </button>
      </div>
    </div>
  );
}