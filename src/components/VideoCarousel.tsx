"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Video, X, ArrowLeft, ArrowRight } from 'lucide-react';

interface BlobVideo {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export default function VideoCarousel() {
  const [isOpen, setIsOpen] = useState(true);
  const [videos, setVideos] = useState<BlobVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  const fetchVideos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/blob-list-videos');
      if (!response.ok) {
         const errorText = await response.text();
         throw new Error(`Failed to fetch videos (${response.status})`);
      }
      
      const data = await response.json();
      setVideos(data.blobs);
      setCurrentVideoIndex(0);
    } catch (err: any) {
      console.error('Error fetching videos:', err);
      setError(err.message || 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const togglePanel = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (newState && videos.length === 0) {
      fetchVideos();
    }
  };

  const nextVideo = () => {
    if (videos.length > 1) {
      setCurrentVideoIndex((prev) => (prev + 1) % videos.length);
    }
  };

  const prevVideo = () => {
    if (videos.length > 1) {
      setCurrentVideoIndex((prev) => (prev - 1 + videos.length) % videos.length);
    }
  };

  // Format file size
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

  const getVideoName = (pathname: string): string => {
    return pathname.split('/').pop() || 'Video';
  };

  return (
    <div className={`fixed left-0 top-16 h-[calc(100vh-4rem)] z-30 transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-[-100%]'}`}>
      {/* Toggle button */}
      <Button
        variant="outline"
        size="icon"
        className="absolute right-0 top-6 translate-x-full h-16 w-8 rounded-r-md rounded-l-none border-l-0 bg-background"
        onClick={togglePanel}
        aria-label={isOpen ? "Close videos" : "Open videos"}
      >
        {isOpen ? 
          <ChevronLeft className="h-4 w-4" /> : 
          <Video className="h-4 w-4" />
        }
      </Button>

      {/* Main panel */}
      <div className="bg-card border-r border-t border-border shadow-lg w-72 sm:w-80 h-full flex flex-col">
        <div className="p-3 border-b bg-card flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            <h3 className="font-medium">Video Gallery</h3>
          </div>
          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0"
              onClick={fetchVideos}
              disabled={loading}
            >
              {loading ? 
                <div className="h-4 w-4 border-t-2 border-primary rounded-full animate-spin" /> : 
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
              }
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-10 h-10 border-t-2 border-primary rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-medium">Loading videos...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <Video className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-sm text-destructive font-medium text-center mb-2">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchVideos}>
                Try Again
              </Button>
            </div>
          ) : videos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
                <Video className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium text-center mb-1">No videos found</p>
              <p className="text-xs text-muted-foreground text-center mb-4">
                Upload videos with content type 'video/mp4' to see them here.
              </p>
              <Button variant="outline" size="sm" onClick={fetchVideos}>
                Refresh
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="relative aspect-video bg-black">
                <video
                  key={videos[currentVideoIndex].url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                >
                  <source src={videos[currentVideoIndex].url} type={videos[currentVideoIndex].contentType} />
                  Your browser does not support the video tag.
                </video>
                {videos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40"
                      onClick={prevVideo}
                    >
                      <ArrowLeft className="h-4 w-4 text-white" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40"
                      onClick={nextVideo}
                    >
                      <ArrowRight className="h-4 w-4 text-white" />
                    </Button>
                  </>
                )}
              </div>
              
              <div className="p-3 border-t">
                <h4 className="font-medium text-sm truncate" title={getVideoName(videos[currentVideoIndex].pathname)}>
                  {getVideoName(videos[currentVideoIndex].pathname)}
                </h4>
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>{formatFileSize(videos[currentVideoIndex].size)}</span>
                  <span>{formatDate(videos[currentVideoIndex].uploadedAt)}</span>
                </div>
              </div>
              
              {videos.length > 1 && (
                <div className="p-3 pt-0">
                  <p className="text-xs text-center text-muted-foreground">
                    {currentVideoIndex + 1} of {videos.length} videos
                  </p>
                </div>
              )}
              
              <ScrollArea className="flex-1 border-t">
                <div className="p-3 grid grid-cols-2 gap-2">
                  {videos.map((video, index) => (
                    <div 
                      key={video.url}
                      className={`
                        relative aspect-video rounded overflow-hidden cursor-pointer border-2
                        ${index === currentVideoIndex ? 'border-primary' : 'border-transparent'} 
                        hover:border-primary/60 transition-colors
                      `}
                      onClick={() => setCurrentVideoIndex(index)}
                    >
                      <video className="w-full h-full object-cover">
                        <source src={video.url + '#t=0.1'} type={video.contentType} />
                      </video>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 