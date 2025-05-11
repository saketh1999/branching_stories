'use server';
/**
 * @fileOverview Flow for regenerating a single comic image based on a new prompt and a context image.
 * Supports both Gemini and OpenAI (ChatGPT) models for image generation.
 * Uses Vercel Blob storage for persistently storing images.
 *
 * - regenerateSingleImage - A function that regenerates a single image.
 * - RegenerateSingleImageInput - The input type for the regenerateSingleImage function.
 * - RegenerateSingleImageOutput - The return type for the regenerateSingleImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import OpenAI from 'openai';
import { ModelChoice } from './suggest-comic-panel-prompt';
import { uploadImageToBlob, blobUrlToDataUri } from '@/lib/blob-storage';

// Constants
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const RegenerateSingleImageInputSchema = z.object({
  newPromptText: z.string().min(1, "Prompt text cannot be empty."),
  contextImageUrl: z.string().describe(
    "Data URI of an image to use as context for regeneration. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  modelChoice: z
    .enum(['gemini', 'chatgpt'])
    .default('gemini')
    .describe('The AI model to use for generation - either Gemini or ChatGPT'),
});
export type RegenerateSingleImageInput = z.infer<typeof RegenerateSingleImageInputSchema>;

const RegenerateSingleImageOutputSchema = z.object({
  generatedImageUrl: z
    .string()
    .describe(
      'URL for the regenerated image stored in Vercel Blob storage.'
    ),
});
export type RegenerateSingleImageOutput = z.infer<typeof RegenerateSingleImageOutputSchema>;

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

export async function regenerateSingleImage(input: RegenerateSingleImageInput): Promise<RegenerateSingleImageOutput> {
  return regenerateSingleImageFlow(input);
}

/**
 * Function to regenerate an image using OpenAI's DALL-E model
 */
async function regenerateImageWithOpenAI(input: RegenerateSingleImageInput): Promise<RegenerateSingleImageOutput> {
  try {
    // Verify API key exists
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key is missing. Please add OPENAI_API_KEY to your .env.local file.");
    }
    
    // Initialize the OpenAI client
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // First, ensure we have a data URI for the context image
    const imageDataUri = await ensureDataUri(input.contextImageUrl);
    
    // Extract the base64 data only after ensuring proper data URI format
    const imageBase64 = imageDataUri.split(',')[1];
    
    if (!imageBase64) {
      throw new Error("Invalid image data format. Could not extract base64 content.");
    }
    
    // Step 1: Get a detailed description of the image style and content
    const visionResponse = await openai.chat.completions.create({
      model: "dall-e-2",
      messages: [
        {
          role: "system",
          content: "You are a visual analysis assistant. Analyze the provided image and extract its visual style, characters, setting, and important elements. Be specific about the artistic style, coloring, and visual elements."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image in detail. Describe its style, characters, setting, and important visual elements. I'll be using your description to guide an image generation model."
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
      max_tokens: 500,
    });

    const imageAnalysis = visionResponse.choices[0]?.message.content || '';
    
    // Step 2: Use DALL-E to generate a new image based on the analysis and new prompt
    const dallePrompt = `${input.newPromptText}\n\nStyle reference: ${imageAnalysis}\n\nMaintain the same artistic style, character designs, and visual elements from the reference.`;
    
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: dallePrompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    });

    // Extract the base64 data
    const generatedImageBase64 = imageResponse.data?.[0]?.b64_json;
    
    if (!generatedImageBase64) {
      throw new Error("Failed to generate image with DALL-E");
    }
    
    // Convert to data URI format
    const generatedImageDataUri = `data:image/png;base64,${generatedImageBase64}`;
    
    // Upload to Vercel Blob storage with a descriptive filename
    const sanitizedPrompt = input.newPromptText.slice(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const blobUrl = await uploadImageToBlob(generatedImageDataUri, `regenerated_image_${sanitizedPrompt}_${Date.now()}.png`);
    
    return { generatedImageUrl: blobUrl };
  } catch (error) {
    console.error('Error regenerating image with OpenAI:', error);
    throw new Error(`Image regeneration failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const regenerateSingleImageFlow = ai.defineFlow(
  {
    name: 'regenerateSingleImageFlow',
    inputSchema: RegenerateSingleImageInputSchema,
    outputSchema: RegenerateSingleImageOutputSchema,
  },
  async (input) => {
    try {
      // Use OpenAI if specified, otherwise use Gemini
      if (input.modelChoice === 'chatgpt') {
        return await regenerateImageWithOpenAI(input);
      } else {
        // For Gemini, we need to ensure data URI format as well
        const processedContextImageUrl = await ensureDataUri(input.contextImageUrl);
        
        // Use Gemini model
        const { media } = await ai.generate({
          model: 'googleai/gemini-2.0-flash-exp',
          prompt: [ 
            { media: { url: processedContextImageUrl } },
            { text: `Regenerate an image based on the provided context image, adhering to the following new instructions: "${input.newPromptText}" Ensure the style and characters (if any) from the context image are maintained unless explicitly asked to change.` },
          ],
          config: {
            responseModalities: ['TEXT', 'IMAGE'], 
          },
        });
        
        if (!media || !media.url) {
          throw new Error("Image regeneration failed to return a URL.");
        }
        
        // Upload to Vercel Blob storage
        const sanitizedPrompt = input.newPromptText.slice(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const blobUrl = await uploadImageToBlob(media.url, `regenerated_image_${sanitizedPrompt}_${Date.now()}.png`);
        
        return { generatedImageUrl: blobUrl };
      }
    } catch (error) {
      console.error('Error in regenerateSingleImageFlow:', error);
      throw error; // Re-throw to let the calling code handle the error
    }
  }
);
