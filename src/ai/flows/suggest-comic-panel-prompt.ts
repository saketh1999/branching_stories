
'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting comic panel prompts.
 * It takes the primary image and textual context of the current comic panel
 * and returns a list of suggested prompts for generating new panels.
 *
 * - suggestComicPanelPrompts - Function to get prompt suggestions.
 * - SuggestComicPanelPromptsInput - Input type.
 * - SuggestComicPanelPromptsOutput - Output type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestComicPanelPromptsInputSchema = z.object({
  currentPanelPrimaryImageUrl: z
    .string()
    .describe(
      "The primary image Data URI of the current comic panel to base suggestions on. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  currentPanelTextContext: z
    .string()
    .describe('Textual context from the current panel (e.g., user description or concatenated prompts from previous generation).'),
});
export type SuggestComicPanelPromptsInput = z.infer<typeof SuggestComicPanelPromptsInputSchema>;

const SuggestComicPanelPromptsOutputSchema = z.object({
  suggestedPrompts: z
    .array(z.string())
    .describe('An array of at least 8 suggested prompts for generating new comic panels.'),
});
export type SuggestComicPanelPromptsOutput = z.infer<typeof SuggestComicPanelPromptsOutputSchema>;

export async function suggestComicPanelPrompts(
  input: SuggestComicPanelPromptsInput
): Promise<SuggestComicPanelPromptsOutput> {
  return suggestComicPanelPromptsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestComicPanelPromptsPrompt',
  input: {schema: SuggestComicPanelPromptsInputSchema},
  output: {schema: SuggestComicPanelPromptsOutputSchema},
  prompt: `You are a creative assistant helping a user generate the next set of images for their comic book panel.
  The user can generate up to 4 images for the next panel.

  Given the primary image and textual context of the current comic panel, suggest 8 diverse and creative prompts that could be used to generate individual images for the next panel.
  Each prompt should describe a distinct visual scene or moment that could logically follow or branch from the current panel.
  Focus on variety: suggest continuations, new character actions, different angles, emotional shifts, or unexpected turns.

  Current Panel Context:
  Image: {{media url=currentPanelPrimaryImageUrl}}
  Text: {{{currentPanelTextContext}}}

  Respond with an array of 8 strings. Each string should be a distinct suggested prompt.
  Example of good prompts:
  - "The hero leaps over the chasm, a determined look on their face."
  - "Close up on the villain's menacing grin as they watch from the shadows."
  - "A map reveals a new, dangerous path ahead."
  - "The sidekick stumbles upon a hidden clue."
  `,
});

const suggestComicPanelPromptsFlow = ai.defineFlow(
  {
    name: 'suggestComicPanelPromptsFlow',
    inputSchema: SuggestComicPanelPromptsInputSchema,
    outputSchema: SuggestComicPanelPromptsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Ensure we always return an array, even if the model fails partially.
    // And ensure we have at least a few, ideally 8 as requested in the prompt.
    if (!output || !Array.isArray(output.suggestedPrompts) || output.suggestedPrompts.length === 0) {
        // Fallback in case AI doesn't provide proper output
        return { suggestedPrompts: [
            "A character reacts with surprise.",
            "A new object is revealed.",
            "The scene shifts to a different location.",
            "A close-up on an important detail.",
            "Dialogue continues between characters.",
            "An action sequence begins.",
            "A flashback or memory.",
            "A mysterious figure appears."
        ]};
    }
    return output;
  }
);
