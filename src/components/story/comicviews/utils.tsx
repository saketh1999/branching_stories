/**
 * Utility components and functions for comic panel views
 */

import type { FC, KeyboardEvent, ReactElement } from 'react';
import { cloneElement } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCcw, Check, X } from 'lucide-react';
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