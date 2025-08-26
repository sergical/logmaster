'use client';

import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface RetroAchievementsProps {
  unlockedAchievements?: string[];
}

export default function RetroAchievements({ unlockedAchievements = [] }: RetroAchievementsProps) {
  const allAchievements = useQuery(api.achievements.getAllAchievements);
  
  const rarityColors = {
    common: 'from-gray-600 to-gray-700 border-gray-500',
    rare: 'from-blue-600 to-blue-700 border-blue-500',
    epic: 'from-purple-600 to-purple-700 border-purple-500',
    legendary: 'from-yellow-600 to-yellow-700 border-yellow-500',
  };
  
  const rarityGlow = {
    common: '',
    rare: 'shadow-blue-500/50',
    epic: 'shadow-purple-500/50',
    legendary: 'shadow-yellow-500/50 animate-pulse',
  };
  
  return (
    <div className="bg-gradient-to-b from-gray-900 to-black p-6 rounded-lg shadow-2xl border-4 border-purple-600">
      <div className="text-center mb-6">
        <h2 className="text-4xl font-bold text-purple-400 mb-2 pixel-font animate-pulse">
          🏅 ACHIEVEMENTS 🏅
        </h2>
        <div className="text-purple-300 text-sm">
          Unlock all achievements to become a true LogMaster!
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allAchievements?.map((achievement) => {
          const isUnlocked = unlockedAchievements.includes(achievement.id);
          const rarity = achievement.rarity as keyof typeof rarityColors;
          
          return (
            <div
              key={achievement.id}
              className={`relative p-4 rounded-lg border-2 transition-all duration-300 ${
                isUnlocked
                  ? `bg-gradient-to-r ${rarityColors[rarity]} shadow-lg ${rarityGlow[rarity]}`
                  : 'bg-gray-800/50 border-gray-700 opacity-50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl flex-shrink-0">
                  {isUnlocked ? achievement.icon : '🔒'}
                </div>
                <div className="flex-1">
                  <h3 className={`font-bold text-lg ${
                    isUnlocked ? 'text-white' : 'text-gray-400'
                  }`}>
                    {achievement.name}
                  </h3>
                  <p className={`text-sm mt-1 ${
                    isUnlocked ? 'text-gray-200' : 'text-gray-500'
                  }`}>
                    {achievement.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`text-xs px-2 py-1 rounded ${
                      isUnlocked 
                        ? 'bg-black/30 text-white' 
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {achievement.points} pts
                    </div>
                    <div className={`text-xs px-2 py-1 rounded capitalize ${
                      isUnlocked
                        ? 'bg-black/30 text-white'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {achievement.rarity}
                    </div>
                  </div>
                </div>
              </div>
              
              {isUnlocked && (
                <div className="absolute -top-2 -right-2 text-2xl animate-bounce">
                  ✨
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {allAchievements && (
        <div className="mt-6 text-center">
          <div className="inline-block bg-gradient-to-r from-purple-900/50 to-purple-800/50 p-4 rounded-lg border-2 border-purple-600">
            <div className="text-purple-300 text-sm mb-1">Progress</div>
            <div className="text-3xl font-bold text-purple-400">
              {unlockedAchievements.length} / {allAchievements.length}
            </div>
            <div className="w-48 h-4 bg-gray-700 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
                style={{ 
                  width: `${(unlockedAchievements.length / allAchievements.length) * 100}%` 
                }}
              />
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .pixel-font {
          font-family: 'Courier New', monospace;
          text-transform: uppercase;
          letter-spacing: 2px;
          text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  );
}
