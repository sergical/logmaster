'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Sentry from "@sentry/nextjs";
import { gameManager, GameState, LogItem } from '@/lib/game-manager';

interface GameCanvasProps {
  playerId: string;
}

export default function GameCanvas({ playerId }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const animationRef = useRef<number>();

  useEffect(() => {
    const initGame = async () => {
      try {
        await gameManager.initialize(playerId);
        const initialState = gameManager.getGameState();
        setGameState(initialState);
        
        Sentry.logger.info("Game initialized for player", { 
          playerId,
          initialScore: initialState?.score || 0
        });
      } catch (error) {
        Sentry.logger.error("Failed to initialize game", { 
          error: error instanceof Error ? error.message : String(error),
          playerId 
        });
      }
    };

    initGame();
  }, [playerId]);

  const spawnRandomLog = useCallback(() => {
    if (Math.random() < 0.3) {
      gameManager.spawnLog();
      const newState = gameManager.getGameState();
      setGameState(newState);
      
      Sentry.logger.debug("Random log spawned during gameplay");
    }
  }, []);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameState || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const clickStartTime = Date.now();

    const clickedLog = gameState.logs.find(log => {
      if (log.chopped) return false;
      
      const logSize = getLogSize(log.size);
      return (
        x >= log.x - logSize/2 && 
        x <= log.x + logSize/2 && 
        y >= log.y - logSize/2 && 
        y <= log.y + logSize/2
      );
    });

    if (clickedLog) {
      const clickEndTime = Date.now();
      const reactionTime = clickEndTime - clickStartTime;
      
      const result = gameManager.chopLog(clickedLog.id, reactionTime);
      
      if (result.success) {
        spawnRandomLog();
      }
      
      const newState = gameManager.getGameState();
      setGameState(newState);
    } else {
      gameManager.resetCombo();
      const newState = gameManager.getGameState();
      setGameState(newState);
      
      Sentry.logger.debug("Missed click - combo reset", { 
        clickX: x, 
        clickY: y,
        playerId 
      });
    }
  }, [gameState, playerId, spawnRandomLog]);

  const getLogSize = (size: LogItem['size']): number => {
    switch (size) {
      case 'small': return 40;
      case 'medium': return 60;
      case 'large': return 80;
      case 'giant': return 100;
      default: return 50;
    }
  };

  const getLogColor = (log: LogItem): string => {
    if (log.chopped) return '#8B4513';
    
    switch (log.type) {
      case 'regular': return '#D2B48C';
      case 'hardwood': return '#A0522D';
      case 'golden': return '#FFD700';
      case 'mystic': return '#9370DB';
      default: return '#D2B48C';
    }
  };

  const drawLog = (ctx: CanvasRenderingContext2D, log: LogItem) => {
    const size = getLogSize(log.size);
    const color = getLogColor(log);
    
    ctx.fillStyle = color;
    ctx.fillRect(log.x - size/2, log.y - size/2, size, size);
    
    if (!log.chopped && log.health < log.maxHealth) {
      ctx.fillStyle = '#FF0000';
      const healthBarWidth = size * 0.8;
      const healthBarHeight = 4;
      const healthPercentage = log.health / log.maxHealth;
      
      ctx.fillRect(log.x - healthBarWidth/2, log.y - size/2 - 10, healthBarWidth * healthPercentage, healthBarHeight);
    }
    
    if (log.chopped) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(log.x - size/2, log.y - size/2);
      ctx.lineTo(log.x + size/2, log.y + size/2);
      ctx.moveTo(log.x + size/2, log.y - size/2);
      ctx.lineTo(log.x - size/2, log.y + size/2);
      ctx.stroke();
    }
  };

  const draw = useCallback(() => {
    if (!canvasRef.current || !gameState) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    gameState.logs.forEach(log => {
      drawLog(ctx, log);
    });

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${gameState.score}`, 20, 40);
    ctx.fillText(`Combo: ${gameState.currentCombo}x`, 20, 70);
    ctx.fillText(`Level: ${gameState.level}`, 20, 100);
    
    if (gameState.currentCombo > 0) {
      ctx.fillStyle = '#FF6B6B';
      ctx.font = '18px Arial';
      ctx.fillText(`Multiplier: ${Math.min(Math.floor(gameState.currentCombo / 5) + 1, 5)}x`, 20, 130);
    }
  }, [gameState]);

  const gameLoop = useCallback(() => {
    draw();
    if (isGameRunning) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
  }, [draw, isGameRunning]);

  const startGame = () => {
    setIsGameRunning(true);
    Sentry.logger.info("Game started", { playerId });
    
    for (let i = 0; i < 3; i++) {
      gameManager.spawnLog();
    }
    const newState = gameManager.getGameState();
    setGameState(newState);
  };

  const stopGame = () => {
    setIsGameRunning(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    Sentry.logger.info("Game stopped", { 
      playerId,
      finalScore: gameState?.score || 0,
      totalChops: gameState?.totalChops || 0
    });
  };

  useEffect(() => {
    if (isGameRunning) {
      gameLoop();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isGameRunning, gameLoop]);

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-96 bg-green-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🌲</div>
          <p className="text-lg text-green-800">Loading the forest...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-green-800">🪓 LogMaster</h2>
        <div className="flex gap-4">
          {!isGameRunning ? (
            <button
              onClick={startGame}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Start Chopping! 🌲
            </button>
          ) : (
            <button
              onClick={stopGame}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Stop Game 🛑
            </button>
          )}
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onClick={handleCanvasClick}
        className="border-4 border-green-800 rounded-lg cursor-crosshair bg-green-200"
        style={{ 
          maxWidth: '100%', 
          height: 'auto',
          display: 'block'
        }}
      />
      
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-white p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{gameState.score}</div>
          <div className="text-gray-600">Score</div>
        </div>
        <div className="bg-white p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-600">{gameState.currentCombo}x</div>
          <div className="text-gray-600">Current Combo</div>
        </div>
        <div className="bg-white p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{gameState.bestCombo}x</div>
          <div className="text-gray-600">Best Combo</div>
        </div>
        <div className="bg-white p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600">{gameState.totalChops}</div>
          <div className="text-gray-600">Total Chops</div>
        </div>
      </div>

      <div className="mt-4 text-center text-sm text-gray-600">
        🎯 Click on logs to chop them! Miss and lose your combo. Different log types give different points!
      </div>
    </div>
  );
}