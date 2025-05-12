"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

interface BlobImage {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export default function BlobGallery() {
  const [isOpen, setIsOpen] = useState(false);
  const [images, setImages] = useState<BlobImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = async () => {
    setLoading(true);
    setError(null);
    console.log("BlobGallery: Fetching images...");
    try {
      const response = await fetch('/api/blob-list');
      console.log("BlobGallery: API Response Status:", response.status);
      if (!response.ok) {
         const errorText = await response.text();
         console.error("BlobGallery: API Error Response:", errorText);
         throw new Error(`Failed to fetch images (${response.status})`);
      }
      
      const data = await response.json();
      console.log("BlobGallery: Received data:", data);

      const imageBlobs = data.blobs.filter((blob: BlobImage) => 
        blob.contentType?.startsWith('image/'));
      console.log("BlobGallery: Setting images state with:", imageBlobs);
      setImages(imageBlobs);

    } catch (err: any) {
      console.error('BlobGallery: Error fetching blob images:', err);
      setError(err.message || 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchImages();
    }
  }, [isOpen]);

  const togglePanel = () => {
    setIsOpen(!isOpen);
    if (!isOpen) fetchImages();
  };

  // Calculate human-readable file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Format date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className={`fixed top-16 left-0 h-[calc(100vh-4rem)] z-40 transition-all duration-300 ease-in-out flex ${isOpen ? 'translate-x-0' : 'translate-x-[calc(-100%+2.5rem)]'}`}>
      {/* Toggle button */}
      <Button
        variant="outline"
        size="icon"
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full h-20 w-10 rounded-r-md rounded-l-none border-l-0 bg-background"
        onClick={togglePanel}
        aria-label={isOpen ? "Close gallery" : "Open gallery"}
      >
        {isOpen ? 
          <ChevronLeft className="h-4 w-4" /> : 
          <><ImageIcon className="h-4 w-4 mb-1" /> <ChevronRight className="h-4 w-4" /></>
        }
      </Button>

      {/* Main panel */}
      <div className="bg-card border-r border-border shadow-lg w-80 sm:w-96 flex flex-col">
        <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
          <h3 className="font-medium">Blob Storage Gallery</h3>
          <Button size="sm" variant="ghost" onClick={fetchImages} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        <ScrollArea className="flex-1 p-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Loading images...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-40">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={fetchImages}>
                Try Again
              </Button>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40">
              <p className="text-sm text-muted-foreground">No images found in blob storage</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {images.map((image) => (
                <div 
                  key={image.url} 
                  className="group border rounded-md overflow-hidden flex flex-col bg-card hover:border-primary/50 transition-colors"
                >
                  <div className="aspect-square relative overflow-hidden bg-muted">
                    <img 
                      src={image.url} 
                      alt={image.pathname.split('/').pop() || 'Image'} 
                      className="object-cover w-full h-full hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-2 text-xs flex flex-col">
                    <p className="truncate text-muted-foreground" title={image.pathname.split('/').pop()}>
                      {image.pathname.split('/').pop()?.substring(0, 15)}...
                    </p>
                    <p className="text-muted-foreground/80">{formatFileSize(image.size)}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] text-muted-foreground/60">{formatDate(image.uploadedAt)}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={() => window.open(image.url, '_blank')}
                      >
                        <ImageIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
} 