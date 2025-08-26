import * as Sentry from "@sentry/nextjs";

export interface GameState {
  playerId: string;
  playerName: string;
  score: number;
  level: number;
  totalChops: number;
  bestCombo: number;
  currentCombo: number;
  logs: LogItem[];
  powerUps: PowerUp[];
  achievements: Achievement[];
  stats: GameStats;
  lastUpdated: number;
}

export interface LogItem {
  id: string;
  type: 'regular' | 'hardwood' | 'golden' | 'mystic';
  size: 'small' | 'medium' | 'large' | 'giant';
  health: number;
  maxHealth: number;
  points: number;
  x: number;
  y: number;
  chopped: boolean;
}

export interface PowerUp {
  id: string;
  type: 'double_axe' | 'time_freeze' | 'auto_chopper' | 'combo_multiplier';
  duration: number;
  active: boolean;
  activatedAt?: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  unlockedAt?: number;
}

export interface GameStats {
  totalPlayTime: number;
  sessionsPlayed: number;
  averageChopsPerMinute: number;
  longestCombo: number;
  fastestChop: number;
  logsChopped: { [key: string]: number };
}

class GameManager {
  private gameState: GameState | null = null;
  private storageKey = 'logmaster-game-state';
  private initialized = false;

  async initialize(playerId: string): Promise<void> {
    if (this.initialized) return;

    try {
      Sentry.logger.info("Initializing game manager", { 
        playerId,
        timestamp: Date.now(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server'
      });

      // For now, use localStorage (will integrate with Convex later)
      const savedState = typeof localStorage !== 'undefined' 
        ? localStorage.getItem(`${this.storageKey}-${playerId}`)
        : null;
      
      if (savedState) {
        this.gameState = JSON.parse(savedState);
        Sentry.logger.info("Loaded existing game state", { 
          playerId, 
          score: this.gameState?.score,
          totalChops: this.gameState?.totalChops,
          achievements: this.gameState?.achievements?.filter(a => a.unlocked).length
        });
      } else {
        this.gameState = this.createInitialGameState(playerId);
        this.saveState();
        Sentry.logger.info("Created new game state", { 
          playerId,
          initialAchievements: this.gameState.achievements.length
        });
      }

      this.initialized = true;

      Sentry.logger.debug("Game manager initialized successfully", {
        playerId,
        gameStateSize: JSON.stringify(this.gameState).length,
        memoryUsage: (performance as any)?.memory?.usedJSHeapSize || 'unknown'
      });

    } catch (error) {
      Sentry.logger.error("Failed to initialize game manager", { 
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        playerId 
      });
      
      // Fallback to new game state
      this.gameState = this.createInitialGameState(playerId);
      this.initialized = true;
    }
  }

  private createInitialGameState(playerId: string): GameState {
    return {
      playerId,
      playerName: `Lumberjack_${Math.random().toString(36).substr(2, 4)}`,
      score: 0,
      level: 1,
      totalChops: 0,
      bestCombo: 0,
      currentCombo: 0,
      logs: [],
      powerUps: [],
      achievements: this.createInitialAchievements(),
      stats: {
        totalPlayTime: 0,
        sessionsPlayed: 1,
        averageChopsPerMinute: 0,
        longestCombo: 0,
        fastestChop: 0,
        logsChopped: {}
      },
      lastUpdated: Date.now()
    };
  }

  private createInitialAchievements(): Achievement[] {
    const achievements = [
      {
        id: 'first_chop',
        name: 'First Swing',
        description: 'Chop your first log',
        icon: '🪓',
        progress: 0,
        maxProgress: 1,
        unlocked: false
      },
      {
        id: 'combo_master',
        name: 'Combo Master',
        description: 'Achieve a 10x combo',
        icon: '🔥',
        progress: 0,
        maxProgress: 10,
        unlocked: false
      },
      {
        id: 'century_club',
        name: 'Century Club',
        description: 'Chop 100 logs',
        icon: '💯',
        progress: 0,
        maxProgress: 100,
        unlocked: false
      },
      {
        id: 'golden_touch',
        name: 'Golden Touch',
        description: 'Find and chop a golden log',
        icon: '🏆',
        progress: 0,
        maxProgress: 1,
        unlocked: false
      },
      {
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Chop 50 logs in under 2 minutes',
        icon: '⚡',
        progress: 0,
        maxProgress: 50,
        unlocked: false
      }
    ];

    Sentry.logger.debug("Initial achievements created", {
      achievementsCount: achievements.length,
      achievementTypes: achievements.map(a => a.id)
    });

    return achievements;
  }

  private saveState(): void {
    if (!this.gameState || typeof localStorage === 'undefined') return;
    
    try {
      this.gameState.lastUpdated = Date.now();
      localStorage.setItem(`${this.storageKey}-${this.gameState.playerId}`, JSON.stringify(this.gameState));
      
      Sentry.logger.trace("Game state saved", { 
        playerId: this.gameState.playerId,
        score: this.gameState.score,
        dataSize: JSON.stringify(this.gameState).length
      });
    } catch (error) {
      Sentry.logger.error("Failed to save game state", { 
        error: error instanceof Error ? error.message : String(error),
        playerId: this.gameState?.playerId,
        storageAvailable: typeof localStorage !== 'undefined'
      });
    }
  }

  getGameState(): GameState | null {
    return this.gameState;
  }

  updateGameState(updater: (state: GameState) => void): void {
    if (!this.gameState) return;

    const oldScore = this.gameState.score;
    const oldLevel = this.gameState.level;

    updater(this.gameState);
    this.saveState();

    // Log significant changes
    if (this.gameState.score !== oldScore || this.gameState.level !== oldLevel) {
      Sentry.logger.info("Significant game state change", { 
        playerId: this.gameState.playerId,
        scoreChange: this.gameState.score - oldScore,
        newScore: this.gameState.score,
        levelChange: this.gameState.level - oldLevel,
        newLevel: this.gameState.level
      });
    }

    Sentry.logger.trace("Game state updated", { 
      playerId: this.gameState.playerId,
      score: this.gameState.score,
      level: this.gameState.level,
      totalChops: this.gameState.totalChops,
      currentCombo: this.gameState.currentCombo
    });
  }

  chopLog(logId: string, reactionTime?: number): { success: boolean; points: number; comboMultiplier: number } {
    let result = { success: false, points: 0, comboMultiplier: 1 };

    if (!this.gameState) return result;

    const log = this.gameState.logs.find(l => l.id === logId && !l.chopped);
    if (!log) {
      Sentry.logger.warn("Attempted to chop non-existent or already chopped log", {
        playerId: this.gameState.playerId,
        logId,
        availableLogs: this.gameState.logs.filter(l => !l.chopped).length
      });
      return result;
    }

    const chopStartTime = Date.now();
    log.health -= 1;
    
    if (log.health <= 0) {
      log.chopped = true;
      this.gameState.currentCombo += 1;
      this.gameState.totalChops += 1;
      
      result.comboMultiplier = Math.min(Math.floor(this.gameState.currentCombo / 5) + 1, 5);
      result.points = log.points * result.comboMultiplier;
      result.success = true;
      
      this.gameState.score += result.points;
      
      if (this.gameState.currentCombo > this.gameState.bestCombo) {
        this.gameState.bestCombo = this.gameState.currentCombo;
        
        Sentry.logger.info("New personal best combo achieved!", {
          playerId: this.gameState.playerId,
          newBestCombo: this.gameState.bestCombo,
          previousBest: this.gameState.bestCombo - 1
        });
      }
      
      // Update achievements
      this.updateAchievementProgress('first_chop', 1);
      this.updateAchievementProgress('century_club', 1);
      this.updateAchievementProgress('combo_master', this.gameState.currentCombo);
      
      if (log.type === 'golden') {
        this.updateAchievementProgress('golden_touch', 1);
        Sentry.logger.info("Golden log chopped!", {
          playerId: this.gameState.playerId,
          bonusPoints: result.points,
          totalGoldenLogs: this.gameState.stats.logsChopped.golden || 0 + 1
        });
      }
      
      // Update stats
      this.gameState.stats.logsChopped[log.type] = (this.gameState.stats.logsChopped[log.type] || 0) + 1;
      
      if (reactionTime && (this.gameState.stats.fastestChop === 0 || reactionTime < this.gameState.stats.fastestChop)) {
        this.gameState.stats.fastestChop = reactionTime;
        Sentry.logger.info("New fastest chop record!", {
          playerId: this.gameState.playerId,
          newFastestChop: reactionTime,
          logType: log.type
        });
      }
      
      this.saveState();
      
      Sentry.logger.info("Log chopped successfully", {
        playerId: this.gameState.playerId,
        logId,
        logType: log.type,
        logSize: log.size,
        pointsEarned: result.points,
        comboMultiplier: result.comboMultiplier,
        currentCombo: this.gameState.currentCombo,
        totalScore: this.gameState.score,
        reactionTimeMs: reactionTime,
        chopDurationMs: Date.now() - chopStartTime
      });
    } else {
      Sentry.logger.debug("Log damaged but not chopped", {
        playerId: this.gameState.playerId,
        logId,
        remainingHealth: log.health,
        maxHealth: log.maxHealth
      });
    }

    return result;
  }

  private updateAchievementProgress(achievementId: string, progress: number): void {
    if (!this.gameState) return;
    
    const achievement = this.gameState.achievements.find(a => a.id === achievementId);
    if (!achievement || achievement.unlocked) return;

    const oldProgress = achievement.progress;
    achievement.progress = Math.min(progress, achievement.maxProgress);
    
    if (achievement.progress >= achievement.maxProgress && !achievement.unlocked) {
      achievement.unlocked = true;
      achievement.unlockedAt = Date.now();
      
      Sentry.logger.info("🎉 Achievement unlocked!", {
        playerId: this.gameState.playerId,
        achievementId,
        achievementName: achievement.name,
        achievementDescription: achievement.description,
        progressJump: achievement.progress - oldProgress,
        totalUnlockedAchievements: this.gameState.achievements.filter(a => a.unlocked).length,
        celebrationTriggered: true
      });
    } else if (achievement.progress > oldProgress) {
      Sentry.logger.debug("Achievement progress updated", {
        playerId: this.gameState.playerId,
        achievementId,
        previousProgress: oldProgress,
        newProgress: achievement.progress,
        maxProgress: achievement.maxProgress,
        completionPercentage: Math.round((achievement.progress / achievement.maxProgress) * 100)
      });
    }
  }

  spawnLog(): void {
    if (!this.gameState) return;
    
    const logTypes: LogItem['type'][] = ['regular', 'regular', 'regular', 'hardwood', 'golden'];
    const logSizes: LogItem['size'][] = ['small', 'medium', 'large'];
    
    const type = logTypes[Math.floor(Math.random() * logTypes.length)];
    const size = logSizes[Math.floor(Math.random() * logSizes.length)];
    
    let health = 1;
    let points = 10;
    
    // Size modifiers
    switch (size) {
      case 'medium': health = 2; points = 20; break;
      case 'large': health = 3; points = 40; break;
      case 'giant': health = 5; points = 80; break;
    }
    
    // Type modifiers
    switch (type) {
      case 'hardwood': points *= 2; health += 1; break;
      case 'golden': points *= 5; break;
      case 'mystic': points *= 10; health *= 2; break;
    }
    
    const newLog: LogItem = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      size,
      health,
      maxHealth: health,
      points,
      x: Math.random() * 700 + 50, // Keep logs within visible area
      y: Math.random() * 500 + 50,
      chopped: false
    };
    
    this.gameState.logs.push(newLog);
    this.saveState();
    
    Sentry.logger.debug("New log spawned", {
      playerId: this.gameState.playerId,
      logId: newLog.id,
      type: newLog.type,
      size: newLog.size,
      points: newLog.points,
      health: newLog.health,
      position: { x: Math.round(newLog.x), y: Math.round(newLog.y) },
      totalActiveLogs: this.gameState.logs.filter(l => !l.chopped).length,
      rarity: type === 'golden' ? 'rare' : type === 'mystic' ? 'legendary' : 'common'
    });
  }

  resetCombo(): void {
    if (!this.gameState || this.gameState.currentCombo === 0) return;
    
    const previousCombo = this.gameState.currentCombo;
    this.gameState.currentCombo = 0;
    this.saveState();
    
    Sentry.logger.warn("Combo broken!", { 
      playerId: this.gameState.playerId,
      lostCombo: previousCombo,
      reason: 'missed_click',
      bestComboStillIntact: this.gameState.bestCombo
    });
  }

  activatePowerUp(powerUpType: PowerUp['type']): void {
    if (!this.gameState) return;
    
    const existingPowerUp = this.gameState.powerUps.find(p => p.type === powerUpType);
    
    if (existingPowerUp) {
      existingPowerUp.active = true;
      existingPowerUp.activatedAt = Date.now();
    } else {
      const newPowerUp: PowerUp = {
        id: `powerup_${Date.now()}`,
        type: powerUpType,
        duration: this.getPowerUpDuration(powerUpType),
        active: true,
        activatedAt: Date.now()
      };
      this.gameState.powerUps.push(newPowerUp);
    }
    
    this.saveState();
    
    Sentry.logger.info("Power-up activated", {
      playerId: this.gameState.playerId,
      powerUpType,
      duration: this.getPowerUpDuration(powerUpType),
      activePowerUpsCount: this.gameState.powerUps.filter(p => p.active).length,
      stackingAllowed: false
    });
  }

  private getPowerUpDuration(type: PowerUp['type']): number {
    const durations = {
      double_axe: 15000,      // 15 seconds
      time_freeze: 10000,     // 10 seconds  
      auto_chopper: 20000,    // 20 seconds
      combo_multiplier: 30000 // 30 seconds
    };
    return durations[type];
  }

  // Cleanup old/completed logs for performance
  cleanupLogs(): void {
    if (!this.gameState) return;

    const beforeCount = this.gameState.logs.length;
    this.gameState.logs = this.gameState.logs.filter(log => 
      !log.chopped || (Date.now() - (log as any).choppedAt) < 5000
    );
    const afterCount = this.gameState.logs.length;

    if (beforeCount !== afterCount) {
      this.saveState();
      Sentry.logger.debug("Cleaned up old logs", {
        playerId: this.gameState.playerId,
        logsRemoved: beforeCount - afterCount,
        remainingLogs: afterCount,
        memoryOptimization: true
      });
    }
  }
}

export const gameManager = new GameManager();