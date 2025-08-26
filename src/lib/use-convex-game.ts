"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState, useCallback, useMemo } from "react";

export function useConvexGame(userId: string) {
  const [playerId, setPlayerId] = useState<Id<"players"> | null>(null);
  const [sessionId, setSessionId] = useState<Id<"gameSessions"> | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Mutations
  const createOrUpdatePlayer = useMutation(api.players.createOrUpdatePlayer);
  const updatePlayerStats = useMutation(api.players.updatePlayerStats);
  const unlockAchievement = useMutation(api.players.unlockAchievement);
  const startGameSession = useMutation(api.gameSessions.startGameSession);
  const updateGameSession = useMutation(api.gameSessions.updateGameSession);
  const endGameSession = useMutation(api.gameSessions.endGameSession);
  const initializeAchievements = useMutation(api.achievements.initializeAchievements);
  
  // Queries - only run when we have a stable userId
  const player = useQuery(
    api.players.getPlayer, 
    userId && isInitialized ? { userId } : "skip"
  );
  
  const activeSession = useQuery(
    api.gameSessions.getActiveSession,
    playerId ? { playerId } : "skip"
  );
  
  const leaderboard = useQuery(
    api.leaderboard.getTopScores, 
    { limit: 10 }
  );
  
  const allAchievements = useQuery(api.achievements.getAllAchievements);
  
  // Initialize player only once
  useEffect(() => {
    if (!userId || isInitialized) return;
    
    async function init() {
      try {
        const id = await createOrUpdatePlayer({ 
          userId, 
          name: `Player_${userId.slice(0, 4)}` 
        });
        setPlayerId(id);
        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize player:", error);
      }
    }
    
    init();
  }, [userId, isInitialized, createOrUpdatePlayer]);
  
  // Set playerId when player data is available
  useEffect(() => {
    if (player && !playerId) {
      setPlayerId(player._id);
    }
  }, [player, playerId]);
  
  // Initialize achievements only once
  useEffect(() => {
    if (allAchievements?.length === 0 && !isInitialized) {
      initializeAchievements();
    }
  }, [allAchievements, isInitialized, initializeAchievements]);
  
  const startGame = useCallback(async (gameMode: string = "classic") => {
    if (!playerId) return;
    
    const id = await startGameSession({ playerId, gameMode });
    setSessionId(id);
    return id;
  }, [playerId, startGameSession]);
  
  const updateGame = useCallback(async (data: {
    score: number;
    level: number;
    combo: number;
    maxCombo: number;
  }) => {
    if (!sessionId) return;
    
    await updateGameSession({
      sessionId,
      ...data,
    });
  }, [sessionId, updateGameSession]);
  
  const endGame = useCallback(async (stats: {
    score: number;
    chops: number;
    combo: number;
    playTime: number;
    fastestChop?: number;
  }) => {
    if (!sessionId || !playerId) return;
    
    await endGameSession({ sessionId });
    await updatePlayerStats({
      playerId,
      ...stats,
    });
    
    setSessionId(null);
  }, [sessionId, playerId, endGameSession, updatePlayerStats]);
  
  const checkAndUnlockAchievements = useCallback(async (
    stats: {
      score: number;
      combo: number;
      chops: number;
      reactionTime?: number;
    }
  ) => {
    if (!playerId || !allAchievements) return;
    
    const unlockedAchievements: string[] = [];
    
    for (const achievement of allAchievements) {
      if (player?.achievements.includes(achievement.id)) continue;
      
      let shouldUnlock = false;
      
      switch (achievement.requirement.type) {
        case "score":
          shouldUnlock = stats.score >= achievement.requirement.value;
          break;
        case "combo":
          shouldUnlock = stats.combo >= achievement.requirement.value;
          break;
        case "chops_single_game":
          shouldUnlock = stats.chops >= achievement.requirement.value;
          break;
        case "reaction_time":
          shouldUnlock = stats.reactionTime !== undefined && 
                        stats.reactionTime <= achievement.requirement.value;
          break;
      }
      
      if (shouldUnlock) {
        await unlockAchievement({ playerId, achievementId: achievement.id });
        unlockedAchievements.push(achievement.id);
      }
    }
    
    return unlockedAchievements;
  }, [playerId, allAchievements, player, unlockAchievement]);
  
  return useMemo(() => ({
    player,
    playerId,
    sessionId,
    activeSession,
    leaderboard,
    allAchievements,
    startGame,
    updateGame,
    endGame,
    checkAndUnlockAchievements,
    createOrUpdatePlayer,
  }), [
    player,
    playerId,
    sessionId,
    activeSession,
    leaderboard,
    allAchievements,
    startGame,
    updateGame,
    endGame,
    checkAndUnlockAchievements,
    createOrUpdatePlayer,
  ]);
}