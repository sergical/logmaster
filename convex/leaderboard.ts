import { v } from "convex/values";
import { query } from "./_generated/server";

export const getTopScores = query({
  args: {
    gameMode: v.optional(v.string()),
    timeFrame: v.optional(v.string()), // "all", "weekly", "monthly"
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    let scores;
    if (args.gameMode) {
      scores = await ctx.db
        .query("leaderboard")
        .withIndex("by_game_mode", (q) => 
          q.eq("gameMode", args.gameMode!)
        )
        .filter((q) => q.gt(q.field("score"), 0))
        .order("desc")
        .take(limit);
    } else if (args.timeFrame === "weekly") {
      const currentWeek = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
      scores = await ctx.db
        .query("leaderboard")
        .withIndex("by_week", (q) => 
          q.eq("week", currentWeek)
        )
        .filter((q) => q.gt(q.field("score"), 0))
        .order("desc")
        .take(limit);
    } else if (args.timeFrame === "monthly") {
      const now = new Date();
      const currentMonth = now.getFullYear() * 12 + now.getMonth();
      scores = await ctx.db
        .query("leaderboard")
        .withIndex("by_month", (q) => 
          q.eq("month", currentMonth)
        )
        .filter((q) => q.gt(q.field("score"), 0))
        .order("desc")
        .take(limit);
    } else {
      scores = await ctx.db
        .query("leaderboard")
        .withIndex("by_score")
        .filter((q) => q.gt(q.field("score"), 0))
        .order("desc")
        .take(limit);
    }

    // Group by player to get only their best score
    const playerBestScores = new Map();
    for (const score of scores) {
      const existing = playerBestScores.get(score.playerId);
      if (!existing || score.score > existing.score) {
        playerBestScores.set(score.playerId, score);
      }
    }

    return Array.from(playerBestScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },
});

export const getPlayerRank = query({
  args: {
    playerId: v.id("players"),
    gameMode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) return null;

    let higherScores;
    if (args.gameMode) {
      higherScores = await ctx.db
        .query("leaderboard")
        .withIndex("by_game_mode", (q) => 
          q.eq("gameMode", args.gameMode!)
        )
        .filter((q) => q.gt(q.field("score"), player.highScore))
        .collect();
    } else {
      higherScores = await ctx.db
        .query("leaderboard")
        .withIndex("by_score")
        .filter((q) => q.gt(q.field("score"), player.highScore))
        .collect();
    }

    // Count unique players with higher scores
    const uniquePlayers = new Set(higherScores.map(s => s.playerId));
    
    return {
      rank: uniquePlayers.size + 1,
      highScore: player.highScore,
      playerName: player.name,
    };
  },
});
