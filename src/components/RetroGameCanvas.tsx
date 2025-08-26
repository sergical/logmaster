'use client';

import { useEffect, useRef, useState } from 'react';
import { useConvexGame } from '@/lib/use-convex-game';

interface RetroGameCanvasProps {
  playerId: string;
  onGameOver?: (score: number) => void;
}

// Dynamic import for Phaser to avoid SSR issues
const loadPhaser = async () => {
  if (typeof window === 'undefined') return null;
  const phaser = await import('phaser');
  return phaser;
};

export default function RetroGameCanvas({ playerId }: RetroGameCanvasProps) {
  const gameRef = useRef<unknown>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [gameInitialized, setGameInitialized] = useState(false);
  const [phaserLoaded, setPhaserLoaded] = useState(false);
  
  const { startGame } = useConvexGame(playerId);
  
  // Load Phaser dynamically
  useEffect(() => {
    loadPhaser().then((phaser) => {
      if (phaser) {
        setPhaserLoaded(true);
      }
    });
  }, []);
  
  useEffect(() => {
    console.log('Game init effect:', { 
      hasContainer: !!containerRef.current, 
      isPlaying, 
      gameInitialized, 
      phaserLoaded 
    });
    
    if (!containerRef.current || !isPlaying || gameInitialized || !phaserLoaded) return;
    
    const initGame = async () => {
      const Phaser = await loadPhaser();
      if (!Phaser) return;
      
      console.log('Initializing Phaser game...');
      
      // Create a minimal working scene
      const GameScene = class extends Phaser.Scene {
        constructor() {
          super({ key: 'GameScene' });
        }
        
        create() {
          console.log('GameScene create() called!');
          
          // Set background color
          this.cameras.main.setBackgroundColor('#2d5016');
          
          // Add a simple text
          const text = this.add.text(400, 300, 'LOGMASTER GAME', {
            fontSize: '32px',
            color: '#ffffff',
            fontFamily: 'Arial'
          }).setOrigin(0.5);
          console.log('Text created:', text);
          
          // Add a colored rectangle
          const graphics = this.add.graphics();
          graphics.fillStyle(0x8B4513);
          graphics.fillRect(200, 200, 100, 100);
          console.log('Graphics created:', graphics);
          
          // Add a sprite (colored rectangle)
          const sprite = this.add.rectangle(600, 400, 64, 64, 0xFF0000);
          sprite.setInteractive();
          console.log('Sprite created:', sprite);
          
          // Add click handler
          sprite.on('pointerdown', () => {
            console.log('Sprite clicked!');
            sprite.setFillStyle(0x00FF00);
          });
          
          // Log camera info
          console.log('Camera position:', this.cameras.main.x, this.cameras.main.y);
          console.log('Camera zoom:', this.cameras.main.zoom);
          console.log('Camera visible:', this.cameras.main.visible);
          
          console.log('GameScene create() completed!');
        }
        
                  update() {
            // This runs every frame
            if (this.time.now % 1000 < 16) { // Log every ~1 second
              console.log('Game update running, time:', this.time.now);
            }
          }
      };
      
      const config = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: 800,
        height: 600,
        backgroundColor: '#2d5016',
        scene: GameScene,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      };
      
      console.log('Creating Phaser game...');
      gameRef.current = new Phaser.Game(config);
      
      setGameInitialized(true);
      console.log('Phaser game created successfully');
    };
    
    initGame();
    
    return () => {
      if (gameRef.current && typeof (gameRef.current as { destroy: (keepCanvas?: boolean) => void }).destroy === 'function') {
        (gameRef.current as { destroy: (keepCanvas?: boolean) => void }).destroy(true);
        gameRef.current = null;
      }
    };
  }, [isPlaying, playerId, phaserLoaded, gameInitialized]);
  
  const handleStartGame = async () => {
    console.log('Starting game...');
    setShowInstructions(false);
    setIsPlaying(true);
    setGameInitialized(false);
    await startGame();
    console.log('Game start initiated');
  };
  
  const handleEndGame = async () => {
    console.log('Ending game...');
    setIsPlaying(false);
    setShowInstructions(true);
    setGameInitialized(false);
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
          
          <button
            onClick={handleStartGame}
            className="bg-gradient-to-b from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 text-white px-8 py-4 rounded-lg text-2xl font-bold border-4 border-green-900 shadow-lg transform hover:scale-105 transition-transform"
          >
            🎮 START GAME 🎮
          </button>
          
          <div className="mt-4 text-green-400 text-sm animate-pulse">
            Press START to begin your lumberjack adventure!
          </div>
        </div>
      )}
      
      <div 
        ref={containerRef} 
        className={`${showInstructions ? 'hidden' : 'block'} w-full h-[600px]`}
        style={{ 
          imageRendering: 'pixelated',
          border: '2px solid red',
          backgroundColor: '#000000'
        }}
      />
      
      {isPlaying && (
        <div className="mt-4 text-center">
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
