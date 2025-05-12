"use client";

import dynamic from 'next/dynamic';

// Dynamically import the BlobGallery component with no SSR
const BlobGallery = dynamic(() => import('./BlobGallery'), { ssr: false });

export default function BlobGalleryWrapper() {
  return <BlobGallery />;
} 