import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  players: defineTable({
    userId: v.string(),
    name: v.string(),
    highScore: v.number(),
    totalScore: v.number(),
    totalChops: v.number(),
    achievements: v.array(v.string()),
    stats: v.object({
      gamesPlayed: v.number(),
      totalPlayTime: v.number(),
      fastestChop: v.number(),
      longestCombo: v.number(),
      favoriteAxe: v.string(),
    }),
    createdAt: v.number(),
    lastPlayed: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_high_score", ["highScore"]),

  gameSessions: defineTable({
    playerId: v.id("players"),
    score: v.number(),
    level: v.number(),
    combo: v.number(),
    maxCombo: v.number(),
    powerUps: v.array(v.object({
      type: v.string(),
      activatedAt: v.number(),
      duration: v.number(),
    })),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    gameMode: v.string(), // "classic", "timeAttack", "survival"
  })
    .index("by_player", ["playerId"])
    .index("by_score", ["score"]),

  leaderboard: defineTable({
    playerId: v.id("players"),
    playerName: v.string(),
    score: v.number(),
    combo: v.number(),
    gameMode: v.string(),
    achievedAt: v.number(),
    week: v.number(), // For weekly leaderboards
    month: v.number(), // For monthly leaderboards
  })
    .index("by_score", ["score"])
    .index("by_week", ["week", "score"])
    .index("by_month", ["month", "score"])
    .index("by_game_mode", ["gameMode", "score"]),

  achievements: defineTable({
    id: v.string(),
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    points: v.number(),
    rarity: v.string(), // "common", "rare", "epic", "legendary"
    requirement: v.object({
      type: v.string(),
      value: v.number(),
    }),
  }),

  dailyChallenges: defineTable({
    date: v.string(), // YYYY-MM-DD
    challenge: v.object({
      type: v.string(),
      target: v.number(),
      reward: v.number(),
      description: v.string(),
    }),
    active: v.boolean(),
  })
    .index("by_date", ["date"]),

  playerChallengeProgress: defineTable({
    playerId: v.id("players"),
    challengeId: v.id("dailyChallenges"),
    progress: v.number(),
    completed: v.boolean(),
    claimedAt: v.optional(v.number()),
  })
    .index("by_player", ["playerId"])
    .index("by_challenge", ["challengeId"]),
});
