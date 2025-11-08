
export interface Level {
    id: 'easy' | 'medium' | 'hard' | 'impossible';
    name: string;
    arrivalTime: number; // in seconds
    engineOverloadTime: number; // in seconds
    problemFrequency: number; // in seconds
    achievementId: 'first-step' | 'wasnt-that-hard' | 'skilled' | 'the-goat';
    unlocksNextLevelId: 'medium' | 'hard' | 'impossible' | null;
    menuDescription: string;
}

export const initialLevels: Level[] = [
    {
        id: 'easy',
        name: 'Easy',
        arrivalTime: 5 * 60,
        engineOverloadTime: 10 * 60,
        problemFrequency: 40,
        achievementId: 'first-step',
        unlocksNextLevelId: 'medium',
        menuDescription: "Begin your space journey. Everything’s stable… for now.",
    },
    {
        id: 'medium',
        name: 'Medium',
        arrivalTime: 10 * 60,
        engineOverloadTime: 19 * 60,
        problemFrequency: 20,
        achievementId: 'wasnt-that-hard',
        unlocksNextLevelId: 'hard',
        menuDescription: "Systems getting tricky. Keep calm and fix fast.",
    },
    {
        id: 'hard',
        name: 'Hard',
        arrivalTime: 20 * 60,
        engineOverloadTime: 25 * 60,
        problemFrequency: 10,
        achievementId: 'skilled',
        unlocksNextLevelId: 'impossible',
        menuDescription: "Only pros survive here. Every second counts.",
    },
    {
        id: 'impossible',
        name: 'Impossible',
        arrivalTime: 30 * 60,
        engineOverloadTime: 31 * 60,
        problemFrequency: 5,
        achievementId: 'the-goat',
        unlocksNextLevelId: null,
        menuDescription: "This is where legends are made. Don’t blink.",
    }
];
