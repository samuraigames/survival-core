
export interface Achievement {
    id: 'first-step' | 'wasnt-that-hard' | 'skilled' | 'the-goat';
    title: string;
    description: string;
}

export const initialAchievements: Achievement[] = [
    {
        id: 'first-step',
        title: 'First Step',
        description: 'Completed Easy Mode.',
    },
    {
        id: 'wasnt-that-hard',
        title: 'Wasn’t that hard?',
        description: 'Completed Medium Mode.',
    },
    {
        id: 'skilled',
        title: 'Skilled',
        description: 'Completed Hard Mode.',
    },
    {
        id: 'the-goat',
        title: 'THE GOAT!!',
        description: 'Completed Impossible Mode.',
    }
];
