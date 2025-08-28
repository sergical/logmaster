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

  
  const { player, isInitialized, initializePlayer, updatePlayerName } = useConvexGame(playerId);
  const [playerName, setPlayerName] = useState('');
  const [nameError, setNameError] = useState('');
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  
  useEffect(() => {
    Sentry.logger.info("Retro LogMaster initialized", { playerId });
  }, [playerId]);
  
  useEffect(() => {
    if (player && !playerName && isInitialized) {
      // Only set initial name if playerName is empty and player is initialized
      setPlayerName(player.name);
    }
  }, [player, playerName, isInitialized]);
  
  const handleUpdateName = useCallback(async () => {
    if (playerName.trim()) {
      try {
        setNameError(''); // Clear any existing error
        
        if (!isInitialized) {
          // First time - initialize player
          Sentry.logger.info("Initializing player", { 
            playerId, 
            playerName: playerName.trim() 
          });
          await initializePlayer(playerName.trim());
          Sentry.logger.info("Player initialized successfully", { playerId, playerName: playerName.trim() });
        } else {
          // Update existing player
          Sentry.logger.info("Attempting to update player name", { 
            playerId, 
            currentPlayerName: player?.name,
            newPlayerName: playerName.trim() 
          });
          await updatePlayerName(playerName.trim());
          Sentry.logger.info("Player name updated successfully", { playerId, playerName: playerName.trim() });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update name';
        setNameError(errorMessage);
        Sentry.captureException(error);
        console.error('Failed to update player name:', error);
      }
    }
  }, [playerName, isInitialized, initializePlayer, updatePlayerName, playerId, player?.name]);
  
  const tabButtons = useMemo(() => [
    { id: 'game' as const, label: 'GAME', icon: '🎮' },
    { id: 'leaderboard' as const, label: 'SCORES', icon: '🏆' },
    { id: 'achievements' as const, label: 'AWARDS', icon: '🏅' },
  ], []);
  
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Skip to main content link for accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-yellow-400 text-black px-4 py-2 rounded font-bold z-50">
        Skip to main content
      </a>
      {/* CRT Monitor Effect */}
      <div className="min-h-screen bg-gradient-to-b from-green-950 via-green-900 to-black crt-effect">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <header className="text-center mb-8">
            <h1 className="text-6xl md:text-8xl font-bold text-yellow-400 mb-4 pixel-font retro-glow animate-pulse" aria-label="LogMaster Game">
              LOGMASTER
            </h1>
            <div className="text-green-400 text-xl mb-6 pixel-font">
              ARCADE EDITION
            </div>
            
            {/* Player Info */}
            <div className={`inline-block bg-black/50 p-4 rounded-lg border-2 mb-6 ${
              !isInitialized ? 'border-yellow-400 animate-pulse' : 'border-green-600'
            }`}>
              <div className="flex items-center gap-4">
                <div className="text-3xl">👤</div>
                <div className="text-left">
                  <label className={`block text-xs mb-1 pixel-font ${
                    !isInitialized ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {!isInitialized ? 'ENTER YOUR NAME TO START:' : 'PLAYER NAME:'}
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
                      aria-label="Enter your player name"
                      aria-required="true"
                      aria-describedby={nameError ? "name-error" : undefined}
                    />
                    <button
                      onClick={handleUpdateName}
                      className={`px-3 py-1 rounded text-xs font-bold border-2 ${
                        !isInitialized 
                          ? 'bg-yellow-600 hover:bg-yellow-500 border-yellow-400 animate-pulse' 
                          : 'bg-green-600 hover:bg-green-500 border-green-400'
                      }`}
                      aria-label={!isInitialized ? "Start game with this name" : "Update player name"}
                    >
                      {!isInitialized ? 'START!' : 'OK'}
                    </button>
                  </div>
                  {nameError && (
                    <div id="name-error" className="text-red-400 text-xs font-mono mt-1 pixel-font" role="alert">
                      {nameError}
                    </div>
                  )}
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
          
          {/* Audio Controls */}
          <div className="flex justify-center mb-4">
            <div className="bg-black/50 p-3 rounded-lg border-2 border-gray-600 flex items-center gap-4">
              <div className="text-sm pixel-font text-green-400">AUDIO:</div>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`px-3 py-1 rounded text-xs font-bold border-2 ${
                  isMuted 
                    ? 'bg-red-600 hover:bg-red-500 border-red-400' 
                    : 'bg-green-600 hover:bg-green-500 border-green-400'
                }`}
                aria-label={isMuted ? "Unmute sound" : "Mute sound"}
                aria-pressed={isMuted}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs pixel-font text-green-400">VOL:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-20 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-600"
                  disabled={isMuted}
                  aria-label="Volume control"
                  aria-valuetext={`Volume ${Math.round(volume * 100)} percent`}
                />
                <span className="text-xs pixel-font text-green-400 w-8">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <nav className="flex justify-center mb-8" role="tablist" aria-label="Game navigation">
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
                  role="tab"
                  aria-selected={currentTab === tab.id}
                  aria-controls={`${tab.id}-panel`}
                >
                  <span className="text-xl mr-2">{tab.icon}</span>
                  <span className="pixel-font">{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>
          
          {/* Main Content */}
          <main id="main-content">
            {currentTab === 'game' && (
              <div className="max-w-4xl mx-auto" role="tabpanel" id="game-panel" aria-labelledby="game-tab">
                {isInitialized && player ? (
                  <RetroGameCanvas 
                    playerId={playerId}
                    volume={volume}
                    isMuted={isMuted}
                    onGameOver={(score) => {
                      Sentry.logger.info("Game over", { playerId, score });
                    }}
                  />
                ) : (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">🪓</div>
                    <div className="text-xl pixel-font text-green-400 mb-4">
                      ENTER YOUR NAME TO START PLAYING
                    </div>
                    <div className="text-sm pixel-font text-green-600">
                      Click &ldquo;OK&rdquo; next to the name field above ↑
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