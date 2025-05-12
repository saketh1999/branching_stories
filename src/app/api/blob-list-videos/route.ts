import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function GET() {
  // Ensure the token is available, especially for local dev
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN is not set.");
    return NextResponse.json({ error: 'Server configuration error: Missing Blob token.' }, { status: 500 });
  }

  try {
    console.log("Fetching all blobs for videos...");
    const { blobs } = await list();
    console.log(`Fetched ${blobs.length} total blobs for videos.`); // Log total count
    
    // Log all content types to debug
    console.log("Sample content types:", blobs.slice(0, 10).map(b => b.contentType));

    // Filter for videos: check both content type and file extension
    const videoBlobs = blobs.filter(blob => {
      // Check for video/mp4 content type
      const hasVideoContentType = blob.contentType === 'video/mp4';
      
      // Also check file extension as a fallback
      const pathname = blob.pathname.toLowerCase();
      const hasVideoExtension = pathname.endsWith('.mp4') || 
                               pathname.endsWith('.mov') || 
                               pathname.endsWith('.avi') || 
                               pathname.endsWith('.webm');
      
      return hasVideoContentType || hasVideoExtension;
    });
    
    console.log(`Filtered down to ${videoBlobs.length} video blobs.`); // Log filtered count
    
    if (videoBlobs.length > 0) {
      console.log("Sample video blob paths:", videoBlobs.slice(0, 5).map(b => b.pathname)); // Log sample paths
    }

    return NextResponse.json({ blobs: videoBlobs });
  } catch (error: any) {
    console.error('Error fetching video blobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos', details: error.message },
      { status: 500 }
    );
  }
} 