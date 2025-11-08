
export interface PlayerProgress {
    unlockedLevelIds: string[];
    completedAchievementIds: string[];
    completionDateTimes?: { [achievementId: string]: string };
    endCreditsUnlocked: boolean;
}
