'use server';
/**
 * @fileOverview A character name and biography generation AI agent.
 *
 * - generateCharacterNameAndBio - A function that handles the character name and biography generation process.
 * - GenerateCharacterNameAndBioInput - The input type for the generateCharacterNameAndBio function.
 * - GenerateCharacterNameAndBioOutput - The return type for the generateCharacterNameAndBio function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { db } from '@/lib/firebase/server';

const GenerateCharacterNameAndBioInputSchema = z.object({
  userId: z.string().describe("The ID of the user requesting the generation."),
  datapackId: z.string().describe("The ID of the DataPack to use for validation."),
  userPreferences: z.string().describe('The user preferences for the character.'),
});
export type GenerateCharacterNameAndBioInput = z.infer<typeof GenerateCharacterNameAndBioInputSchema>;

const GenerateCharacterNameAndBioOutputSchema = z.object({
  name: z.string().describe('The generated name of the character.'),
  bio: z.string().describe('The generated biography of the character.'),
});
export type GenerateCharacterNameAndBioOutput = z.infer<typeof GenerateCharacterNameAndBioOutputSchema>;

export async function generateCharacterNameAndBio(input: GenerateCharacterNameAndBioInput): Promise<GenerateCharacterNameAndBioOutput> {
  return generateCharacterNameAndBioFlow(input);
}

const generateCharacterNameAndBioPrompt = ai.definePrompt({
  name: 'generateCharacterNameAndBioPrompt',
  input: {schema: GenerateCharacterNameAndBioInputSchema},
  output: {schema: GenerateCharacterNameAndBioOutputSchema},
  prompt: `You are a creative writer specializing in character development.

You will generate a character name and biography based on the user preferences.

User Preferences: {{{userPreferences}}}

Name: 
Bio:`, 
});

const generateCharacterNameAndBioFlow = ai.defineFlow(
  {
    name: 'generateCharacterNameAndBioFlow',
    inputSchema: GenerateCharacterNameAndBioInputSchema,
    outputSchema: GenerateCharacterNameAndBioOutputSchema,
  },
  async input => {
    const { userId, datapackId, userPreferences } = input;

    // DataPack Access Validation
    const userRef = db.collection('users').doc(userId);
    const packRef = db.collection('datapacks').doc(datapackId);

    const [userDoc, packDoc] = await Promise.all([userRef.get(), packRef.get()]);

    if (!userDoc.exists) {
      throw new Error('User not found.');
    }
    if (!packDoc.exists) {
      throw new Error('DataPack not found.');
    }

    const user = userDoc.data()!;
    const pack = packDoc.data()!;

    // 1. Check if the pack is installed
    if (!user.installedPacks?.includes(datapackId)) {
      throw new Error(`DataPack '${datapackId}' is not installed for this user.`);
    }

    // 2. Check for permissions
    if (pack.premiumStatus === 'purchased' && !user.purchasedPacks?.includes(datapackId)) {
        throw new Error(`User has not purchased DataPack '${datapackId}'.`);
    }
    if (pack.premiumStatus === 'subscription' && user.subscriptionTier === 'free') {
        throw new Error(`User does not have the required subscription tier for DataPack '${datapackId}'.`);
    }

    const {output} = await generateCharacterNameAndBioPrompt({ userPreferences, userId, datapackId });
    return output!;
  }
);
