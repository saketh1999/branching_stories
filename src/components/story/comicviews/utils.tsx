/**
 * Utility components and functions for comic panel views
 */

import type { FC, KeyboardEvent, ReactElement } from 'react';
import { cloneElement, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCcw, Check, X, Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Helper function to determine if a URL is an external image
 */
export const isExternalImage = (url: string): boolean => {
  return (
    url.startsWith('https://') && 
    (url.includes('blob.vercel-storage.com') || 
     url.includes('amazonaws.com') || 
     url.includes('cloudinary.com') ||
     url.includes('picsum.photos'))
  );
};

/**
 * Props for the title editor component
 */
export interface TitleEditorProps {
  isEditing: boolean;
  value: string;
  onSubmit: () => void;
  onChange: (value: string) => void;
  onCancel: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  size?: 'small' | 'normal';
}

/**
 * TitleEditor Component
 */
export const TitleEditor: FC<TitleEditorProps> = ({ 
  isEditing, value, onSubmit, onChange, onCancel, onKeyDown, size = 'normal' 
}) => {
  if (!isEditing) return null;
  
  const isSmall = size === 'small';
  
  return (
    <div className={`flex-grow flex items-center gap-${isSmall ? '0.5 sm:gap-1' : '1'}`}>
      <Input 
        type="text" 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        onKeyDown={onKeyDown} 
        onBlur={onSubmit} 
        autoFocus 
        className={`${isSmall ? 'h-6 sm:h-7 text-[11px] sm:text-xs' : 'h-7 sm:h-8 text-sm'} w-full`}
      />
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onSubmit} 
        className={`${isSmall ? 'h-5 w-5 sm:h-6 sm:w-6' : 'h-6 w-6 sm:h-7 sm:w-7'} shrink-0`}
      >
        <Check className={`${isSmall ? 'h-3 w-3' : 'h-3.5 w-3.5 sm:h-4 sm:w-4'} text-green-500`} />
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onCancel} 
        className={`${isSmall ? 'h-5 w-5 sm:h-6 sm:w-6' : 'h-6 w-6 sm:h-7 sm:w-7'} shrink-0`}
      >
        <X className={`${isSmall ? 'h-3 w-3' : 'h-3.5 w-3.5 sm:h-4 sm:w-4'} text-red-500`} />
      </Button>
    </div>
  );
};

/**
 * TooltipButton Component
 */
export const TooltipButton: FC<{
  icon: React.ReactNode;
  tooltip: string;
  onClick?: () => void;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}> = ({ icon, tooltip, onClick, className, side = "top" }) => (
  <TooltipProvider>
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={onClick} className={className}>
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side={side}><p>{tooltip}</p></TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

/**
 * Props for the action button component
 */
export interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  onClick: () => void;
  size?: 'small' | 'normal';
  key?: string; // Added for lists of actions
}

/**
 * ActionButton Component
 */
export const ActionButton: FC<ActionButtonProps> = ({ icon, label, tooltip, onClick, size = 'normal' }) => {
  const isSmall = size === 'small';
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Button 
            onClick={onClick} 
            size="sm" 
            variant="outline" 
            className={cn(
                'text-xs sm:text-sm',
                isSmall && 'text-[10px] sm:text-xs px-1 py-0.5 h-5 sm:h-6'
            )}
          >
            {cloneElement(icon as ReactElement, { 
              className: cn('mr-1', isSmall ? 'h-2.5 w-2.5 sm:h-3 sm:w-3' : 'h-3 w-3 sm:h-4 sm:w-4')
            })}
            {label}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom"><p>{tooltip}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * Props for the image display component
 */
export interface ImageDisplayProps {
  url: string;
  alt: string;
  onClick: () => void;
  isExpanded?: boolean;
}

/**
 * ImageDisplay Component
 */
export const ImageDisplay: FC<ImageDisplayProps> = ({ url, alt, onClick, isExpanded }) => (
  <div 
    className={cn(
      "relative w-full overflow-hidden bg-muted-foreground/10 group cursor-pointer",
      isExpanded ? "h-auto aspect-video" : "h-full" 
    )}
    onClick={onClick} 
    title="Click to regenerate this image"
  >
    <Image 
      src={url} 
      alt={alt} 
      layout="fill" 
      objectFit="contain" 
      data-ai-hint="comic panel image" 
      className="transition-transform duration-300 ease-in-out group-hover:scale-105"
      sizes={isExpanded ? "clamp(260px, 80vw, 500px)" : "clamp(120px, 40vw, 250px)"}
      unoptimized={isExternalImage(url)}
    />
    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
      <RefreshCcw className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
    </div>
  </div>
);

/**
 * Props for the animated image display component
 */
export interface AnimatedImageDisplayProps extends ImageDisplayProps {
  prompt?: string;
}

/**
 * Converts an image URL to a base64 string
 */
const getBase64FromUrl = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    
    // Check for size limit - Minimax may have size limits
    if (blob.size > 10 * 1024 * 1024) { // 10MB limit as an example
      throw new Error('Image too large (>10MB). Please use a smaller image.');
    }
    
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};

/**
 * AnimatedImageDisplay Component
 * Extends ImageDisplay with animation functionality using Minimax.io API
 */
export const AnimatedImageDisplay: FC<AnimatedImageDisplayProps> = ({ url, alt, onClick, isExpanded, prompt }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnimateClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent onClick
    
    if (videoUrl) {
      // If already animated, just show the animation again
      setIsAnimating(true);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Get base64 from image URL
      const imageBase64 = await getBase64FromUrl(url);
      
      // Default animation prompt if none provided
      const animationPrompt = prompt ? `[Pan right]${prompt}` : '[Pan right]A detailed scene';
      
      // Call our API endpoint
      const response = await fetch('/api/animate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          prompt: animationPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = errorData.details ? 
          `${errorData.error}: ${JSON.stringify(errorData.details)}` : 
          errorData.error || 'Failed to animate image';
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (!data.video_url) {
        throw new Error('No video URL returned from API');
      }
      
      setVideoUrl(data.video_url);
      setIsAnimating(true);
    } catch (err) {
      console.error('Error animating image:', err);
      setError(err instanceof Error ? err.message : 'Failed to animate image');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className={cn(
        "relative w-full overflow-hidden bg-muted-foreground/10",
        isExpanded ? "h-auto aspect-video" : "h-full" 
      )}
    >
      {videoUrl && isAnimating ? (
        <div className="w-full h-full bg-black">
          <video 
            src={videoUrl} 
            className="w-full h-full object-contain" 
            controls 
            autoPlay 
            onEnded={() => setIsAnimating(false)} 
            onError={() => {
              setError('Failed to load video. The URL may be invalid.');
              setIsAnimating(false);
            }}
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsAnimating(false)}
            className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white"
          >
            Close Video
          </Button>
        </div>
      ) : (
        <>
          <div className="group cursor-pointer" onClick={onClick}>
            <Image 
              src={url} 
              alt={alt} 
              layout="fill" 
              objectFit="contain" 
              data-ai-hint="comic panel image" 
              className="transition-transform duration-300 ease-in-out group-hover:scale-105"
              sizes={isExpanded ? "clamp(260px, 80vw, 500px)" : "clamp(120px, 40vw, 250px)"}
              unoptimized={isExternalImage(url)}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <RefreshCcw className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
            </div>
          </div>

          {/* Animation button */}
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleAnimateClick} 
                  disabled={isLoading}
                  className="absolute bottom-2 right-2 shadow-md"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-1" />
                  )}
                  {isLoading ? "Processing..." : videoUrl ? "Play Animation" : "Animate"}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>
                  {isLoading 
                    ? "Converting image and generating animation..." 
                    : videoUrl 
                      ? "Play generated animation" 
                      : "Generate animation from this image"
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {error && (
            <div className="absolute bottom-12 right-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs overflow-auto max-h-24">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}; 