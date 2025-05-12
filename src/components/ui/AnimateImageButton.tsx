"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Loader2, AlertCircle, Download, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AnimateImageButtonProps {
  imageUrl: string;
  prompt?: string;
  className?: string;
  onVideoGenerated?: (blobUrl: string) => void;
}

export const AnimateImageButton: React.FC<AnimateImageButtonProps> = ({
  imageUrl,
  prompt = '[Pan right]A detailed scene',
  className = '',
  onVideoGenerated,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [localFilePath, setLocalFilePath] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState(prompt);
  const { toast } = useToast();
  
  const handleAnimateImage = async () => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      setError(null);
      setVideoUrl(null);
      setBlobUrl(null);
      setLocalFilePath(null);
      
      // Convert data URL to blob
      let imageBlob: Blob;
      if (imageUrl.startsWith('data:')) {
        const response = await fetch(imageUrl);
        imageBlob = await response.blob();
      } else {
        // Fetch from URL if not a data URL
        const response = await fetch(imageUrl);
        imageBlob = await response.blob();
      }
      
      // Create form data
      const formData = new FormData();
      formData.append('image', imageBlob, 'image.png');
      formData.append('prompt', currentPrompt);
      
      // Start the animation job
      const response = await fetch('/api/animate', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start animation');
      }
      
      const data = await response.json();
      const jobId = data.jobId;
      
      // Poll for job completion
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/animate?jobId=${jobId}`);
          
          // If the response is a video file
          if (statusResponse.headers.get('Content-Type')?.includes('video/mp4')) {
            clearInterval(pollInterval);
            const videoBlob = await statusResponse.blob();
            const url = URL.createObjectURL(videoBlob);
            setVideoUrl(url);
            setIsLoading(false);
            
            // Check if metadata contains file path
            const filePathHeader = statusResponse.headers.get('X-File-Path');
            if (filePathHeader) {
              setLocalFilePath(filePathHeader);
            }
            
            // Get blob URL if available
            const blobUrlHeader = statusResponse.headers.get('X-Blob-URL');
            if (blobUrlHeader) {
              setBlobUrl(blobUrlHeader);
              // Call the callback if provided
              if (onVideoGenerated) {
                onVideoGenerated(blobUrlHeader);
              }
            }
            
            toast({
              title: 'Animation Complete',
              description: 'Your animated video is ready to play!',
            });
            return;
          }
          
          // If it's JSON, the video is still processing
          const statusData = await statusResponse.json();
          if (statusData.status === 'processing') {
            // Still processing, continue polling
          } else if (statusData.error) {
            throw new Error(statusData.error);
          } else if (statusData.filePath) {
            // Server-side processing complete with file path
            clearInterval(pollInterval);
            setLocalFilePath(statusData.filePath);
            
            if (statusData.blobUrl) {
              setBlobUrl(statusData.blobUrl);
              // Call the callback if provided
              if (onVideoGenerated) {
                onVideoGenerated(statusData.blobUrl);
              }
            }
            
            setIsLoading(false);
            toast({
              title: 'Animation Complete',
              description: 'Your animated video has been saved!',
            });
          }
        } catch (err) {
          clearInterval(pollInterval);
          setError((err as Error).message || 'Failed to check animation status');
          setIsLoading(false);
          toast({
            title: 'Animation Failed',
            description: (err as Error).message || 'Failed to generate animation',
            variant: 'destructive',
          });
        }
      }, 5000); // Poll every 5 seconds
      
    } catch (err) {
      setError((err as Error).message || 'Failed to animate image');
      setIsLoading(false);
      toast({
        title: 'Animation Failed',
        description: (err as Error).message || 'Failed to start animation process',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className={`flex flex-col space-y-4 ${className}`}>
      {/* Prompt Input */}
      <div className="space-y-2">
        <Label htmlFor="animation-prompt">Animation Prompt</Label>
        <div className="flex gap-2">
          <Input 
            id="animation-prompt"
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            placeholder="[Pan right] A detailed scene"
            disabled={isLoading || !!videoUrl}
            className="flex-grow"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Use [Pan right], [Pan left], [Zoom in], [Zoom out] to control camera movement
        </p>
      </div>
      
      {/* Animation Button */}
      {!videoUrl && !localFilePath && (
        <Button 
          onClick={handleAnimateImage} 
          disabled={isLoading}
          variant="default"
          size="sm"
          className="flex items-center gap-1 w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Animating...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span>Animate</span>
            </>
          )}
        </Button>
      )}
      
      {/* Video Player */}
      {videoUrl && (
        <div className="space-y-2">
          <video 
            src={videoUrl} 
            controls 
            autoPlay 
            loop 
            className="max-w-full rounded-md"
            style={{ maxHeight: '400px' }}
          >
            Your browser does not support the video tag.
          </video>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const a = document.createElement('a');
                a.href = videoUrl;
                a.download = 'animated-comic-panel.mp4';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              className="flex items-center gap-1 flex-1"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </Button>
            
            {blobUrl && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(blobUrl, '_blank')}
                className="flex items-center gap-1 flex-1"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Open Blob</span>
              </Button>
            )}
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setVideoUrl(null);
                setCurrentPrompt(prompt);
              }}
              className="flex-1"
            >
              Create New
            </Button>
          </div>
        </div>
      )}
      
      {/* Local File Path Display */}
      {localFilePath && !videoUrl && (
        <div className="p-3 bg-muted rounded-md text-sm break-all">
          <p className="font-medium mb-1">Video saved to:</p>
          <p className="mb-2 text-xs">{localFilePath}</p>
          
          {blobUrl && (
            <div className="mb-2">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => window.open(blobUrl, '_blank')}
                className="flex items-center gap-1 w-full mb-2"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Open Video in Browser</span>
              </Button>
            </div>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setLocalFilePath(null);
              setCurrentPrompt(prompt);
            }}
            className="w-full"
          >
            Create New Animation
          </Button>
        </div>
      )}
      
      {/* Error Display */}
      {error && !isLoading && (
        <div className="text-destructive text-sm flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default AnimateImageButton; 