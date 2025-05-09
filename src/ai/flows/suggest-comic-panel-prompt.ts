// 'use server'
'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting comic panel prompts based on the content of the current panel.
 *
 * - suggestComicPanelPrompts - A function that takes the current comic panel content and returns suggested prompts for generating new panels.
 * - SuggestComicPanelPromptsInput - The input type for the suggestComicPanelPrompts function.
 * - SuggestComicPanelPromptsOutput - The output type for the suggestComicPanelPrompts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema
const SuggestComicPanelPromptsInputSchema = z.object({
  currentPanelContent: z
    .string()
    .describe('The content of the current comic panel, including visual and textual elements.'),
});
export type SuggestComicPanelPromptsInput = z.infer<typeof SuggestComicPanelPromptsInputSchema>;

// Define the output schema
const SuggestComicPanelPromptsOutputSchema = z.object({
  suggestedPrompts: z
    .array(z.string())
    .describe('An array of suggested prompts for generating new comic panels.'),
});
export type SuggestComicPanelPromptsOutput = z.infer<typeof SuggestComicPanelPromptsOutputSchema>;

// Exported function to suggest comic panel prompts
export async function suggestComicPanelPrompts(
  input: SuggestComicPanelPromptsInput
): Promise<SuggestComicPanelPromptsOutput> {
  return suggestComicPanelPromptsFlow(input);
}

// Define the prompt
const prompt = ai.definePrompt({
  name: 'suggestComicPanelPromptsPrompt',
  input: {schema: SuggestComicPanelPromptsInputSchema},
  output: {schema: SuggestComicPanelPromptsOutputSchema},
  prompt: `You are a creative assistant helping a user generate the next panel in their comic book.

  Given the content of the current comic panel, suggest three different prompts that could be used to generate the next panel in the story. Be creative and consider different directions the story could take.

  Current Panel Content: {{{currentPanelContent}}}

  Respond with an array of strings. Each string should be a suggested prompt.
  `,
});

// Define the flow
const suggestComicPanelPromptsFlow = ai.defineFlow(
  {
    name: 'suggestComicPanelPromptsFlow',
    inputSchema: SuggestComicPanelPromptsInputSchema,
    outputSchema: SuggestComicPanelPromptsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
