import { handleUpload } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const response = await handleUpload({
    request,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      // Optional: Validate user session here
      return {
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        tokenPayload: JSON.stringify({
          userId: 'user-1234', // You could use a real user ID here
        }),
      };
    },
    onUploadCompleted: async ({ blob, tokenPayload }) => {
      // Optional: Store metadata in your database
      console.log('Upload completed:', blob.url);
      try {
        const payload = JSON.parse(tokenPayload);
        console.log('User ID:', payload.userId);
      } catch (e) {
        // No-op
      }
    },
  });

  return response;
} 