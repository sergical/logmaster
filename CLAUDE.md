# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LogMaster is a retro wood-chopping arcade game built with Next.js 15, Phaser.js 3, and Convex as the backend database. The project features pixel art, CRT monitor effects, real-time leaderboards, achievements, and player progression tracking.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx convex dev` - Start Convex development server (required for database)

### Convex Setup
The project requires Convex to be running for database functionality:
1. Run `npx convex dev` in a separate terminal
2. Follow GitHub login prompts if first time
3. Keep the terminal running during development
4. Environment variable `NEXT_PUBLIC_CONVEX_URL` must be set

## Architecture

### Tech Stack
- **Frontend**: Next.js 15 with App Router
- **Game Engine**: Phaser.js 3 (dynamically imported to avoid SSR issues)
- **Database**: Convex (real-time, serverless)
- **Styling**: Tailwind CSS with custom retro/CRT effects
- **Monitoring**: Sentry integration
- **Language**: TypeScript

### Core Structure
- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - React components (RetroGameCanvas, RetroLeaderboard, RetroAchievements)
- `src/lib/` - Utilities and custom hooks (game-manager, sprite-generator, use-convex-game)
- `convex/` - Convex backend functions and schema
- `convex/schema.ts` - Database schema definitions

### Database Schema (Convex)
The game uses 6 main tables:
- `players` - Player profiles, stats, achievements
- `gameSessions` - Individual game session tracking
- `leaderboard` - Global/weekly/monthly leaderboards
- `achievements` - Achievement definitions
- `dailyChallenges` - Daily challenge system (future)
- `playerChallengeProgress` - Challenge progress tracking

### Game Architecture
- Phaser.js game is dynamically loaded in `RetroGameCanvas.tsx` to avoid SSR issues
- Game state is managed through Convex hooks (`use-convex-game.ts`)
- Sprite generation is procedural via `sprite-generator.ts`
- Game logic is centralized in `game-manager.ts`

### Key Patterns
- Player ID generation uses short UUIDs for simplicity
- Sentry logging is integrated throughout for monitoring
- All game components use custom pixel-font CSS classes
- CRT monitor effects are implemented with CSS gradients and filters

## Important Notes

### Phaser Integration
- Phaser must be dynamically imported due to SSR incompatibility
- Game initialization requires checking for browser environment
- Canvas container must have explicit dimensions for proper scaling

### Convex Integration  
- Real-time data updates through Convex hooks
- All mutations use optimistic updates where possible
- Player data persists across sessions via userId

### Styling Conventions
- Uses custom CSS classes: `pixel-font`, `retro-glow`, `crt-effect`, `arcade-button`
- Color scheme: green terminals (#2d5016 background), yellow accents, purple highlights
- All UI follows retro arcade aesthetic