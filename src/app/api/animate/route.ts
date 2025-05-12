import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { put } from '@vercel/blob';

const execPromise = promisify(exec);
const tempDir = path.join(os.tmpdir(), 'animation-temp');

// Create temp directory if it doesn't exist
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Store file paths of generated videos
interface VideoInfo {
  filePath: string;
  blobUrl?: string;
  timestamp: number;
}

// In-memory cache of generated videos (in production, use a more persistent solution)
const generatedVideos = new Map<string, VideoInfo>();

// Clean up old videos periodically
setInterval(() => {
  const now = Date.now();
  for (const [jobId, info] of generatedVideos.entries()) {
    // Remove entries older than 1 hour
    if (now - info.timestamp > 3600000) {
      generatedVideos.delete(jobId);
    }
  }
}, 300000); // Clean every 5 minutes

// Function to upload video to Vercel Blob
async function uploadToBlob(filePath: string, jobId: string): Promise<string | null> {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return null;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const filename = `animated-video-${jobId}.mp4`;
    
    const blob = await put(filename, fileBuffer, {
      access: 'public',
      contentType: 'video/mp4',
    });

    console.log(`Video uploaded to Vercel Blob: ${blob.url}`);
    return blob.url;
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    const prompt = formData.get('prompt') as string || '[Pan right]A detailed scene';
    
    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Create unique file names
    const jobId = uuidv4();
    const imageExtension = imageFile.name.split('.').pop() || 'png';
    const imagePath = path.join(tempDir, `${jobId}.${imageExtension}`);
    const videoOutputPath = path.join(process.cwd(), `minimax_video_${jobId}.mp4`);
    
    // Save the uploaded image to disk
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    fs.writeFileSync(imagePath, imageBuffer);
    
    // Get the absolute path to the animate-img.py script
    const scriptPath = path.join(process.cwd(), 'src', 'app', 'api', 'animate', 'animate-img.py');
    
    // Execute the animation script
    const command = `python ${scriptPath} "${imagePath}" --prompt "${prompt}" --save_video --polling_interval 5`;
    
    // Start the process but don't wait for it to complete
    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error(`Animation process error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Animation stderr: ${stderr}`);
      }
      
      console.log(`Animation process stdout: ${stdout}`);
      
      // Look for file path in the output
      const filePathMatch = stdout.match(/Video saved to: (.+\.mp4)/);
      if (filePathMatch && filePathMatch[1]) {
        const filePath = filePathMatch[1];
        
        // Upload to Vercel Blob
        const blobUrl = await uploadToBlob(filePath, jobId);
        
        // Store the file path and blob URL for this job ID
        generatedVideos.set(jobId, {
          filePath,
          blobUrl: blobUrl || undefined,
          timestamp: Date.now()
        });
      }
      
      // Clean up the temporary image file
      try {
        fs.unlinkSync(imagePath);
      } catch (err) {
        console.error('Error cleaning up temp image:', err);
      }
    });
    
    // Return the job ID for polling
    return NextResponse.json({ 
      success: true, 
      message: 'Animation job started',
      jobId
    });
  } catch (error) {
    console.error('Animation API error:', error);
    return NextResponse.json(
      { error: 'Failed to process animation request' },
      { status: 500 }
    );
  }
}

// Endpoint to check the status of a job
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const jobId = url.searchParams.get('jobId');
  
  if (!jobId) {
    return NextResponse.json(
      { error: 'No job ID provided' },
      { status: 400 }
    );
  }
  
  // Check if we have the file path in our map
  const videoInfo = generatedVideos.get(jobId);
  if (videoInfo && videoInfo.filePath) {
    // If the video is already generated and we have the path
    if (fs.existsSync(videoInfo.filePath)) {
      // Return the video file data along with blob URL if available
      const videoBuffer = fs.readFileSync(videoInfo.filePath);
      const headers = new Headers();
      headers.set('Content-Type', 'video/mp4');
      headers.set('Content-Disposition', `attachment; filename="animated-${jobId.substring(0, 8)}.mp4"`);
      // Include the file path and blob URL in the response headers
      headers.set('X-File-Path', videoInfo.filePath);
      
      if (videoInfo.blobUrl) {
        headers.set('X-Blob-URL', videoInfo.blobUrl);
      }
      
      return new NextResponse(videoBuffer, {
        status: 200,
        headers
      });
    } else {
      // Path exists in our map but file doesn't exist
      return NextResponse.json({
        status: 'file_missing',
        message: 'Video file was generated but is no longer available locally',
        filePath: videoInfo.filePath,
        blobUrl: videoInfo.blobUrl
      });
    }
  }
  
  // Check if the video file exists in temp dir
  const videoPath = path.join(tempDir, `${jobId}.mp4`);
  
  if (fs.existsSync(videoPath)) {
    // Upload to Vercel Blob
    const blobUrl = await uploadToBlob(videoPath, jobId);
    
    // Create a unique public filename for the video
    const publicFilename = `animated-${jobId.substring(0, 8)}.mp4`;
    
    // Return the video file data
    const videoBuffer = fs.readFileSync(videoPath);
    const headers = new Headers();
    headers.set('Content-Type', 'video/mp4');
    headers.set('Content-Disposition', `attachment; filename="${publicFilename}"`);
    headers.set('X-File-Path', videoPath);
    
    if (blobUrl) {
      headers.set('X-Blob-URL', blobUrl);
    }
    
    // Store the file path and blob URL for future reference
    generatedVideos.set(jobId, {
      filePath: videoPath,
      blobUrl: blobUrl || undefined,
      timestamp: Date.now()
    });
    
    // Clean up the video file after sending
    try {
      setTimeout(() => {
        fs.unlinkSync(videoPath);
      }, 1000);
    } catch (err) {
      console.error('Error cleaning up temp video:', err);
    }
    
    return new NextResponse(videoBuffer, {
      status: 200,
      headers
    });
  }
  
  // Check in project root for minimax_video_[jobId].mp4
  const projectVideoPath = path.join(process.cwd(), `minimax_video_${jobId}.mp4`);
  if (fs.existsSync(projectVideoPath)) {
    // Upload to Vercel Blob
    const blobUrl = await uploadToBlob(projectVideoPath, jobId);
    
    // Store the file path and blob URL for future reference
    generatedVideos.set(jobId, {
      filePath: projectVideoPath,
      blobUrl: blobUrl || undefined,
      timestamp: Date.now()
    });
    
    return NextResponse.json({
      status: 'complete',
      message: 'Video generation is complete',
      filePath: projectVideoPath,
      blobUrl
    });
  }
  
  // Video is still processing
  return NextResponse.json({
    status: 'processing',
    message: 'Video is still being generated'
  });
} 