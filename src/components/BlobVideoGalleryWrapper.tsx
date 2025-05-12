"use client";

import dynamic from 'next/dynamic';

// Dynamically import the BlobVideoGallery component with no SSR
const BlobVideoGallery = dynamic(() => import('./BlobVideoGallery'), { ssr: false });

export default function BlobVideoGalleryWrapper() {
  return <BlobVideoGallery />;
} 