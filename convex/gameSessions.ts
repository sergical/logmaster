import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const startGameSession = mutation({
  args: {
    playerId: v.id("players"),
    gameMode: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("gameSessions", {
      playerId: args.playerId,
      score: 0,
      level: 1,
      combo: 0,
      maxCombo: 0,
      powerUps: [],
      startedAt: Date.now(),
      gameMode: args.gameMode,
    });
  },
});

export const updateGameSession = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    score: v.number(),
    level: v.number(),
    combo: v.number(),
    maxCombo: v.number(),
    powerUps: v.optional(v.array(v.object({
      type: v.string(),
      activatedAt: v.number(),
      duration: v.number(),
    }))),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      score: args.score,
      level: args.level,
      combo: args.combo,
      maxCombo: Math.max(args.maxCombo, args.combo),
    };

    if (args.powerUps !== undefined) {
      updates.powerUps = args.powerUps;
    }

    await ctx.db.patch(args.sessionId, updates);
  },
});

export const endGameSession = mutation({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    await ctx.db.patch(args.sessionId, {
      endedAt: Date.now(),
    });

    // Get player info for leaderboard
    const player = await ctx.db.get(session.playerId);
    if (!player) throw new Error("Player not found");

    // Add to leaderboard if score is high enough
    const now = new Date();
    const week = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
    const month = now.getFullYear() * 12 + now.getMonth();

    await ctx.db.insert("leaderboard", {
      playerId: session.playerId,
      playerName: player.name,
      score: session.score,
      combo: session.maxCombo,
      gameMode: session.gameMode,
      achievedAt: Date.now(),
      week,
      month,
    });

    return session;
  },
});

export const getActiveSession = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gameSessions")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .filter((q) => q.eq(q.field("endedAt"), undefined))
      .first();
  },
});
