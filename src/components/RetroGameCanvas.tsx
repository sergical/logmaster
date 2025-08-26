'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useConvexGame } from '@/lib/use-convex-game';

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

export default function RetroGameCanvas({ playerId }: RetroGameCanvasProps) {
  const gameRef = useRef<PhaserGame | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [phaserLoaded, setPhaserLoaded] = useState(false);
  const [gameError, setGameError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const { startGame } = useConvexGame(playerId);
  
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
        
        // Create a minimal working scene
        const GameScene = class extends Phaser.Scene {
          constructor() {
            super({ key: 'GameScene' });
          }
          
          create() {
            console.log('GameScene create() called!');
            
            // Set background color
            this.cameras.main.setBackgroundColor('#2d5016');
            
            // Get the center of the game world
            const centerX = this.cameras.main.width / 2;
            const centerY = this.cameras.main.height / 2;
            
            // Add a simple text at center
            const text = this.add.text(centerX, centerY - 50, 'LOGMASTER GAME', {
              fontSize: '32px',
              color: '#ffffff',
              fontFamily: 'Arial'
            }).setOrigin(0.5);
            
            // Add a colored rectangle using graphics
            const graphics = this.add.graphics();
            graphics.fillStyle(0x8B4513);
            graphics.fillRect(centerX - 50, centerY + 50, 100, 100);
            
            // Add another colored rectangle using graphics
            const redGraphics = this.add.graphics();
            redGraphics.fillStyle(0xFF0000);
            redGraphics.fillRect(centerX + 50, centerY + 50, 64, 64);
            
            // Make the entire scene interactive
            this.input.on('pointerdown', (pointer: any) => {
              console.log('Scene clicked at:', pointer.x, pointer.y);
              
              // Change red rectangle to green when clicked
              redGraphics.clear();
              redGraphics.fillStyle(0x00FF00);
              redGraphics.fillRect(centerX + 50, centerY + 50, 64, 64);
              
              // Reset after 1 second
              this.time.delayedCall(1000, () => {
                redGraphics.clear();
                redGraphics.fillStyle(0xFF0000);
                redGraphics.fillRect(centerX + 50, centerY + 50, 64, 64);
              });
            });
            
            // Add a simple animation to make it more visible
            this.tweens.add({
              targets: text,
              y: centerY - 30,
              duration: 2000,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });
            
            console.log('GameScene create() completed!');
          }
          
          update() {
            // This runs every frame - keeping minimal logging
            if (this.time.now % 5000 < 16) { // Log every ~5 seconds
              console.log('Game update running, time:', this.time.now);
            }
          }
        };
        
        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO,
          parent: container,
          width: containerWidth,
          height: containerHeight,
          backgroundColor: '#2d5016',
          scene: GameScene,
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
          },
          dom: {
            createContainer: true
          },
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
    console.log('Ending game...');
    cleanupGame();
    setIsPlaying(false);
    setShowInstructions(true);
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
                • Click to chop logs<br/>
                • Don&apos;t miss or lose combo!
              </div>
            </div>
            <div className="bg-green-800/50 p-4 rounded border-2 border-green-600">
              <div className="text-yellow-400 font-bold mb-2">🌲 Log Types</div>
              <div className="text-green-200 text-sm">
                • Brown: Normal (50 pts)<br/>
                • Dark: Hardwood (100 pts)<br/>
                • Gold: Special (500 pts)
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
