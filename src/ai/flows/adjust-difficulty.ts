'use server';

/**
 * @fileOverview A dynamic difficulty adjustment AI agent.
 *
 * - adjustDifficulty - A function that handles the dynamic difficulty adjustment process.
 * - AdjustDifficultyInput - The input type for the adjustDifficulty function.
 * - AdjustDifficultyOutput - The return type for the adjustDifficulty function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdjustDifficultyInputSchema = z.object({
  playerSkillLevel: z
    .number()
    .describe("The player's current skill level, ranging from 1 (beginner) to 10 (expert)."),
  timeSinceLastEvent: z
    .number()
    .describe('The time in seconds since the last significant game event (malfunction or navigation challenge).'),
  currentScore: z.number().describe('The player\'s current score in the game.'),
});
export type AdjustDifficultyInput = z.infer<typeof AdjustDifficultyInputSchema>;

const AdjustDifficultyOutputSchema = z.object({
  malfunctionFrequency: z
    .number()
    .describe(
      'The frequency of malfunctions, in seconds. Lower values indicate more frequent malfunctions.'
    ),
  navigationChallengeFrequency: z
    .number()
    .describe(
      'The frequency of navigation challenges, in seconds. Lower values indicate more frequent challenges.'
    ),
  eventIntensity: z
    .number()
    .describe(
      'The intensity of the next event (malfunction or navigation challenge), ranging from 1 (low) to 10 (high).'
    ),
  suggestedDelay: z
    .number()
    .describe(
      'The suggested delay before triggering the next event, in seconds. This takes into account the player skill level and recent performance, in order to keep them engaged and challenged without being overwhelmed.'
    ),
});
export type AdjustDifficultyOutput = z.infer<typeof AdjustDifficultyOutputSchema>;

export async function adjustDifficulty(input: AdjustDifficultyInput): Promise<AdjustDifficultyOutput> {
  return adjustDifficultyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adjustDifficultyPrompt',
  input: {schema: AdjustDifficultyInputSchema},
  output: {schema: AdjustDifficultyOutputSchema},
  prompt: `You are an AI game director responsible for dynamically adjusting the game difficulty to maintain player engagement.

  Based on the following player data, determine the appropriate frequency of malfunctions and navigation challenges, the intensity of the next event, and the suggested delay before triggering the next event.

  Player Skill Level: {{{playerSkillLevel}}}
  Time Since Last Event: {{{timeSinceLastEvent}}} seconds
  Current Score: {{{currentScore}}}

  Consider the following:
  - A higher player skill level should result in more frequent and intense events.
  - If the time since the last event is too long, increase the frequency of events to keep the player engaged.
  - Adjust event intensity based on player score; a higher score might indicate the player is ready for a more challenging event.
  - The goal is to provide a challenging but fair gameplay experience that keeps the player engaged without overwhelming them.

  Return the malfunctionFrequency, navigationChallengeFrequency, eventIntensity, and suggestedDelay values as a JSON object.
  Make sure that all values are numbers.
  `,
});

const adjustDifficultyFlow = ai.defineFlow(
  {
    name: 'adjustDifficultyFlow',
    inputSchema: AdjustDifficultyInputSchema,
    outputSchema: AdjustDifficultyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
