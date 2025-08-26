# LogMaster Arcade - Setup Guide

## 🎮 Retro Wood Chopping Game with Next.js, Convex, and Phaser.js

### Prerequisites
- Node.js 18+
- npm or yarn
- A Convex account (free tier works great)

### Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set up Convex**
   ```bash
   npx convex dev
   ```
   - This will prompt you to log in with GitHub
   - Create a new project when prompted
   - The command will generate your `NEXT_PUBLIC_CONVEX_URL`
   - Keep this terminal running!

3. **Update Environment Variables**
   Create or update `.env.local`:
   ```
   NEXT_PUBLIC_CONVEX_URL=your_convex_url_here
   ```

4. **Run the Development Server**
   In a new terminal:
   ```bash
   npm run dev
   ```

5. **Open the Game**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Game Features

#### 🕹️ Retro Gameplay
- **8-bit pixel art** generated programmatically
- **Arcade-style physics** with Phaser.js
- **Chiptune sound effects** using Web Audio API
- **CRT monitor effect** for authentic retro feel
- **Combo system** for high scores

#### 🌲 Log Types
- **Normal Logs** (Brown) - 50 points, 2 hits
- **Hardwood Logs** (Dark) - 100 points, 3 hits
- **Golden Logs** (Gold) - 500 points, 1 hit

#### 🏆 Features
- **Real-time Leaderboard** - Compete globally
- **Achievement System** - Unlock 12+ achievements
- **Persistent Progress** - Powered by Convex
- **Player Profiles** - Track your stats

#### 🎯 How to Play
1. Move your mouse to aim the axe
2. Click to chop logs
3. Build combos by hitting logs consecutively
4. Don't miss or you'll lose your combo!
5. Level up every 30 seconds for harder gameplay

### Technical Stack

- **Frontend**: Next.js 15 with App Router
- **Game Engine**: Phaser.js 3
- **Database**: Convex (real-time, serverless)
- **Styling**: Tailwind CSS with custom retro styles
- **Monitoring**: Sentry
- **Language**: TypeScript

### Convex Schema

The game uses Convex for:
- Player profiles and stats
- Game sessions tracking
- Global leaderboard (all-time, weekly, monthly)
- Achievement system
- Daily challenges (coming soon)

### Development Tips

1. **Convex Dashboard**: Visit your Convex dashboard to see real-time data
2. **Hot Reload**: Both Next.js and Convex support hot reloading
3. **Debug Mode**: Check browser console for game logs via Sentry

### Troubleshooting

- **Convex not connecting**: Make sure `npx convex dev` is running
- **No sprites showing**: Clear browser cache, sprites are generated on-the-fly
- **Lag issues**: Phaser performs best in Chrome/Edge

### Future Enhancements
- Multiplayer battles
- Power-ups (Double Axe, Time Freeze, etc.)
- More log types and environments
- Mobile touch controls
- Steam achievements integration

Enjoy your retro lumberjack adventure! 🪓🌲
