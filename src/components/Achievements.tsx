'use client';

import { useEffect, useState } from 'react';
import * as Sentry from "@sentry/nextjs";
import { Achievement } from '@/lib/local-first';

interface AchievementsProps {
  achievements: Achievement[];
}

export default function Achievements({ achievements = [] }: AchievementsProps) {
  const [expandedAchievement, setExpandedAchievement] = useState<string | null>(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);

  useEffect(() => {
    const unlockedAchievements = achievements.filter(a => a.unlocked && a.unlockedAt);
    const recentlyUnlocked = unlockedAchievements.filter(a => 
      a.unlockedAt && Date.now() - a.unlockedAt < 5000
    );
    
    if (recentlyUnlocked.length > 0) {
      setNewlyUnlocked(recentlyUnlocked.map(a => a.id));
      
      recentlyUnlocked.forEach(achievement => {
        Sentry.logger.info("Achievement display notification", {
          achievementId: achievement.id,
          achievementName: achievement.name
        });
      });

      setTimeout(() => {
        setNewlyUnlocked([]);
      }, 5000);
    }
  }, [achievements]);

  const getProgressColor = (progress: number, maxProgress: number, unlocked: boolean): string => {
    if (unlocked) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
    
    const percentage = (progress / maxProgress) * 100;
    if (percentage >= 75) return 'bg-gradient-to-r from-green-400 to-green-600';
    if (percentage >= 50) return 'bg-gradient-to-r from-blue-400 to-blue-600';
    if (percentage >= 25) return 'bg-gradient-to-r from-orange-400 to-orange-600';
    return 'bg-gradient-to-r from-gray-300 to-gray-500';
  };

  const getProgressText = (achievement: Achievement): string => {
    if (achievement.unlocked) return 'Completed!';
    return `${achievement.progress}/${achievement.maxProgress}`;
  };

  const sortedAchievements = [...achievements].sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    
    if (!a.unlocked && !b.unlocked) {
      const aProgress = (a.progress / a.maxProgress) * 100;
      const bProgress = (b.progress / b.maxProgress) * 100;
      return bProgress - aProgress;
    }
    
    return (b.unlockedAt || 0) - (a.unlockedAt || 0);
  });

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const completionPercentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-green-800 mb-2">
          🏅 Achievements
        </h2>
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-lg font-semibold text-green-700">
            {unlockedCount} / {totalCount} Unlocked
          </div>
          <div className="text-sm text-green-600 mb-2">
            {completionPercentage}% Complete
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {sortedAchievements.map((achievement) => {
          const isExpanded = expandedAchievement === achievement.id;
          const isNewlyUnlocked = newlyUnlocked.includes(achievement.id);
          const progressPercentage = (achievement.progress / achievement.maxProgress) * 100;

          return (
            <div
              key={achievement.id}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-300 ${
                achievement.unlocked
                  ? isNewlyUnlocked
                    ? 'border-yellow-400 bg-yellow-50 shadow-lg animate-pulse'
                    : 'border-green-400 bg-green-50 hover:bg-green-100'
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={() => {
                setExpandedAchievement(isExpanded ? null : achievement.id);
                Sentry.logger.debug("Achievement card clicked", {
                  achievementId: achievement.id,
                  expanded: !isExpanded
                });
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`text-3xl ${achievement.unlocked ? '' : 'grayscale'}`}>
                    {achievement.icon}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold text-lg ${
                        achievement.unlocked ? 'text-green-700' : 'text-gray-700'
                      }`}>
                        {achievement.name}
                      </h3>
                      {isNewlyUnlocked && (
                        <span className="bg-yellow-400 text-yellow-800 text-xs px-2 py-1 rounded-full font-semibold animate-bounce">
                          NEW!
                        </span>
                      )}
                    </div>
                    
                    <p className={`text-sm mt-1 ${
                      achievement.unlocked ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {achievement.description}
                    </p>

                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">Progress</span>
                        <span className={`font-medium ${
                          achievement.unlocked ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {getProgressText(achievement)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            getProgressColor(achievement.progress, achievement.maxProgress, achievement.unlocked)
                          }`}
                          style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right ml-4">
                  {achievement.unlocked && achievement.unlockedAt && (
                    <div className="text-xs text-green-600 mb-1">
                      🎉 Unlocked
                    </div>
                  )}
                  <div className={`text-xs ${
                    achievement.unlocked ? 'text-green-500' : 'text-gray-500'
                  }`}>
                    {isExpanded ? '▼' : '▶'}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <span className="ml-2 font-medium">
                        {achievement.id.includes('combo') ? 'Combat' :
                         achievement.id.includes('speed') ? 'Performance' :
                         achievement.id.includes('golden') ? 'Discovery' : 'Progress'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Difficulty:</span>
                      <span className="ml-2 font-medium">
                        {achievement.maxProgress <= 1 ? 'Easy' :
                         achievement.maxProgress <= 25 ? 'Medium' :
                         achievement.maxProgress <= 100 ? 'Hard' : 'Extreme'}
                      </span>
                    </div>
                    {achievement.unlocked && achievement.unlockedAt && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Unlocked:</span>
                        <span className="ml-2 font-medium">
                          {new Date(achievement.unlockedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {achievements.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🏅</div>
          <p>No achievements available yet!</p>
          <p className="text-sm mt-1">Start playing to unlock achievements!</p>
        </div>
      )}

      {newlyUnlocked.length > 0 && (
        <div className="fixed top-4 right-4 z-50">
          {newlyUnlocked.map(achievementId => {
            const achievement = achievements.find(a => a.id === achievementId);
            if (!achievement) return null;
            
            return (
              <div
                key={achievementId}
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white p-4 rounded-lg shadow-lg mb-2 animate-slideInRight"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{achievement.icon}</div>
                  <div>
                    <div className="font-bold">Achievement Unlocked!</div>
                    <div className="text-sm opacity-90">{achievement.name}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}