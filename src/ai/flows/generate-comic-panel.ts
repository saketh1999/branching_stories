
// src/ai/flows/generate-comic-panel.ts
'use server';
/**
 * @fileOverview Flow for generating a new comic panel with multiple images based on text prompts.
 *
 * - generateComicPanel - A function that generates multiple comic panel images using an array of prompts.
 * - GenerateComicPanelInput - The input type for the generateComicPanel function.
 * - GenerateComicPanelOutput - The return type for the generateComicPanel function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateComicPanelInputSchema = z.object({
  promptsToGenerate: z
    .array(z.string().min(1, "Prompt cannot be empty."))
    .min(1, "At least one prompt is required.")
    .max(4, "A maximum of 4 images can be generated.")
    .describe('Array of text prompts, one for each desired image in the new panel (1-4 prompts).'),
  previousPanelContextImageUrl: z
    .string()
    .describe(
      "The primary image Data URI from the previous comic panel, to provide visual context. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateComicPanelInput = z.infer<typeof GenerateComicPanelInputSchema>;

const GenerateComicPanelOutputSchema = z.object({
  generatedImageUrls: z
    .array(z.string())
    .describe(
      'Array of Data URIs for the generated comic panel images. Each string is a data URI: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type GenerateComicPanelOutput = z.infer<typeof GenerateComicPanelOutputSchema>;

export async function generateComicPanel(input: GenerateComicPanelInput): Promise<GenerateComicPanelOutput> {
  return generateComicPanelFlow(input);
}

// Note: The ai.definePrompt is not directly used here for multiple image generation in this setup.
// We will call ai.generate multiple times within the flow.

const generateComicPanelFlow = ai.defineFlow(
  {
    name: 'generateComicPanelFlow',
    inputSchema: GenerateComicPanelInputSchema,
    outputSchema: GenerateComicPanelOutputSchema,
  },
  async (input) => {
    const generatedImageUrls: string[] = [];

    for (const promptText of input.promptsToGenerate) {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: [ // Context image first, then the specific text prompt for this image
          {media: {url: input.previousPanelContextImageUrl}},
          {text: `Generate a comic panel image for the following scene, continuing from the style and context of the provided previous panel image: "${promptText}"`},
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'], // TEXT modality is often required even if not directly used.
        },
      });
      
      if (media.url) {
        generatedImageUrls.push(media.url);
      } else {
        // Handle cases where an image might not be generated, though unlikely with current models if TEXT/IMAGE specified
        console.warn(`Image generation did not return a URL for prompt: "${promptText}"`);
        // Potentially throw an error or push a placeholder, depending on desired error handling
        // For now, we'll assume success if no error is thrown by ai.generate
      }
    }
    
    if (generatedImageUrls.length !== input.promptsToGenerate.length) {
        throw new Error("Mismatch between number of prompts and generated images. Some images may have failed to generate.")
    }

    return {generatedImageUrls};
  }
);
