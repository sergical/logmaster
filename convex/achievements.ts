
import { mutation, query } from "./_generated/server";

export const getAllAchievements = query({
  handler: async (ctx) => {
    return await ctx.db.query("achievements").collect();
  },
});

export const initializeAchievements = mutation({
  handler: async (ctx) => {
    const existingAchievements = await ctx.db.query("achievements").collect();
    if (existingAchievements.length > 0) return;

    const achievements = [
      {
        id: "first_chop",
        name: "First Swing",
        description: "Chop your first log",
        icon: "🪓",
        points: 10,
        rarity: "common",
        requirement: { type: "chops", value: 1 },
      },
      {
        id: "combo_apprentice",
        name: "Combo Apprentice",
        description: "Achieve a 10x combo",
        icon: "🔥",
        points: 25,
        rarity: "common",
        requirement: { type: "combo", value: 10 },
      },
      {
        id: "combo_master",
        name: "Combo Master",
        description: "Achieve a 50x combo",
        icon: "💥",
        points: 100,
        rarity: "rare",
        requirement: { type: "combo", value: 50 },
      },
      {
        id: "combo_legend",
        name: "Combo Legend",
        description: "Achieve a 100x combo",
        icon: "⚡",
        points: 500,
        rarity: "legendary",
        requirement: { type: "combo", value: 100 },
      },
      {
        id: "century_club",
        name: "Century Club",
        description: "Chop 100 logs in one game",
        icon: "💯",
        points: 50,
        rarity: "common",
        requirement: { type: "chops_single_game", value: 100 },
      },
      {
        id: "thousand_cuts",
        name: "Thousand Cuts",
        description: "Chop 1000 logs total",
        icon: "🌲",
        points: 100,
        rarity: "rare",
        requirement: { type: "total_chops", value: 1000 },
      },
      {
        id: "score_rookie",
        name: "Rookie Lumberjack",
        description: "Score 1,000 points",
        icon: "🏅",
        points: 20,
        rarity: "common",
        requirement: { type: "score", value: 1000 },
      },
      {
        id: "score_pro",
        name: "Professional Lumberjack",
        description: "Score 10,000 points",
        icon: "🏆",
        points: 100,
        rarity: "rare",
        requirement: { type: "score", value: 10000 },
      },
      {
        id: "score_legend",
        name: "Legendary Lumberjack",
        description: "Score 100,000 points",
        icon: "👑",
        points: 1000,
        rarity: "legendary",
        requirement: { type: "score", value: 100000 },
      },
      {
        id: "speed_demon",
        name: "Speed Demon",
        description: "Chop a log in under 200ms",
        icon: "⚡",
        points: 75,
        rarity: "rare",
        requirement: { type: "reaction_time", value: 200 },
      },
      {
        id: "power_user",
        name: "Power User",
        description: "Use all 4 different power-ups",
        icon: "💪",
        points: 50,
        rarity: "rare",
        requirement: { type: "power_ups_used", value: 4 },
      },
      {
        id: "survivor",
        name: "Survivor",
        description: "Survive for 5 minutes in Survival mode",
        icon: "🛡️",
        points: 200,
        rarity: "epic",
        requirement: { type: "survival_time", value: 300 },
      },
    ];

    for (const achievement of achievements) {
      await ctx.db.insert("achievements", achievement);
    }
  },
});
