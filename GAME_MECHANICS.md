# LogMaster Game Mechanics Documentation

## Core Game Loop

### Objective
Players control an axe to chop falling logs for points, building combos and advancing through levels.

## Game Elements

### 1. Log Types & Scoring
- **Normal Logs (Brown)**: 50 points, requires 2 hits to destroy
- **Hardwood Logs (Dark Brown)**: 100 points, requires 3 hits to destroy  
- **Golden Logs (Gold)**: 500 points, requires 1 hit to destroy (rare bonus)

### 2. Controls
- **Mouse Movement**: Aims the axe cursor
- **Mouse Click**: Swings axe to chop logs
- **Target**: Click directly on logs to hit them

### 3. Combo System
- Consecutive hits without missing build combo multiplier
- Miss a log or let it fall off screen = combo resets to 0
- Combo multiplier increases score per hit
- Visual combo counter shows current streak

### 4. Level Progression
- Every 30 seconds = new level
- Higher levels = faster log spawn rate
- Higher levels = more hardwood/special logs
- Level displayed on screen

### 5. Game Physics
- Logs fall from top of screen at varying speeds
- Logs have different sizes based on type
- Gravity pulls logs downward
- Logs disappear when hitting bottom (counts as miss)

## Game States

### 1. Playing State
- Logs spawn continuously
- Score increases with successful hits
- Combo builds with consecutive hits
- Level advances every 30 seconds

### 2. Game Over Conditions
- Player clicks "END GAME" button
- Could add lives system later (3 misses = game over)

### 3. Scoring Display
- Current Score (real-time)
- Combo Counter
- Current Level
- High Score (persistent)

## Visual Style
- Retro 8-bit pixel art aesthetic
- CRT monitor effects
- Green terminal color scheme
- Pixelated sprites for logs and axe
- Chiptune sound effects (Web Audio API)

## Data Persistence (Convex Integration)
- Player profiles with stats
- High scores and leaderboards
- Game session tracking
- Achievement system
- Real-time multiplayer scores

## Technical Implementation Notes
- Phaser.js handles game physics and rendering
- 60 FPS game loop
- Collision detection between axe clicks and log sprites
- Procedural sprite generation for retro aesthetic
- Real-time database updates for scores