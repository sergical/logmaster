import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createOrUpdatePlayer = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("players")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    // Check if name is taken by another user
    const nameConflict = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();
    
    if (nameConflict && nameConflict.userId !== args.userId) {
      throw new Error(`Name "${args.name}" is already taken`);
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        lastPlayed: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("players", {
      userId: args.userId,
      name: args.name,
      highScore: 0,
      totalScore: 0,
      totalChops: 0,
      achievements: [],
      stats: {
        gamesPlayed: 0,
        totalPlayTime: 0,
        fastestChop: 0,
        longestCombo: 0,
        favoriteAxe: "basic",
      },
      createdAt: Date.now(),
      lastPlayed: Date.now(),
    });
  },
});

export const getPlayer = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const updatePlayerStats = mutation({
  args: {
    playerId: v.id("players"),
    score: v.number(),
    chops: v.number(),
    combo: v.number(),
    playTime: v.number(),
    fastestChop: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Player not found");

    const updates: Record<string, unknown> = {
      totalScore: player.totalScore + args.score,
      totalChops: player.totalChops + args.chops,
      lastPlayed: Date.now(),
      stats: {
        ...player.stats,
        gamesPlayed: player.stats.gamesPlayed + 1,
        totalPlayTime: player.stats.totalPlayTime + args.playTime,
        longestCombo: Math.max(player.stats.longestCombo, args.combo),
        fastestChop: args.fastestChop && (player.stats.fastestChop === 0 || args.fastestChop < player.stats.fastestChop)
          ? args.fastestChop 
          : player.stats.fastestChop,
      },
    };

    if (args.score > player.highScore) {
      updates.highScore = args.score;
    }

    await ctx.db.patch(args.playerId, updates);
  },
});

export const checkNameAvailability = query({
  args: { name: v.string(), excludeUserId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const existingPlayer = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();
    
    // If no existing player or it's the same user, name is available
    return !existingPlayer || existingPlayer.userId === args.excludeUserId;
  },
});

export const unlockAchievement = mutation({
  args: {
    playerId: v.id("players"),
    achievementId: v.string(),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Player not found");

    if (!player.achievements.includes(args.achievementId)) {
      await ctx.db.patch(args.playerId, {
        achievements: [...player.achievements, args.achievementId],
      });
    }
  },
});
