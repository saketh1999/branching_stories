"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ChevronLeft, ChevronRight, Video } from 'lucide-react'; // Changed icon

interface BlobVideo {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

// Create a global store for video gallery state
export const VideoGalleryState = {
  isOpen: false,
  toggle: () => {},
  setIsOpen: (state: boolean) => {}
};

export default function BlobVideoGallery() {
  const [isOpen, setIsOpen] = useState(false);
  const [videos, setVideos] = useState<BlobVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the global state with the functions to control this component
  useEffect(() => {
    VideoGalleryState.toggle = togglePanel;
    VideoGalleryState.setIsOpen = (state: boolean) => {
      setIsOpen(state);
      if (state && videos.length === 0) {
        fetchVideos();
      }
    };
    
    return () => {
      // Clean up on unmount
      VideoGalleryState.toggle = () => {};
      VideoGalleryState.setIsOpen = () => {};
    };
  }, [videos.length]);

  // Update the external state when the internal state changes
  useEffect(() => {
    VideoGalleryState.isOpen = isOpen;
  }, [isOpen]);

  const fetchVideos = async () => {
    setLoading(true);
    setError(null);
    console.log("BlobVideoGallery: Fetching videos...");
    try {
      const response = await fetch('/api/blob-list-videos');
      console.log("BlobVideoGallery: API Response Status:", response.status);
      if (!response.ok) {
         const errorText = await response.text();
         console.error("BlobVideoGallery: API Error Response:", errorText);
         throw new Error(`Failed to fetch videos (${response.status})`);
      }
      
      const data = await response.json();
      console.log("BlobVideoGallery: Received data:", data);

      // No need to filter again if API does it, but log anyway
      console.log("BlobVideoGallery: Setting videos state with:", data.blobs);
      setVideos(data.blobs);

    } catch (err: any) {
      console.error('BlobVideoGallery: Error fetching blob videos:', err);
      setError(err.message || 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const togglePanel = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (newState && videos.length === 0) { // Fetch only if opening and empty
        fetchVideos();
    }
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
    // Changed right-0 to left-0, adjusted translate-x
    <div className={`fixed top-[calc(50%+1rem)] left-0 h-[calc(50vh-3rem)] z-40 transition-all duration-300 ease-in-out flex ${isOpen ? 'translate-x-0' : 'translate-x-[calc(-100%+2.5rem)]'}`}>
      {/* Toggle button - Changed positioning and icon direction */}
      <Button
        variant="outline"
        size="icon"
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full h-20 w-10 rounded-r-md rounded-l-none border-l-0 bg-background" // Changed left-0 to right-0, -translate-x-full to translate-x-full, rounding, border
        onClick={togglePanel}
        aria-label={isOpen ? "Close video gallery" : "Open video gallery"}
      >
        {isOpen ? 
          <ChevronLeft className="h-4 w-4" /> : // Flipped icons
          <><Video className="h-4 w-4 mb-1" /> <ChevronRight className="h-4 w-4" /></> // Flipped icons
        }
      </Button>

      {/* Main panel - Changed border-l to border-r */}
      <div className="bg-card border-r border-t border-border shadow-lg w-80 sm:w-96 flex flex-col"> 
        <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
          <h3 className="font-medium">Video Storage Gallery</h3>
          <Button size="sm" variant="ghost" onClick={fetchVideos} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        <ScrollArea className="flex-1 p-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Loading videos...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-40">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={fetchVideos}>
                Try Again
              </Button>
            </div>
          ) : videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40">
              <p className="text-sm text-muted-foreground text-center">No MP4 videos found in storage.</p>
              <p className="text-xs text-muted-foreground/70 mt-1 text-center">Upload videos with content type 'video/mp4' to see them here.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={fetchVideos}>
                Check Again
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {videos.map((video) => (
                <div 
                  key={video.url} 
                  className="border rounded-md overflow-hidden flex flex-col bg-card p-2"
                >
                  <video 
                    controls 
                    preload="metadata" // Load only metadata initially
                    className="w-full aspect-video rounded bg-black"
                  >
                    <source src={video.url} type={video.contentType} />
                    Your browser does not support the video tag.
                  </video>
                  <div className="mt-2 text-xs flex flex-col">
                    <p className="truncate text-muted-foreground font-medium" title={video.pathname.split('/').pop()}>
                      {video.pathname.split('/').pop() || 'Video File'}
                    </p>
                    <p className="text-muted-foreground/80">{formatFileSize(video.size)}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{formatDate(video.uploadedAt)}</p>
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