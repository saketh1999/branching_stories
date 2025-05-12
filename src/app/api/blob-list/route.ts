import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function GET() {
  // Ensure the token is available, especially for local dev
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
     console.error("BLOB_READ_WRITE_TOKEN is not set.");
     return NextResponse.json({ error: 'Server configuration error: Missing Blob token.' }, { status: 500 });
  }

  try {
    console.log("Fetching all blobs...");
    const { blobs, cursor, hasMore } = await list({
       // You can add options like limit, prefix, cursor if needed
       // limit: 100, 
    });
    console.log(`Fetched ${blobs.length} total blobs.`); // Log total count

    // Filter for images
    const imageBlobs = blobs.filter((blob) => 
      blob.contentType?.startsWith('image/')
    );
    console.log(`Filtered down to ${imageBlobs.length} image blobs.`); // Log filtered count
    console.log("Sample image blob contentTypes:", imageBlobs.slice(0, 5).map(b => b.contentType)); // Log sample types

    return NextResponse.json({ blobs: imageBlobs });
  } catch (error: any) {
    console.error('Error fetching image blobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images', details: error.message },
      { status: 500 }
    );
  }
} 