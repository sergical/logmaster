'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useConvexGame } from '@/lib/use-convex-game';
import * as Sentry from "@sentry/nextjs";

interface RetroGameCanvasProps {
  playerId: string;
  onGameOver?: (score: number) => void;
}

interface PhaserGame {
  destroy: (keepCanvas?: boolean) => void;
  scale: {
    refresh: () => void;
  };
}

// Dynamic import for Phaser to avoid SSR issues
const loadPhaser = async () => {
  if (typeof window === 'undefined') return null;
  const phaser = await import('phaser');
  return phaser;
};

export default function RetroGameCanvas({ playerId, onGameOver }: RetroGameCanvasProps) {
  const gameRef = useRef<PhaserGame | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [phaserLoaded, setPhaserLoaded] = useState(false);
  const [gameError, setGameError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentCombo, setCurrentCombo] = useState(0);
  
  const { startGame, endGame } = useConvexGame(playerId);
  
  // Load Phaser dynamically
  useEffect(() => {
    loadPhaser().then((phaser) => {
      if (phaser) {
        setPhaserLoaded(true);
      }
    }).catch((error) => {
      console.error('Failed to load Phaser:', error);
      setGameError('Failed to load game engine');
    });
  }, []);
  
  // Cleanup function
  const cleanupGame = useCallback(() => {
    if (gameRef.current) {
      try {
        gameRef.current.destroy(true);
      } catch (error) {
        console.error('Error destroying game:', error);
      } finally {
        gameRef.current = null;
      }
    }
  }, []);

  // Initialize game when ready
  useEffect(() => {
    console.log('Game init effect:', { 
      hasContainer: !!containerRef.current, 
      isPlaying, 
      phaserLoaded,
      showInstructions,
      isInitializing,
      gameExists: !!gameRef.current
    });
    
    // Early returns for conditions that prevent initialization
    if (!containerRef.current || !isPlaying || showInstructions || !phaserLoaded || isInitializing || gameRef.current) {
      return;
    }
    
    setIsInitializing(true);
    setGameError(null);
    
    const initGame = async () => {
      try {
        const Phaser = await loadPhaser();
        if (!Phaser) {
          throw new Error('Phaser failed to load');
        }
        
        console.log('Initializing Phaser game...');
        
        const container = containerRef.current;
        if (!container) {
          throw new Error('Container not found');
        }

        // Wait for container to be properly rendered
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get container dimensions with fallback
        const containerRect = container.getBoundingClientRect();
        const containerWidth = Math.max(containerRect.width, 800);
        const containerHeight = Math.max(containerRect.height, 600);
        
        console.log('Container dimensions:', containerWidth, 'x', containerHeight);
        
        // LogMaster Game Scene
        const GameScene = class extends Phaser.Scene {
          private score = 0;
          private combo = 0;
          private level = 1;
          private gameTime = 0;
          private logs: Phaser.GameObjects.Rectangle[] = [];
          private scoreText!: Phaser.GameObjects.Text;
          private comboText!: Phaser.GameObjects.Text;
          private levelText!: Phaser.GameObjects.Text;
          private timeText!: Phaser.GameObjects.Text;
          private logSpawnTimer = 0;
          private logSpawnRate = 2000; // milliseconds
          private axeCursor!: Phaser.GameObjects.Graphics;
          private gameStartTime = 0;
          
          constructor() {
            super({ key: 'GameScene' });
          }
          
          create() {
            console.log('LogMaster GameScene create() called!');
            
            // Set background color
            this.cameras.main.setBackgroundColor('#1a3d0a');
            
            // Create UI elements
            this.scoreText = this.add.text(20, 20, 'SCORE: 0', {
              fontSize: '24px',
              color: '#ffff00',
              fontFamily: 'monospace'
            });
            
            this.comboText = this.add.text(20, 50, 'COMBO: 0', {
              fontSize: '18px',
              color: '#ff8800',
              fontFamily: 'monospace'
            });
            
            this.levelText = this.add.text(20, 80, 'LEVEL: 1', {
              fontSize: '18px',
              color: '#00ff00',
              fontFamily: 'monospace'
            });
            
            this.timeText = this.add.text(20, 110, 'TIME: 0:00', {
              fontSize: '18px',
              color: '#00ffff',
              fontFamily: 'monospace'
            });
            
            this.gameStartTime = this.time.now;
            
            // Create custom axe cursor
            this.axeCursor = this.add.graphics();
            this.drawAxe();
            
            // Hide default cursor and track mouse
            this.input.setDefaultCursor('none');
            
            this.input.on('pointermove', (pointer: any) => {
              this.axeCursor.x = pointer.x;
              this.axeCursor.y = pointer.y;
            });
            
            // Handle clicks for chopping
            this.input.on('pointerdown', (pointer: any) => {
              this.chopAtPosition(pointer.x, pointer.y);
            });
            
            console.log('LogMaster GameScene create() completed!');
          }
          
          drawAxe() {
            this.axeCursor.clear();
            // Draw simple pixel axe
            this.axeCursor.fillStyle(0x8B4513); // Brown handle
            this.axeCursor.fillRect(-2, -10, 4, 20);
            this.axeCursor.fillStyle(0xC0C0C0); // Silver blade
            this.axeCursor.fillRect(-8, -8, 16, 6);
          }
          
          spawnLog() {
            const x = Phaser.Math.Between(50, this.cameras.main.width - 50);
            const y = -50;
            
            // Determine log type based on level and random chance
            let logType = 'normal';
            let color = 0x8B4513; // Brown
            let width = 60;
            let height = 40;
            let hits = 2;
            let points = 50;
            
            const rand = Math.random();
            if (rand < 0.02) { // 2% chance for error log
              logType = 'error';
              color = 0xFF0000; // Red
              width = 80;
              height = 50;
              hits = 1;
              points = -100; // Negative points!
            } else if (rand < 0.07) { // 5% chance for golden log
              logType = 'golden';
              color = 0xFFD700;
              hits = 1;
              points = 500;
            } else if (rand < 0.25 + (this.level * 0.05)) { // Increasing chance for hardwood
              logType = 'hardwood';
              color = 0x654321;
              width = 70;
              height = 45;
              hits = 3;
              points = 100;
            }
            
            const log = this.add.rectangle(x, y, width, height, color) as any;
            log.setStrokeStyle(2, 0x000000);
            log.logType = logType;
            log.hitsRemaining = hits;
            log.points = points;
            log.fallSpeed = Phaser.Math.Between(100, 150 + (this.level * 10));
            
            // Add error symbol for error logs
            if (logType === 'error') {
              const errorText = this.add.text(log.x, log.y, '⚠️', {
                fontSize: '20px',
                color: '#ffffff'
              }).setOrigin(0.5);
              log.errorSymbol = errorText;
            }
            
            // Sentry logging for log spawning
            Sentry.addBreadcrumb({
              message: 'Log spawned',
              category: 'game',
              data: {
                logType,
                level: this.level,
                position: { x, y },
                points,
                hits
              },
              level: 'info'
            });
            
            this.logs.push(log);
          }
          
          chopAtPosition(x: number, y: number) {
            let hitSomething = false;
            
            // Sentry logging for chop attempt
            Sentry.addBreadcrumb({
              message: 'Chop attempted',
              category: 'game',
              data: {
                position: { x, y },
                currentCombo: this.combo,
                level: this.level,
                logsOnScreen: this.logs.length
              },
              level: 'info'
            });
            
            // Check for log hits
            for (let i = this.logs.length - 1; i >= 0; i--) {
              const log = this.logs[i] as any;
              const bounds = log.getBounds();
              
              if (Phaser.Geom.Rectangle.Contains(bounds, x, y)) {
                log.hitsRemaining--;
                hitSomething = true;
                
                // Handle error logs - they throw actual errors!
                if (log.logType === 'error') {
                  // Create structured error for Sentry
                  const errorLogError = new Error('Player chopped an error log!');
                  errorLogError.name = 'ErrorLogChoppedError';
                  
                  Sentry.captureException(errorLogError, {
                    tags: {
                      gameEvent: 'error_log_chopped',
                      logType: 'error'
                    },
                    extra: {
                      playerScore: this.score,
                      playerCombo: this.combo,
                      gameLevel: this.level,
                      logPosition: { x: log.x, y: log.y },
                      gameTime: this.time.now - this.gameStartTime
                    },
                    level: 'warning'
                  });
                  
                  console.error('🚨 ERROR LOG CHOPPED! This generates a Sentry error for demo purposes');
                }
                
                // Visual feedback - flash the log
                this.tweens.add({
                  targets: log,
                  alpha: 0.5,
                  duration: 100,
                  yoyo: true,
                  ease: 'Power2'
                });
                
                if (log.hitsRemaining <= 0) {
                  // Log destroyed
                  const previousCombo = this.combo;
                  
                  if (log.logType === 'error') {
                    // Error logs break combo and subtract points
                    this.combo = 0;
                    this.score = Math.max(0, this.score + log.points); // Negative points
                  } else {
                    this.combo++;
                    const multiplier = Math.max(1, Math.floor(this.combo / 5) + 1);
                    this.score += log.points * multiplier;
                  }
                  
                  // Sentry logging for successful chop
                  Sentry.addBreadcrumb({
                    message: 'Log destroyed',
                    category: 'game',
                    data: {
                      logType: log.logType,
                      points: log.points,
                      newScore: this.score,
                      comboChange: this.combo - previousCombo,
                      multiplier: log.logType !== 'error' ? Math.max(1, Math.floor(this.combo / 5) + 1) : 0
                    },
                    level: log.logType === 'error' ? 'warning' : 'info'
                  });
                  
                  // Update React state
                  setCurrentScore(this.score);
                  setCurrentCombo(this.combo);
                  
                  // Clean up error symbol if it exists
                  if (log.errorSymbol) {
                    log.errorSymbol.destroy();
                  }
                  
                  // Remove log
                  log.destroy();
                  this.logs.splice(i, 1);
                  
                  // Particle effect
                  this.createChopEffect(log.x, log.y, log.logType);
                } else {
                  // Log damaged but not destroyed
                  log.setFillStyle(log.fillColor, 0.8);
                  
                  Sentry.addBreadcrumb({
                    message: 'Log damaged',
                    category: 'game',
                    data: {
                      logType: log.logType,
                      hitsRemaining: log.hitsRemaining,
                      position: { x: log.x, y: log.y }
                    },
                    level: 'info'
                  });
                }
                
                break; // Only hit one log per click
              }
            }
            
            // Miss penalty
            if (!hitSomething) {
              const previousCombo = this.combo;
              this.combo = 0;
              setCurrentCombo(0);
              
              // Sentry logging for miss
              Sentry.addBreadcrumb({
                message: 'Player missed',
                category: 'game',
                data: {
                  lostCombo: previousCombo,
                  clickPosition: { x, y },
                  logsOnScreen: this.logs.length
                },
                level: 'info'
              });
            }
            
            // Update UI
            this.updateUI();
          }
          
          createChopEffect(x: number, y: number, logType: string = 'normal') {
            // Different colors based on log type
            let particleColor = 0xffaa00; // Default orange
            let particleCount = 5;
            
            switch (logType) {
              case 'golden':
                particleColor = 0xFFD700;
                particleCount = 8;
                break;
              case 'hardwood':
                particleColor = 0x8B4513;
                particleCount = 6;
                break;
              case 'error':
                particleColor = 0xFF0000;
                particleCount = 10;
                break;
            }
            
            // Simple particle effect
            for (let i = 0; i < particleCount; i++) {
              const particle = this.add.rectangle(x, y, 4, 4, particleColor);
              this.tweens.add({
                targets: particle,
                x: x + Phaser.Math.Between(-30, 30),
                y: y + Phaser.Math.Between(-20, 20),
                alpha: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => particle.destroy()
              });
            }
            
            // Special effect for error logs
            if (logType === 'error') {
              const errorText = this.add.text(x, y - 30, 'ERROR!', {
                fontSize: '16px',
                color: '#ff0000',
                fontFamily: 'monospace'
              }).setOrigin(0.5);
              
              this.tweens.add({
                targets: errorText,
                y: y - 60,
                alpha: 0,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => errorText.destroy()
              });
            }
          }
          
          updateUI() {
            this.scoreText.setText(`SCORE: ${this.score.toLocaleString()}`);
            this.comboText.setText(`COMBO: ${this.combo}`);
            this.levelText.setText(`LEVEL: ${this.level}`);
            
            const gameTimeSeconds = Math.floor((this.time.now - this.gameStartTime) / 1000);
            const minutes = Math.floor(gameTimeSeconds / 60);
            const seconds = gameTimeSeconds % 60;
            this.timeText.setText(`TIME: ${minutes}:${seconds.toString().padStart(2, '0')}`);
          }
          
          update(time: number, delta: number) {
            this.gameTime += delta;
            
            // Level progression every 30 seconds
            const newLevel = Math.floor(this.gameTime / 30000) + 1;
            if (newLevel > this.level) {
              this.level = newLevel;
              this.logSpawnRate = Math.max(500, 2000 - (this.level * 100)); // Increase spawn rate
            }
            
            // Spawn logs
            this.logSpawnTimer += delta;
            if (this.logSpawnTimer > this.logSpawnRate) {
              this.spawnLog();
              this.logSpawnTimer = 0;
            }
            
            // Update log positions and remove fallen logs
            for (let i = this.logs.length - 1; i >= 0; i--) {
              const log = this.logs[i] as any;
              log.y += (log.fallSpeed * delta) / 1000;
              
              // Update error symbol position
              if (log.errorSymbol) {
                log.errorSymbol.y = log.y;
              }
              
              // Remove logs that fell off screen (miss)
              if (log.y > this.cameras.main.height + 50) {
                const previousCombo = this.combo;
                this.combo = 0; // Reset combo on miss
                setCurrentCombo(0);
                
                // Sentry logging for missed log
                Sentry.addBreadcrumb({
                  message: 'Log fell off screen',
                  category: 'game',
                  data: {
                    logType: log.logType,
                    lostCombo: previousCombo,
                    logPoints: log.points,
                    fallSpeed: log.fallSpeed
                  },
                  level: 'info'
                });
                
                // Clean up error symbol
                if (log.errorSymbol) {
                  log.errorSymbol.destroy();
                }
                
                log.destroy();
                this.logs.splice(i, 1);
                this.updateUI();
              }
            }
          }
        };
        
        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO,
          parent: container,
          width: containerWidth,
          height: containerHeight,
          backgroundColor: '#1a3d0a',
          scene: GameScene,
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
          },
          dom: {
            createContainer: true
          },
          physics: {
            default: 'arcade',
            arcade: {
              gravity: { y: 0, x: 0 },
              debug: false
            }
          }
        };
        
        console.log('Creating Phaser game with config:', config);
        gameRef.current = new Phaser.Game(config) as PhaserGame;
        
        console.log('Phaser game created successfully');
        
      } catch (error) {
        console.error('Failed to initialize game:', error);
        setGameError(error instanceof Error ? error.message : 'Game initialization failed');
      } finally {
        setIsInitializing(false);
      }
    };
    
    initGame();
    
    return () => {
      cleanupGame();
    };
  }, [isPlaying, phaserLoaded, showInstructions]);
  
  const handleStartGame = async () => {
    console.log('Starting game...');
    cleanupGame(); // Clean up any existing game
    setGameError(null);
    setShowInstructions(false);
    setIsPlaying(true);
    await startGame();
    console.log('Game start initiated');
  };
  
  const handleEndGame = async () => {
    console.log('Ending game with score:', currentScore);
    
    // Save game results to Convex
    try {
      await endGame({
        score: currentScore,
        maxCombo: currentCombo,
        level: Math.floor((Date.now() / 1000) / 30) + 1 // Approximate level
      });
      
      if (onGameOver) {
        onGameOver(currentScore);
      }
    } catch (error) {
      console.error('Failed to save game:', error);
    }
    
    cleanupGame();
    setIsPlaying(false);
    setShowInstructions(true);
    setCurrentScore(0);
    setCurrentCombo(0);
  };
  
  return (
    <div className="bg-black p-4 rounded-lg shadow-2xl border-4 border-green-800">
      {showInstructions && (
        <div className="bg-gradient-to-b from-green-900 to-green-950 p-8 rounded-lg text-center">
          <div className="pixel-font text-yellow-400 text-4xl mb-4 animate-pulse">
            🪓 LOGMASTER 🪓
          </div>
          <div className="text-green-300 text-xl mb-6">
            The Ultimate Retro Wood Chopping Experience!
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6 text-left max-w-2xl mx-auto">
            <div className="bg-green-800/50 p-4 rounded border-2 border-green-600">
              <div className="text-yellow-400 font-bold mb-2">🎮 Controls</div>
              <div className="text-green-200 text-sm">
                • Move mouse to aim axe<br/>
                • Click directly on logs to chop<br/>
                • Build combos with consecutive hits<br/>
                • Missing resets your combo!
              </div>
            </div>
            <div className="bg-green-800/50 p-4 rounded border-2 border-green-600">
              <div className="text-yellow-400 font-bold mb-2">🌲 Log Types</div>
              <div className="text-green-200 text-sm">
                • Brown: Normal (2 hits, 50 pts)<br/>
                • Dark: Hardwood (3 hits, 100 pts)<br/>
                • Gold: Bonus (1 hit, 500 pts)<br/>
                • <span className="text-red-400">Red: Error (-100 pts!) ⚠️</span>
              </div>
            </div>
          </div>
          
          {gameError && (
            <div className="bg-red-900/50 border-2 border-red-600 p-4 rounded-lg mb-4">
              <div className="text-red-400 font-bold mb-2">⚠️ Error</div>
              <div className="text-red-300 text-sm">{gameError}</div>
            </div>
          )}
          
          <button
            onClick={handleStartGame}
            disabled={!phaserLoaded || isInitializing}
            className="bg-gradient-to-b from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 text-white px-8 py-4 rounded-lg text-2xl font-bold border-4 border-green-900 shadow-lg transform hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isInitializing ? '🔄 LOADING...' : '🎮 START GAME 🎮'}
          </button>
          
          <div className="mt-4 text-green-400 text-sm animate-pulse">
            {!phaserLoaded ? 'Loading game engine...' : 'Press START to begin your lumberjack adventure!'}
          </div>
        </div>
      )}
      
      <div 
        ref={containerRef} 
        className={`${showInstructions ? 'hidden' : 'block'} w-full h-[600px] relative`}
        style={{ 
          imageRendering: 'pixelated',
          border: '2px solid #2d5016',
          backgroundColor: '#2d5016',
          minHeight: '600px',
          overflow: 'hidden'
        }}
      />
      
      {isPlaying && (
        <div className="mt-4 text-center">
          {isInitializing && (
            <div className="text-green-400 mb-2 animate-pulse">
              🔄 Initializing game...
            </div>
          )}
          <button
            onClick={handleEndGame}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold border-2 border-red-800"
          >
            END GAME
          </button>
        </div>
      )}
    </div>
  );
}
