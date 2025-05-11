'use server';

/**
 * @fileOverview This file defines a flow for suggesting comic panel prompts.
 * It takes the primary image and textual context of the current comic panel
 * and returns a list of suggested prompts for generating new panels.
 * Supports both Gemini and OpenAI (ChatGPT) models for generation.
 * Compatible with both data URIs and Vercel Blob URLs.
 *
 * - suggestComicPanelPrompts - Function to get prompt suggestions.
 * - SuggestComicPanelPromptsInput - Input type.
 * - SuggestComicPanelPromptsOutput - Output type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import OpenAI from 'openai';
import { blobUrlToDataUri } from '@/lib/blob-storage';

// Constants
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Model choice options
export type ModelChoice = 'gemini' | 'chatgpt';

const SuggestComicPanelPromptsInputSchema = z.object({
  currentPanelPrimaryImageUrl: z
    .string()
    .describe(
      "The primary image URL or Data URI of the current comic panel to base suggestions on."
    ),
  currentPanelTextContext: z
    .string()
    .describe('Textual context from the current panel (e.g., user description or concatenated prompts from previous generation).'),
  modelChoice: z
    .enum(['gemini', 'chatgpt'])
    .default('gemini')
    .describe('The AI model to use for generation - either Gemini or ChatGPT'),
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

/**
 * Ensures we have a data URI to work with, converting from Blob URL if needed
 */
async function ensureDataUri(imageUrl: string): Promise<string> {
  // If already a data URI, return as is
  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }
  
  // Otherwise, assume it's a Blob URL and convert it
  try {
    return await blobUrlToDataUri(imageUrl);
  } catch (error) {
    console.error('Error converting Blob URL to data URI:', error);
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Function to suggest panel prompts using OpenAI (ChatGPT)
 */
async function suggestPromptsWithOpenAI(input: SuggestComicPanelPromptsInput): Promise<SuggestComicPanelPromptsOutput> {
  try {
    // Verify API key exists
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key is missing. Please add OPENAI_API_KEY to your .env.local file.");
    }
    
    // Initialize the OpenAI client
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Ensure we have a data URI
    const imageDataUri = await ensureDataUri(input.currentPanelPrimaryImageUrl);
    
    // Extract base64 data from the data URI
    const imageBase64 = imageDataUri.split(',')[1];
    
    const response = await openai.chat.completions.create({
      model: "dall-e-2",
      messages: [
        {
          role: "system",
          content: "You are a creative assistant helping a user generate the next set of images for their comic book panel. Suggest 8 diverse and creative prompts that could be used to generate individual images for the next panel."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Given the primary image and textual context of the current comic panel, suggest 8 diverse and creative prompts that could be used to generate individual images for the next panel.
              Each prompt should describe a distinct visual scene or moment that could logically follow or branch from the current panel.
              Focus on variety: suggest continuations, new character actions, different angles, emotional shifts, or unexpected turns.
              
              Current Panel Text Context: ${input.currentPanelTextContext}
              
              Respond with an array of 8 strings. Each string should be a distinct suggested prompt.
              Example of good prompts:
              - "The hero leaps over the chasm, a determined look on their face."
              - "Close up on the villain's menacing grin as they watch from the shadows."
              - "A map reveals a new, dangerous path ahead."
              - "The sidekick stumbles upon a hidden clue."
              `
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const responseText = response.choices[0]?.message.content || '';
    
    // Parse the response to extract prompts
    const promptLines = responseText.split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.startsWith('-') || line.startsWith('*'))
      .map((line: string) => line.substring(1).trim().replace(/^["']|["']$/g, ''));

    if (promptLines.length >= 8) {
      return { suggestedPrompts: promptLines.slice(0, 8) };
    } else {
      // Extract any texts that look like prompts if the bullet parsing didn't work
      const fallbackPrompts = responseText.match(/"([^"]+)"/g) || [];
      const cleanPrompts = fallbackPrompts.map((p: string) => p.replace(/^"|"$/g, ''));
      
      if (cleanPrompts.length >= 8) {
        return { suggestedPrompts: cleanPrompts.slice(0, 8) };
      }
    }
    
    // Fallback in case we couldn't parse enough prompts
    return getFallbackPrompts();
  } catch (error) {
    console.error('Error suggesting prompts with OpenAI:', error);
    return getFallbackPrompts();
  }
}

/**
 * Function to get fallback prompts if AI generation fails
 */
function getFallbackPrompts(): SuggestComicPanelPromptsOutput {
  return {
    suggestedPrompts: [
      "A character reacts with surprise.",
      "A new object is revealed.",
      "The scene shifts to a different location.",
      "A close-up on an important detail.",
      "Dialogue continues between characters.",
      "An action sequence begins.",
      "A flashback or memory.",
      "A mysterious figure appears."
    ]
  };
}

const prompt = ai.definePrompt({
  name: 'suggestComicPanelPromptsPrompt',
  input: { schema: SuggestComicPanelPromptsInputSchema },
  output: { schema: SuggestComicPanelPromptsOutputSchema },
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
    try {
      // Process the image URL first
      let processedImageUrl = input.currentPanelPrimaryImageUrl;
      
      // Check if it's a Blob URL and we're using Gemini
      if (!processedImageUrl.startsWith('data:') && input.modelChoice === 'gemini') {
        // For Gemini, we need a data URI
        processedImageUrl = await blobUrlToDataUri(input.currentPanelPrimaryImageUrl);
      }
      
      // Use OpenAI if specified, otherwise use Gemini
      if (input.modelChoice === 'chatgpt') {
        return await suggestPromptsWithOpenAI(input);
      } else {
        // Use Gemini model with the processed image URL
        const { output } = await prompt({
          ...input,
          currentPanelPrimaryImageUrl: processedImageUrl
        });
        
        // Ensure we have valid output
        if (!output || !Array.isArray(output.suggestedPrompts) || output.suggestedPrompts.length === 0) {
          return getFallbackPrompts();
        }
        
        return output;
      }
    } catch (error) {
      console.error('Error in suggestComicPanelPromptsFlow:', error);
      return getFallbackPrompts();
    }
  }
);
