// src/ai/flows/generate-comic-panel.ts
'use server';
/**
 * @fileOverview Flow for generating a new comic panel based on a text prompt.
 *
 * - generateComicPanel - A function that generates a comic panel using a prompt.
 * - GenerateComicPanelInput - The input type for the generateComicPanel function.
 * - GenerateComicPanelOutput - The return type for the generateComicPanel function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateComicPanelInputSchema = z.object({
  prompt: z.string().describe('A text prompt describing the desired comic panel.'),
  previousPanelDataUri: z
    .string()
    .describe(
      'A photo of the previous comic panel, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' 
    ),
});
export type GenerateComicPanelInput = z.infer<typeof GenerateComicPanelInputSchema>;

const GenerateComicPanelOutputSchema = z.object({
  panelDataUri: z
    .string()
    .describe(
      'A photo of the generated comic panel, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type GenerateComicPanelOutput = z.infer<typeof GenerateComicPanelOutputSchema>;

export async function generateComicPanel(input: GenerateComicPanelInput): Promise<GenerateComicPanelOutput> {
  return generateComicPanelFlow(input);
}

const generateComicPanelPrompt = ai.definePrompt({
  name: 'generateComicPanelPrompt',
  input: {schema: GenerateComicPanelInputSchema},
  output: {schema: GenerateComicPanelOutputSchema},
  prompt: `Generate a comic panel based on the following prompt and the previous panel.

Previous Panel:
{{media url=previousPanelDataUri}}

Prompt: {{{prompt}}}`,
});

const generateComicPanelFlow = ai.defineFlow(
  {
    name: 'generateComicPanelFlow',
    inputSchema: GenerateComicPanelInputSchema,
    outputSchema: GenerateComicPanelOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: [
        {media: {url: input.previousPanelDataUri}},
        {text: input.prompt},
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {panelDataUri: media.url!};
  }
);
