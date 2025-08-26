'use client';

import { useState, useEffect } from 'react';
import * as Sentry from "@sentry/nextjs";
import GameCanvas from '@/components/GameCanvas';
import Leaderboard from '@/components/Leaderboard';
import Achievements from '@/components/Achievements';
import { gameManager, GameState } from '@/lib/game-manager';
import {shortUUID} from '@/lib/utils';

export default function Home() {
  const [playerId] = useState(() => `player_${shortUUID()}`);
  const [playerName, setPlayerName] = useState('');
  const [currentTab, setCurrentTab] = useState<'game' | 'leaderboard' | 'achievements'>('game');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    Sentry.logger.info("LogMaster application started", { playerId });
    
    const initializeGame = async () => {
      try {
        await gameManager.initialize(playerId);
        const state = gameManager.getGameState();
        setGameState(state);
        setPlayerName(state?.playerName || '');
        
        Sentry.logger.info("Game state loaded successfully", { 
          playerId,
          playerName: state?.playerName,
          currentScore: state?.score || 0
        });
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            playerId
          }
        });
      }
    };

    initializeGame();
  }, [playerId]);

  const updatePlayerName = () => {
    if (playerName.trim()) {
      gameManager.updateGameState((state) => {
        state.playerName = playerName.trim();
      });
      const newState = gameManager.getGameState();
      setGameState(newState);
      
      Sentry.logger.info("Player name updated", { 
        playerId,
        newPlayerName: playerName.trim()
      });
    }
  };

  const startNewGame = () => {
    setHasStarted(true);
    setCurrentTab('game');
    
    Sentry.logger.info("New game session started", {
      playerId,
      playerName: gameState?.playerName
    });
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">🌲</div>
          <h1 className="text-2xl font-bold text-green-800 mb-2">Loading LogMaster...</h1>
          <p className="text-green-600">Preparing your lumberjack adventure!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-200">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-6xl">🪓</div>
            <div>
              <h1 className="text-5xl font-bold text-green-800 mb-2">LogMaster</h1>
              <p className="text-lg text-green-600">The Ultimate Wood Chopping Experience</p>
            </div>
            <div className="text-6xl">🌲</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 inline-block shadow-lg">
            <div className="flex items-center gap-4">
              <div className="text-2xl">👤</div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lumberjack Name:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-1 text-sm"
                    placeholder="Enter your name"
                    maxLength={20}
                  />
                  <button
                    onClick={updatePlayerName}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <nav className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow-lg p-2 flex gap-2">
            <button
              onClick={() => setCurrentTab('game')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                currentTab === 'game'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'text-green-600 hover:bg-green-50'
              }`}
            >
              🎮 Game
            </button>
            <button
              onClick={() => setCurrentTab('leaderboard')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                currentTab === 'leaderboard'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'text-green-600 hover:bg-green-50'
              }`}
            >
              🏆 Leaderboard
            </button>
            <button
              onClick={() => setCurrentTab('achievements')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                currentTab === 'achievements'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'text-green-600 hover:bg-green-50'
              }`}
            >
              🏅 Achievements
            </button>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto">
          {currentTab === 'game' && (
            <div>
              {!hasStarted ? (
                <div className="text-center bg-white rounded-lg shadow-lg p-12">
                  <div className="text-8xl mb-6">🪵</div>
                  <h2 className="text-3xl font-bold text-green-800 mb-4">
                    Welcome to LogMaster!
                  </h2>
                  <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                    Test your lumberjack skills in this fast-paced wood chopping game! Click on logs to chop them, 
                    build combos for bonus points, and unlock achievements as you become the ultimate LogMaster.
                  </p>
                  <div className="grid md:grid-cols-3 gap-6 mb-8 text-left max-w-3xl mx-auto">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-3xl mb-2">🎯</div>
                      <h3 className="font-bold text-green-700 mb-2">How to Play</h3>
                      <p className="text-sm text-green-600">
                        Click on logs to chop them. Different log types give different points!
                      </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-3xl mb-2">🔥</div>
                      <h3 className="font-bold text-blue-700 mb-2">Build Combos</h3>
                      <p className="text-sm text-blue-600">
                        Chop logs consecutively to build combos and multiply your score!
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-3xl mb-2">🏆</div>
                      <h3 className="font-bold text-purple-700 mb-2">Unlock Achievements</h3>
                      <p className="text-sm text-purple-600">
                        Complete challenges to unlock special achievements and bragging rights!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={startNewGame}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg text-xl font-bold transition-colors"
                  >
                    Start Chopping! 🪓
                  </button>
                </div>
              ) : (
                <GameCanvas playerId={playerId} />
              )}
            </div>
          )}

          {currentTab === 'leaderboard' && (
            <Leaderboard 
              currentPlayerScore={gameState.score}
              currentPlayerId={playerId}
            />
          )}

          {currentTab === 'achievements' && (
            <Achievements achievements={gameState.achievements || []} />
          )}
        </main>

        <footer className="text-center mt-12 text-green-700">
          <p className="text-sm">
            🌲 Next.js + Convex + Sentry 🚀
          </p>
        </footer>
      </div>
    </div>
  );
}
