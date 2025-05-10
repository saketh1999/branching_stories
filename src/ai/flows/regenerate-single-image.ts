'use server';
/**
 * @fileOverview Flow for regenerating a single comic image based on a new prompt and a context image.
 *
 * - regenerateSingleImage - A function that regenerates a single image.
 * - RegenerateSingleImageInput - The input type for the regenerateSingleImage function.
 * - RegenerateSingleImageOutput - The return type for the regenerateSingleImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RegenerateSingleImageInputSchema = z.object({
  newPromptText: z.string().min(1, "Prompt text cannot be empty."),
  contextImageUrl: z.string().describe(
    "Data URI of an image to use as context for regeneration. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
});
export type RegenerateSingleImageInput = z.infer<typeof RegenerateSingleImageInputSchema>;

const RegenerateSingleImageOutputSchema = z.object({
  generatedImageUrl: z
    .string()
    .describe(
      'Data URI for the regenerated image. Format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type RegenerateSingleImageOutput = z.infer<typeof RegenerateSingleImageOutputSchema>;

export async function regenerateSingleImage(input: RegenerateSingleImageInput): Promise<RegenerateSingleImageOutput> {
  return regenerateSingleImageFlow(input);
}

const regenerateSingleImageFlow = ai.defineFlow(
  {
    name: 'regenerateSingleImageFlow',
    inputSchema: RegenerateSingleImageInputSchema,
    outputSchema: RegenerateSingleImageOutputSchema,
  },
  async (input) => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: [ 
        {media: {url: input.contextImageUrl}},
        {text: `Regenerate an image based on the provided context image, adhering to the following new instructions: "${input.newPromptText}" Ensure the style and characters (if any) from the context image are maintained unless explicitly asked to change.`},
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'], 
      },
    });
    
    if (media.url) {
      return {generatedImageUrl: media.url};
    } else {
      throw new Error("Image regeneration failed to return a URL.");
    }
  }
);
