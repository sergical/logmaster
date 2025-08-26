'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as Sentry from "@sentry/nextjs";
import RetroGameCanvas from '@/components/RetroGameCanvas';
import RetroLeaderboard from '@/components/RetroLeaderboard';
import RetroAchievements from '@/components/RetroAchievements';
import { useConvexGame } from '@/lib/use-convex-game';
import { shortUUID } from '@/lib/utils';

export default function Home() {
  const [playerId] = useState(() => `player_${shortUUID()}`);
  const [currentTab, setCurrentTab] = useState<'game' | 'leaderboard' | 'achievements'>('game');

  
  const { player, createOrUpdatePlayer } = useConvexGame(playerId);
  const [playerName, setPlayerName] = useState('');
  
  useEffect(() => {
    Sentry.logger.info("Retro LogMaster initialized", { playerId });
  }, [playerId]);
  
  useEffect(() => {
    if (player && player.name !== playerName) {
      setPlayerName(player.name);
    }
  }, [player, playerName]);
  
  const handleUpdateName = useCallback(async () => {
    if (playerName.trim()) {
      await createOrUpdatePlayer({ userId: playerId, name: playerName.trim() });
      Sentry.logger.info("Player name updated", { playerId, newName: playerName.trim() });
    }
  }, [playerName, createOrUpdatePlayer, playerId]);
  
  const tabButtons = useMemo(() => [
    { id: 'game' as const, label: 'GAME', icon: '🎮' },
    { id: 'leaderboard' as const, label: 'SCORES', icon: '🏆' },
    { id: 'achievements' as const, label: 'AWARDS', icon: '🏅' },
  ], []);
  
  return (
    <div className="min-h-screen bg-black text-white">
      {/* CRT Monitor Effect */}
      <div className="min-h-screen bg-gradient-to-b from-green-950 via-green-900 to-black crt-effect">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <header className="text-center mb-8">
            <h1 className="text-6xl md:text-8xl font-bold text-yellow-400 mb-4 pixel-font retro-glow animate-pulse">
              LOGMASTER
            </h1>
            <div className="text-green-400 text-xl mb-6 pixel-font">
              ARCADE EDITION
            </div>
            
            {/* Player Info */}
            <div className="inline-block bg-black/50 p-4 rounded-lg border-2 border-green-600 mb-6">
              <div className="flex items-center gap-4">
                <div className="text-3xl">👤</div>
                <div className="text-left">
                  <label className="block text-xs text-green-400 mb-1 pixel-font">
                    ENTER NAME:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="bg-black border-2 border-green-600 text-green-400 px-3 py-1 rounded font-mono text-sm"
                      placeholder="PLAYER1"
                      maxLength={10}
                      style={{ textTransform: 'uppercase' }}
                    />
                    <button
                      onClick={handleUpdateName}
                      className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-xs font-bold border-2 border-green-400"
                    >
                      OK
                    </button>
                  </div>
                </div>
                {player && (
                  <div className="text-left border-l-2 border-green-600 pl-4">
                    <div className="text-xs text-green-400">HIGH SCORE</div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {player.highScore.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>
          
          {/* Tab Navigation */}
          <nav className="flex justify-center mb-8">
            <div className="bg-black/50 p-2 rounded-lg border-2 border-purple-600 flex gap-2">
              {tabButtons.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`px-6 py-3 rounded-lg font-bold transition-all text-sm ${
                    currentTab === tab.id
                      ? 'arcade-button text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border-2 border-gray-600'
                  }`}
                >
                  <span className="text-xl mr-2">{tab.icon}</span>
                  <span className="pixel-font">{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>
          
          {/* Main Content */}
          <main>
            {currentTab === 'game' && (
              <div className="max-w-4xl mx-auto">
                {player ? (
                  <RetroGameCanvas 
                    playerId={playerId}
                    onGameOver={(score) => {
                      Sentry.logger.info("Game over", { playerId, finalScore: score });
                    }}
                  />
                ) : (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4 animate-spin">🪓</div>
                    <div className="text-xl pixel-font text-green-400">
                      LOADING...
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {currentTab === 'leaderboard' && (
              <div className="max-w-2xl mx-auto">
                <RetroLeaderboard 
                  currentPlayerId={player?._id}
                />
              </div>
            )}
            
            {currentTab === 'achievements' && (
              <div className="max-w-4xl mx-auto">
                <RetroAchievements 
                  unlockedAchievements={player?.achievements || []}
                />
              </div>
            )}
          </main>
          
          {/* Footer */}
          <footer className="text-center mt-12 text-green-600 text-xs pixel-font">
            <div className="mb-2">
              🌲 NEXT.JS + CONVEX + PHASER + SENTRY 🚀
            </div>
            <div className="text-green-700">
              © 2024 LOGMASTER ARCADE - INSERT COIN TO CONTINUE
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}