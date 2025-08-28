'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useConvexGame } from '@/lib/use-convex-game';
import * as Sentry from "@sentry/nextjs";

interface RetroGameCanvasProps {
  playerId: string;
  onGameOver?: (score: number) => void;
  volume?: number;
  isMuted?: boolean;
}

interface PhaserGame {
  destroy: (keepCanvas?: boolean) => void;
  scale: {
    refresh: () => void;
  };
  scene: {
    scenes: (Phaser.Scene & { audioContext?: AudioContext })[];
  };
}

interface LogObject extends Phaser.GameObjects.Rectangle {
  logType: string;
  hitsRemaining: number;
  points: number;
  fallSpeed: number;
  errorSymbol?: Phaser.GameObjects.Text;
}

interface ExtendedPointer extends Phaser.Input.Pointer {
  pointerType: string;
}

// Dynamic import for Phaser to avoid SSR issues
const loadPhaser = async () => {
  if (typeof window === 'undefined') return null;
  const phaser = await import('phaser');
  return phaser;
};

export default function RetroGameCanvas({ playerId, onGameOver, volume = 0.7, isMuted = false }: RetroGameCanvasProps) {
  const gameRef = useRef<PhaserGame | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [phaserLoaded, setPhaserLoaded] = useState(false);
  const [gameError, setGameError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentCombo, setCurrentCombo] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  
  const { startGame, endGame, checkAndUnlockAchievements } = useConvexGame(playerId);
  
  // Game stats tracking
  const [gameStats, setGameStats] = useState({
    chopsCount: 0,
    gameStartTime: 0,
    maxCombo: 0,
    fastestReaction: Number.MAX_SAFE_INTEGER
  });
  
  // Audio settings passed as props
  
  // Create refs to avoid stale closures in Phaser
  const gameStatsRef = useRef(gameStats);
  const checkAchievementsRef = useRef(checkAndUnlockAchievements);
  
  // Update refs when values change
  useEffect(() => {
    gameStatsRef.current = gameStats;
  }, [gameStats]);
  
  useEffect(() => {
    checkAchievementsRef.current = checkAndUnlockAchievements;
  }, [checkAndUnlockAchievements]);
  
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
        // Clean up any running audio oscillators and contexts
        if (gameRef.current.scene && gameRef.current.scene.scenes) {
          gameRef.current.scene.scenes.forEach((scene: Phaser.Scene & { audioContext?: AudioContext }) => {
            if (scene.audioContext && scene.audioContext.state !== 'closed') {
              scene.audioContext.close().catch(console.error);
            }
          });
        }
        
        // Destroy the Phaser game instance
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
          private totalPausedTime = 0;
          private pauseStartTime = 0;
          private isGameActive = false;
          private audioContext: AudioContext | null = null;
          private particles: Phaser.GameObjects.Graphics[] = [];
          private cracks: Phaser.GameObjects.Graphics[] = [];
          
          constructor() {
            super({ key: 'GameScene' });
          }
          
          // Sound effect methods
          initAudio() {
            try {
              this.audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            } catch (error) {
              console.warn('Audio context not supported:', error);
            }
          }
          
          playChopSound(logType: string = 'normal') {
            if (!this.audioContext || isMuted) return;
            
            try {
              const oscillator = this.audioContext.createOscillator();
              const gainNode = this.audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(this.audioContext.destination);
              
              // Different sounds for different log types
              switch (logType) {
                case 'error':
                  oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
                  oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.2);
                  gainNode.gain.setValueAtTime(0.1 * volume, this.audioContext.currentTime);
                  gainNode.gain.exponentialRampToValueAtTime(0.01 * volume, this.audioContext.currentTime + 0.2);
                  break;
                case 'golden':
                  // Higher pitched for golden logs
                  oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
                  oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.15);
                  gainNode.gain.setValueAtTime(0.15 * volume, this.audioContext.currentTime);
                  gainNode.gain.exponentialRampToValueAtTime(0.01 * volume, this.audioContext.currentTime + 0.15);
                  break;
                default:
                  // Normal wood chop sound
                  oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
                  oscillator.frequency.exponentialRampToValueAtTime(80, this.audioContext.currentTime + 0.1);
                  gainNode.gain.setValueAtTime(0.2 * volume, this.audioContext.currentTime);
                  gainNode.gain.exponentialRampToValueAtTime(0.01 * volume, this.audioContext.currentTime + 0.1);
              }
              
              oscillator.type = 'sawtooth';
              oscillator.start(this.audioContext.currentTime);
              oscillator.stop(this.audioContext.currentTime + 0.2);
            } catch (error) {
              console.warn('Failed to play chop sound:', error);
            }
          }
          
          playMissSound() {
            if (!this.audioContext || isMuted) return;
            
            try {
              const oscillator = this.audioContext.createOscillator();
              const gainNode = this.audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(this.audioContext.destination);
              
              // Miss sound - lower, descending tone
              oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
              oscillator.frequency.exponentialRampToValueAtTime(40, this.audioContext.currentTime + 0.3);
              gainNode.gain.setValueAtTime(0.1 * volume, this.audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01 * volume, this.audioContext.currentTime + 0.3);
              
              oscillator.type = 'square';
              oscillator.start(this.audioContext.currentTime);
              oscillator.stop(this.audioContext.currentTime + 0.3);
            } catch (error) {
              console.warn('Failed to play miss sound:', error);
            }
          }
          
          create() {
            console.log('LogMaster GameScene create() called!');
            
            // Initialize audio
            this.initAudio();
            
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
            
            // Don't start timer yet - wait for game to actually start
            this.gameStartTime = 0;
            this.totalPausedTime = 0;
            this.pauseStartTime = 0;
            this.isGameActive = false;
            
            // Create custom axe cursor
            this.axeCursor = this.add.graphics();
            this.drawAxe();
            
            // Hide default cursor and track pointer (mouse/touch)
            this.input.setDefaultCursor('none');
            
            this.input.on('pointermove', (pointer: ExtendedPointer) => {
              // Only show cursor when not using touch
              if (!pointer.isDown || pointer.primaryDown) {
                this.axeCursor.x = pointer.x;
                this.axeCursor.y = pointer.y;
                this.axeCursor.setVisible(true);
              }
            });
            
            // Handle clicks/taps for chopping
            this.input.on('pointerdown', (pointer: ExtendedPointer) => {
              // Hide cursor on touch to avoid visual clutter
              if (pointer.pointerType === 'touch') {
                this.axeCursor.setVisible(false);
              }
              this.chopAtPosition(pointer.x, pointer.y);
            });
            
            // Add keyboard controls
            this.input.keyboard!.on('keydown-SPACE', () => {
              setIsPaused(!isPaused);
            });
            
            // Show cursor again when touch ends
            this.input.on('pointerup', (pointer: ExtendedPointer) => {
              if (pointer.pointerType === 'touch') {
                this.axeCursor.setVisible(true);
              }
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
            
            const log = this.add.rectangle(x, y, width, height, color) as LogObject;
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
            
            // Structured logging for log spawning
            Sentry.logger.info('Log spawned', {
              logType,
              level: this.level,
              positionX: x,
              positionY: y,
              points,
              hits
            });
            
            this.logs.push(log);
          }
          
          chopAtPosition(x: number, y: number) {
            // Don't allow chopping when paused
            if (isPaused) return;
            
            let hitSomething = false;
            
            // Structured logging for chop attempt
            Sentry.logger.info('Chop attempted', {
              positionX: x,
              positionY: y,
              currentCombo: this.combo,
              level: this.level,
              logsOnScreen: this.logs.length
            });
            
            // Check for log hits
            for (let i = this.logs.length - 1; i >= 0; i--) {
              const log = this.logs[i] as LogObject;
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
                      logPositionX: log.x,
                      logPositionY: log.y,
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
                  this.playChopSound(log.logType);
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
                  
                  // Structured logging for successful chop
                  if (log.logType === 'error') {
                    Sentry.logger.warn('Log destroyed', {
                      logType: log.logType,
                      points: log.points,
                      newScore: this.score,
                      comboChange: this.combo - previousCombo,
                      multiplier: 0
                    });
                  } else {
                    Sentry.logger.info('Log destroyed', {
                      logType: log.logType,
                      points: log.points,
                      newScore: this.score,
                      comboChange: this.combo - previousCombo,
                      multiplier: Math.max(1, Math.floor(this.combo / 5) + 1)
                    });
                  }
                  
                  // Update game stats
                  setGameStats(prev => ({
                    ...prev,
                    chopsCount: prev.chopsCount + 1,
                    maxCombo: Math.max(prev.maxCombo, this.combo)
                  }));
                  
                  // Update React state
                  setCurrentScore(this.score);
                  setCurrentCombo(this.combo);
                  
                  // Check for achievements periodically (use refs to avoid stale closures)
                  const currentChops = gameStatsRef.current.chopsCount + 1;
                  if (currentChops % 5 === 0) {
                    checkAchievementsRef.current({
                      score: this.score,
                      combo: this.combo,
                      chops: currentChops
                    }).catch(console.error);
                  }
                  
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
                  
                  // Create crack effect on damaged log
                  this.createCrackEffect(log.x, log.y);
                  
                  Sentry.logger.info('Log damaged', {
                    logType: log.logType,
                    hitsRemaining: log.hitsRemaining,
                    positionX: log.x,
                    positionY: log.y
                  });
                }
                
                break; // Only hit one log per click
              }
            }
            
            // Miss penalty
            if (!hitSomething) {
              this.playMissSound();
              const previousCombo = this.combo;
              this.combo = 0;
              setCurrentCombo(0);
              
              // Structured logging for miss
              Sentry.logger.info('Player missed', {
                lostCombo: previousCombo,
                clickPositionX: x,
                clickPositionY: y,
                logsOnScreen: this.logs.length
              });
            }
            
            // Update UI
            this.updateUI();
          }
          
          createCrackEffect(x: number, y: number) {
            // Create crack lines on the log
            const crackGraphics = this.add.graphics();
            crackGraphics.lineStyle(2, 0x8B4513, 0.8); // Brown color for cracks
            
            // Generate random crack patterns
            const numCracks = Phaser.Math.Between(2, 4);
            for (let i = 0; i < numCracks; i++) {
              const startX = x + Phaser.Math.Between(-20, 20);
              const startY = y + Phaser.Math.Between(-15, 15);
              const endX = startX + Phaser.Math.Between(-15, 15);
              const endY = startY + Phaser.Math.Between(-15, 15);
              
              crackGraphics.moveTo(startX, startY);
              crackGraphics.lineTo(endX, endY);
              
              // Add some branching cracks
              if (Phaser.Math.Between(0, 1)) {
                const branchX = endX + Phaser.Math.Between(-8, 8);
                const branchY = endY + Phaser.Math.Between(-8, 8);
                crackGraphics.lineTo(branchX, branchY);
              }
            }
            
            crackGraphics.strokePath();
            
            // Track for cleanup
            this.cracks.push(crackGraphics);
            
            // Fade out the crack effect after a short time
            this.tweens.add({
              targets: crackGraphics,
              alpha: 0,
              duration: 2000,
              onComplete: () => {
                const index = this.cracks.indexOf(crackGraphics);
                if (index > -1) this.cracks.splice(index, 1);
                crackGraphics.destroy();
              }
            });
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
          
          startGameTimer() {
            this.gameStartTime = this.time.now;
            this.totalPausedTime = 0;
            this.pauseStartTime = 0;
            this.isGameActive = true;
          }
          
          stopGameTimer() {
            this.isGameActive = false;
          }
          
          updateUI() {
            this.scoreText.setText(`SCORE: ${this.score.toLocaleString()}`);
            this.comboText.setText(`COMBO: ${this.combo}`);
            this.levelText.setText(`LEVEL: ${this.level}`);
            
            // Calculate elapsed game time only if game is active
            let gameTimeSeconds = 0;
            if (gameActive && this.gameStartTime > 0) {
              let totalElapsedTime;
              if (isPaused && this.pauseStartTime > 0) {
                // Currently paused - use time up to pause start
                totalElapsedTime = this.pauseStartTime - this.gameStartTime - this.totalPausedTime;
              } else {
                // Not paused - use current time minus all accumulated paused time
                totalElapsedTime = this.time.now - this.gameStartTime - this.totalPausedTime;
              }
              gameTimeSeconds = Math.max(0, Math.floor(totalElapsedTime / 1000));
            }
            
            const minutes = Math.floor(gameTimeSeconds / 60);
            const seconds = gameTimeSeconds % 60;
            this.timeText.setText(`TIME: ${minutes}:${seconds.toString().padStart(2, '0')}`);
          }
          
          update(time: number, delta: number) {
            // Handle pause state changes
            if (isPaused && this.pauseStartTime === 0) {
              // Game just got paused
              this.pauseStartTime = this.time.now;
            } else if (!isPaused && this.pauseStartTime > 0) {
              // Game just got unpaused
              this.totalPausedTime += this.time.now - this.pauseStartTime;
              this.pauseStartTime = 0;
            }
            
            // Always update UI (even when paused) to show timer
            this.updateUI();
            
            // Don't update game logic if paused
            if (isPaused) {
              return;
            }
            
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
              const log = this.logs[i] as LogObject;
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
                
                // Structured logging for missed log
                Sentry.logger.info('Log fell off screen', {
                  logType: log.logType,
                  lostCombo: previousCombo,
                  logPoints: log.points,
                  fallSpeed: log.fallSpeed
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
          
          resetGame() {
            // Reset all game state including timer
            this.score = 0;
            this.combo = 0;
            this.level = 1;
            this.gameTime = 0;
            this.logSpawnTimer = 0;
            this.logSpawnRate = 2000;
            
            // Reset timer variables (will start when gameActive becomes true)
            this.gameStartTime = this.time.now;
            this.totalPausedTime = 0;
            this.pauseStartTime = 0;
            
            // Clear all logs
            this.logs.forEach(log => {
              if ((log as LogObject).errorSymbol) {
                (log as LogObject).errorSymbol!.destroy();
              }
              log.destroy();
            });
            this.logs = [];
            
            // Clear particles and cracks
            this.particles.forEach(p => p.destroy());
            this.cracks.forEach(c => c.destroy());
            this.particles = [];
            this.cracks = [];
            
            // Update React state
            setCurrentScore(0);
            setCurrentCombo(0);
            
            // Update UI to show reset values
            this.updateUI();
          }
          
          destroy() {
            // Clean up audio context
            if (this.audioContext && this.audioContext.state !== 'closed') {
              this.audioContext.close().catch(console.error);
            }
            
            // Clean up remaining particles and cracks
            this.particles.forEach(p => p.destroy());
            this.cracks.forEach(c => c.destroy());
            this.particles = [];
            this.cracks = [];
            
            // Call parent shutdown method instead of destroy
            if (this.scene) {
              this.scene.stop();
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
  }, [isPlaying, phaserLoaded, showInstructions, cleanupGame, isInitializing, isPaused, isMuted, volume]);
  
  const handleStartGame = async () => {
    console.log('Starting game...');
    
    setGameError(null);
    setShowInstructions(false);
    setGameActive(true);
    
    // Reset game scene if it exists
    if (gameRef.current && gameRef.current.scene && gameRef.current.scene.scenes[0]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gameScene = gameRef.current.scene.scenes[0] as any;
      if (gameScene.resetGame) {
        gameScene.resetGame();
      }
    }
    
    // Initialize game stats
    setGameStats({
      chopsCount: 0,
      gameStartTime: Date.now(),
      maxCombo: 0,
      fastestReaction: Number.MAX_SAFE_INTEGER
    });
    
    setCurrentScore(0);
    setCurrentCombo(0);
    setIsPlaying(true);
    
    await startGame();
    console.log('Game start initiated');
  };
  
  const handleEndGame = async () => {
    console.log('Ending game with score:', currentScore);
    
    // Stop the timer
    if (gameRef.current && gameRef.current.scene && gameRef.current.scene.scenes[0]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gameScene = gameRef.current.scene.scenes[0] as any;
      if (gameScene.stopGameTimer) {
        gameScene.stopGameTimer();
      }
    }
    
    // Calculate final stats
    const playTime = gameStats.gameStartTime > 0 ? Date.now() - gameStats.gameStartTime : 0;
    const finalMaxCombo = Math.max(gameStats.maxCombo, currentCombo);
    
    // Save game results to Convex
    try {
      await endGame({
        score: currentScore,
        maxCombo: finalMaxCombo,
        level: Math.floor((Date.now() / 1000) / 30) + 1, // Approximate level
        chops: gameStats.chopsCount,
        playTime: Math.floor(playTime / 1000), // Convert to seconds
        fastestChop: gameStats.fastestReaction < Number.MAX_SAFE_INTEGER ? gameStats.fastestReaction : undefined
      });
      
      // Final achievement check
      await checkAndUnlockAchievements({
        score: currentScore,
        combo: finalMaxCombo,
        chops: gameStats.chopsCount,
        reactionTime: gameStats.fastestReaction < Number.MAX_SAFE_INTEGER ? gameStats.fastestReaction : undefined
      });
      
      if (onGameOver) {
        onGameOver(currentScore);
      }
    } catch (error) {
      console.error('Failed to save game:', error);
    }
    
    setGameActive(false);
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
      >
        {/* Pause Overlay */}
        {isPaused && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="text-6xl text-yellow-400 mb-4 animate-pulse">⏸️</div>
              <div className="text-3xl text-yellow-400 pixel-font mb-4">PAUSED</div>
              <div className="text-green-400 pixel-font text-sm">
                Press SPACEBAR or click RESUME to continue
              </div>
            </div>
          </div>
        )}
      </div>
      
      {isPlaying && (
        <div className="mt-4 text-center">
          {isInitializing && (
            <div className="text-green-400 mb-2 animate-pulse">
              🔄 Initializing game...
            </div>
          )}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`px-6 py-2 rounded-lg font-bold border-2 ${
                isPaused 
                  ? 'bg-green-600 hover:bg-green-700 text-white border-green-800' 
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-800'
              }`}
              aria-label={isPaused ? "Resume game" : "Pause game"}
            >
              {isPaused ? '▶️ RESUME' : '⏸️ PAUSE'}
            </button>
            <button
              onClick={handleEndGame}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold border-2 border-red-800"
            >
              🛑 END GAME
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
