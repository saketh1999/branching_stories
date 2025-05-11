// src/ai/flows/generate-comic-panel.ts
'use server';
/**
 * @fileOverview Flow for generating a new comic panel with multiple images based on text prompts.
 * Each prompt can now have its own specific visual context image.
 * Supports both Gemini and OpenAI (ChatGPT) models for image generation.
 * Uses Vercel Blob storage for persistently storing images.
 *
 * - generateComicPanel - A function that generates multiple comic panel images.
 * - GenerateComicPanelInput - The input type for the generateComicPanel function.
 * - GenerateComicPanelOutput - The return type for the generateComicPanel function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import OpenAI from 'openai';
import { ModelChoice } from './suggest-comic-panel-prompt';
import { uploadImageToBlob, blobUrlToDataUri } from '@/lib/blob-storage';


// Constants
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

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
  modelChoice: z
    .enum(['gemini', 'chatgpt'])
    .default('gemini')
    .describe('The AI model to use for generation - either Gemini or ChatGPT'),
});
export type GenerateComicPanelInput = z.infer<typeof GenerateComicPanelInputSchema>;

const GenerateComicPanelOutputSchema = z.object({
  generatedImageUrls: z
    .array(z.string())
    .describe(
      'Array of URLs for the generated comic panel images stored in Vercel Blob storage.'
    ),
});
export type GenerateComicPanelOutput = z.infer<typeof GenerateComicPanelOutputSchema>;

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

export async function generateComicPanel(input: GenerateComicPanelInput): Promise<GenerateComicPanelOutput> {
  return generateComicPanelFlow(input);
}

/**
 * Function to generate comic panel images using OpenAI's DALL-E model
 */
async function generateImagesWithOpenAI(input: GenerateComicPanelInput): Promise<GenerateComicPanelOutput> {
  try {
    // Verify API key exists
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key is missing. Please add OPENAI_API_KEY to your .env.local file.");
    }
    
    // Initialize the OpenAI client
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
    
    const generatedImageUrls: string[] = [];

    for (const promptItem of input.promptsWithContext) {
      // Ensure we have a data URI for the context image
      const imageDataUri = await ensureDataUri(promptItem.contextImageUrl);
      
      // Step 1: Use GPT-4 Vision to analyze the context image
      const imageBase64 = imageDataUri.split(',')[1];
      
      if (!imageBase64) {
        throw new Error(`Invalid image data format for prompt: "${promptItem.promptText}"`);
      }
      
      const visionResponse = await openai.chat.completions.create({
        model: "dall-e-2",
        messages: [
          {
            role: "system",
            content: "You are a visual analysis assistant. Analyze the provided image and extract its visual style, characters, setting, and important elements. Focus on artistic style, coloring, and visual elements. Be concise."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image. What's its visual style, characters, setting, and important visual elements? I'll use your description to guide an image generation model."
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
        max_tokens: 300,
      });

      const imageAnalysis = visionResponse.choices[0]?.message.content || '';
      
      // Step 2: Use DALL-E to generate a new image based on the analysis and prompt
      const dallePrompt = `${promptItem.promptText}\n\nStyle reference: ${imageAnalysis}\n\nMaintain the same artistic style, character designs, and visual elements from the reference.`;
      
      const imageResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: dallePrompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      });

      // Extract the base64 data from response
      const generatedImageBase64 = imageResponse.data?.[0]?.b64_json;
      
      if (!generatedImageBase64) {
        throw new Error(`Failed to generate image with DALL-E for prompt: "${promptItem.promptText}"`);
      }
      
      // Convert to data URI format
      const generatedImageDataUri = `data:image/png;base64,${generatedImageBase64}`;
      
      // Upload to Vercel Blob storage with a descriptive filename
      const sanitizedPrompt = promptItem.promptText.slice(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const blobUrl = await uploadImageToBlob(generatedImageDataUri, `comic_panel_${sanitizedPrompt}_${Date.now()}.png`);
      
      generatedImageUrls.push(blobUrl);
    }
    
    if (generatedImageUrls.length !== input.promptsWithContext.length) {
      throw new Error("Mismatch between number of prompts and generated images. Some images may have failed to generate.");
    }

    return { generatedImageUrls };
  } catch (error) {
    console.error('Error generating images with OpenAI:', error);
    throw new Error(`Image generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const generateComicPanelFlow = ai.defineFlow(
  {
    name: 'generateComicPanelFlow',
    inputSchema: GenerateComicPanelInputSchema,
    outputSchema: GenerateComicPanelOutputSchema,
  },
  async (input) => {
    try {
      // Use OpenAI if specified, otherwise use Gemini
      if (input.modelChoice === 'chatgpt') {
        return await generateImagesWithOpenAI(input);
      } else {
        // Use Gemini model
        const generatedImageUrls: string[] = [];

        for (const promptItem of input.promptsWithContext) {
          // For Gemini, ensure we have a data URI format
          const processedContextImageUrl = await ensureDataUri(promptItem.contextImageUrl);
          
          const response = await ai.generate({
            model: 'googleai/gemini-2.0-flash-exp',
            prompt: [ 
              { media: { url: processedContextImageUrl } }, // Use specific context image for this prompt
              { text: `Generate a comic panel image for the following scene, drawing style and context from the provided image: "${promptItem.promptText}"` },
            ],
            config: {
              responseModalities: ['TEXT', 'IMAGE'], 
            },
          });
          
          const media = response.media;
          
          if (media?.url) {
            // Convert data URI to Blob URL
            const sanitizedPrompt = promptItem.promptText.slice(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const blobUrl = await uploadImageToBlob(media.url, `comic_panel_${sanitizedPrompt}_${Date.now()}.png`);
            generatedImageUrls.push(blobUrl);
          } else {
            console.warn(`Image generation did not return a URL for prompt: "${promptItem.promptText}"`);
            throw new Error(`Failed to generate image for prompt: "${promptItem.promptText}"`);
          }
        }
        
        if (generatedImageUrls.length !== input.promptsWithContext.length) {
          throw new Error("Mismatch between number of prompts and generated images. Some images may have failed to generate.");
        }

        return { generatedImageUrls };
      }
    } catch (error) {
      console.error('Error in generateComicPanelFlow:', error);
      throw error; // Re-throw to let the calling code handle the error
    }
  }
);

