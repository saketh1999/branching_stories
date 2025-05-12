'use server'

import { put, del, list, head } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads an image to Vercel Blob storage and returns the URL
 * @param imageDataUri The image as a data URI (format: data:image/png;base64,...)
 * @param filename Optional filename, defaults to a UUID
 * @returns The URL of the stored blob
 */
export async function uploadImageToBlob(imageDataUri: string, filename?: string): Promise<string> {
  try {
    // Safety check: if the data URI is extremely large, compress it or return it as-is
    if (imageDataUri.length > 10 * 1024 * 1024) { // 10MB limit
      console.warn("Image is too large for Blob storage, skipping upload");
      return imageDataUri; // Return original data URI if it's too large
    }

    // Extract the mimetype and base64 data
    const matches = imageDataUri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid data URI format');
    }
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    
    // Verify base64 string isn't corrupted
    if (base64Data.length % 4 !== 0) {
      console.warn("Base64 data is not properly padded, skipping upload");
      return imageDataUri;
    }
    
    // Create buffer from base64 with error handling
    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64Data, 'base64');
      
      // Sanity check: if buffer is empty or too small, it's likely invalid data
      if (buffer.length < 100) {
        console.warn("Resulting buffer is suspiciously small, skipping upload");
        return imageDataUri;
      }
    } catch (error) {
      console.error("Failed to create buffer from base64 data:", error);
      return imageDataUri;
    }
    
    // Determine file extension based on mimetype
    let extension = 'png'; // Default
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
      extension = 'jpg';
    } else if (mimeType.includes('png')) {
      extension = 'png';
    } else if (mimeType.includes('gif')) {
      extension = 'gif';
    } else if (mimeType.includes('webp')) {
      extension = 'webp';
    }
    
    // Generate filename if not provided
    const blobFilename = filename || `${uuidv4()}.${extension}`;
    
    // Upload to Vercel Blob with timeout
    const uploadPromise = put(blobFilename, buffer, {
      contentType: mimeType,
      access: 'public',
    });
    
    // Add a timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Upload timed out after 10 seconds")), 10000);
    });
    
    // Use Promise.race to implement timeout
    const blob = await Promise.race([uploadPromise, timeoutPromise]);
    
    return blob.url;
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    // Return the original data URI as a fallback
    return imageDataUri;
  }
}

/**
 * Converts a Blob URL back to a Data URI for compatibility with existing code
 * @param blobUrl The URL of the blob to fetch
 * @returns A Promise that resolves to the data URI
 */
export async function blobUrlToDataUri(blobUrl: string): Promise<string> {
  try {
    // Server-side implementation without FileReader (which is browser-only)
    const response = await fetch(blobUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    
    // Get content type from response headers or default to image/png
    const contentType = response.headers.get('content-type') || 'image/png';
    
    // Construct the data URI
    return `data:${contentType};base64,${base64Data}`;
  } catch (error) {
    console.error('Error converting blob URL to data URI:', error);
    throw new Error(`Failed to convert blob URL: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Deletes an image from Vercel Blob storage
 * @param blobUrl The URL of the blob to delete
 * @returns A Promise that resolves when the blob is deleted
 */
export async function deleteImageFromBlob(blobUrl: string): Promise<void> {
  try {
    // Extract the filename from the URL
    const url = new URL(blobUrl);
    const pathname = url.pathname;
    const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
    
    await del(filename);
  } catch (error) {
    console.error('Error deleting from Vercel Blob:', error);
    throw new Error(`Failed to delete image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Lists all images in the Vercel Blob storage
 * @param prefix Optional prefix to filter by
 * @returns A Promise that resolves to the list of blobs
 */
export async function listImagesFromBlob(prefix?: string) {
  try {
    return await list({ prefix });
  } catch (error) {
    console.error('Error listing images from Vercel Blob:', error);
    throw new Error(`Failed to list images: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Uploads an image (data URI or file) to Vercel Blob storage
 */
export async function uploadToVercelBlob(imageData: string, filename: string): Promise<string> {
  try {
    // Convert data URI to blob
    const res = await fetch(imageData);
    const blob = await res.blob();
    
    // Upload to Vercel Blob
    const { url } = await put(filename, blob, {
      access: 'public',
      handleUploadUrl: '/api/blob-upload', // API route to handle uploads
    });
    
    return url;
  } catch (error) {
    console.error("Error uploading to Vercel Blob:", error);
    // For development fallback, create an Object URL
    try {
      const res = await fetch(imageData);
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch {
      return imageData; // Return original if all else fails
    }
  }
} 