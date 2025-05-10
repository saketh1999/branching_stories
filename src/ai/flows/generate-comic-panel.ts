
// src/ai/flows/generate-comic-panel.ts
'use server';
/**
 * @fileOverview Flow for generating a new comic panel with multiple images based on text prompts.
 * Each prompt can now have its own specific visual context image.
 *
 * - generateComicPanel - A function that generates multiple comic panel images.
 * - GenerateComicPanelInput - The input type for the generateComicPanel function.
 * - GenerateComicPanelOutput - The return type for the generateComicPanel function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PromptWithContextSchema = z.object({
  promptText: z.string().min(1, "Prompt text cannot be empty."),
  contextImageUrl: z.string().describe(
    "Data URI of an image to use as context for this specific prompt. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
});
export type PromptWithContext = z.infer<typeof PromptWithContextSchema>;

const GenerateComicPanelInputSchema = z.object({
  promptsWithContext: z
    .array(PromptWithContextSchema)
    .min(1, "At least one prompt is required.")
    .max(4, "A maximum of 4 images can be generated.")
    .describe('Array of prompt-context pairs, one for each desired image in the new panel.'),
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

const generateComicPanelFlow = ai.defineFlow(
  {
    name: 'generateComicPanelFlow',
    inputSchema: GenerateComicPanelInputSchema,
    outputSchema: GenerateComicPanelOutputSchema,
  },
  async (input) => {
    const generatedImageUrls: string[] = [];

    for (const promptItem of input.promptsWithContext) {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: [ 
          {media: {url: promptItem.contextImageUrl}}, // Use specific context image for this prompt
          {text: `Generate a comic panel image for the following scene, drawing style and context from the provided image: "${promptItem.promptText}"`},
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'], 
        },
      });
      
      if (media.url) {
        generatedImageUrls.push(media.url);
      } else {
        console.warn(`Image generation did not return a URL for prompt: "${promptItem.promptText}"`);
        // Consider throwing an error or pushing a placeholder
      }
    }
    
    if (generatedImageUrls.length !== input.promptsWithContext.length) {
        throw new Error("Mismatch between number of prompts and generated images. Some images may have failed to generate.")
    }

    return {generatedImageUrls};
  }
);

