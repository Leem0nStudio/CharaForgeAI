// The generateCharacterImage flow generates an image for a character using AI, conditionally supporting image editing and high-quality image generation with Gemini and Imagen models.
'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {db} from '@/lib/firebase/server';

const GenerateCharacterImageInputSchema = z.object({
  userId: z.string().describe('The ID of the user requesting the generation.'),
  datapackId: z
    .string()
    .describe('The ID of the DataPack to use for validation.'),
  baseImage: z
    .string()
    .optional()
    .describe(
      "Optional base image as a data URI for image editing. Must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'" // Correct the typo here
    ),
  prompt: z.string().describe('Text prompt for generating the character image.'),
  useHighQuality: z
    .boolean()
    .default(false)
    .describe('Whether to use the high-quality Imagen model.'),
});
export type GenerateCharacterImageInput = z.infer<
  typeof GenerateCharacterImageInputSchema
>;

const GenerateCharacterImageOutputSchema = z.object({
  imageUrl: z.string().describe('The generated image as a data URI.'),
});
export type GenerateCharacterImageOutput = z.infer<
  typeof GenerateCharacterImageOutputSchema
>;

export async function generateCharacterImage(
  input: GenerateCharacterImageInput
): Promise<GenerateCharacterImageOutput> {
  return generateCharacterImageFlow(input);
}

const generateCharacterImageFlow = ai.defineFlow(
  {
    name: 'generateCharacterImageFlow',
    inputSchema: GenerateCharacterImageInputSchema,
    outputSchema: GenerateCharacterImageOutputSchema,
  },
  async input => {
    const {userId, datapackId, baseImage, prompt, useHighQuality} = input;

    // The user must exist, but we don't need to validate the datapack for now.
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new Error('User not found.');
    }

    let imageUrl: string;

    if (baseImage) {
      // Image editing with Gemini
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: [
          {media: {url: baseImage}},
          {text: prompt},
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });
      if (!media?.url) {
        throw new Error('Image generation failed with Gemini.');
      }
      imageUrl = media.url;
    } else {
      // Text-to-image generation
      const model = useHighQuality
        ? 'imagen-3.0-generate-002'
        : 'googleai/gemini-2.0-flash-preview-image-generation';

      const {media} = await ai.generate({
        model: model,
        prompt: prompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      if (!media?.url) {
        throw new Error(`Image generation failed with ${model}.`);
      }
      imageUrl = media.url;
    }

    return {imageUrl};
  }
);
