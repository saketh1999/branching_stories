"use client";

import React, { FC, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Check, X, Sparkles, GitFork, FileImage, Edit2, BookText, Info, Maximize2, Minimize2, Video } from 'lucide-react';
import type { ComicPanelData } from '@/types/story';
import PanelAnimationButton from './PanelAnimationButton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

// Add a panel animations map to store blob URLs
const panelAnimations = new Map<string, string>();

// Types for views
interface RegularPanelViewProps {
  panel: ComicPanelData;
  displayTitle: string;
  isEditingTitle: boolean;
  editingTitleValue: string;
  setEditingTitleValue: (value: string) => void;
  setIsEditingTitle: (isEditing: boolean) => void;
  handleTitleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleTitleEditSubmit: () => void;
  defaultTitleValue: string;
  descriptionContent: React.ReactNode;
  onRegenerateImage: (panelId: string, imageIndex: number, imageUrl: string, originalPrompt?: string) => void;
  onGenerateNext: (panelId: string) => void;
  onBranch: (panelId: string) => void;
  onEditPanel: (panelId: string) => void;
}

interface ComicBookPageViewProps {
  panel: ComicPanelData;
  displayTitle: string;
  isEditingTitle: boolean;
  editingTitleValue: string;
  setEditingTitleValue: (value: string) => void;
  setIsEditingTitle: (isEditing: boolean) => void;
  handleTitleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleTitleEditSubmit: () => void;
  defaultTitleValue: string;
  onRegenerateImage: (panelId: string, imageIndex: number, imageUrl: string, originalPrompt?: string) => void;
  onBranch: (panelId: string) => void;
  onEditPanel: (panelId: string) => void;
}

interface GroupNodeViewProps {
  panel: ComicPanelData;
  allPanels: ComicPanelData[];
  displayTitle: string;
  isEditingTitle: boolean;
  editingTitleValue: string;
  setEditingTitleValue: (value: string) => void;
  setIsEditingTitle: (isEditing: boolean) => void;
  handleTitleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleTitleEditSubmit: () => void;
  defaultTitleValue: string;
  descriptionContent: React.ReactNode;
  onGenerateNext: (panelId: string) => void;
  onBranch: (panelId: string) => void;
  onSelectPage?: (pageId: string) => void;
}

// Helper components
const TooltipButton: FC<{
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

// Regular panel view
export const RegularPanelView: FC<RegularPanelViewProps> = ({
  panel,
  displayTitle,
  isEditingTitle,
  editingTitleValue,
  setEditingTitleValue,
  setIsEditingTitle,
  handleTitleKeyDown,
  handleTitleEditSubmit,
  defaultTitleValue,
  descriptionContent,
  onRegenerateImage,
  onGenerateNext,
  onBranch,
  onEditPanel
}) => {
  const [showDescription, setShowDescription] = useState(false);
  const [hasAnimation, setHasAnimation] = useState(panelAnimations.has(panel.id));
  
  // Handle when a video is generated
  const handleVideoGenerated = (blobUrl: string) => {
    panelAnimations.set(panel.id, blobUrl);
    setHasAnimation(true);
  };
  
  // ImagePreview component with animation button
  const ImagePreview = ({ imageUrl, index, prompt }: { imageUrl: string, index: number, prompt?: string }) => (
    <div className="relative">
      <div 
        className="w-full overflow-hidden bg-muted-foreground/5 cursor-pointer aspect-[4/3] relative group"
        onClick={() => onRegenerateImage(panel.id, index, imageUrl, prompt)} 
        title="Click to regenerate this image"
      >
        <img 
          src={imageUrl} 
          alt={`Panel image ${index + 1}`} 
          className="w-full h-full object-contain transition-all duration-300 ease-in-out group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <RefreshCcw className="w-6 h-6 text-primary" />
        </div>
      </div>
      <PanelAnimationButton 
        imageUrl={imageUrl}
        panelTitle={displayTitle}
        promptText={prompt}
        onVideoGenerated={handleVideoGenerated}
      />
    </div>
  );
  
  return (
    <Card className="w-full h-full border rounded-md overflow-hidden bg-background flex flex-col">
      <CardHeader className="p-2 sm:p-3 border-b">
        <div className="flex items-center justify-between">
          {isEditingTitle ? (
            <div className="flex-grow flex items-center gap-1">
              <input 
                type="text" 
                value={editingTitleValue} 
                onChange={(e) => setEditingTitleValue(e.target.value)} 
                onKeyDown={handleTitleKeyDown} 
                onBlur={handleTitleEditSubmit} 
                autoFocus 
                className="h-7 sm:h-8 flex-grow text-sm rounded-md px-2 border" 
              />
              <Button variant="ghost" size="icon" onClick={handleTitleEditSubmit} className="h-7 w-7 sm:h-8 sm:w-8">
                <Check className="h-4 w-4 text-green-500" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => {
                setIsEditingTitle(false);
                setEditingTitleValue(defaultTitleValue);
              }} className="h-7 w-7 sm:h-8 sm:w-8">
                <X className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ) : (
            <>
              <CardTitle className="text-sm sm:text-base md:text-lg font-semibold text-primary truncate cursor-pointer hover:underline flex-grow" title={`Click to edit: ${displayTitle}`} onClick={() => setIsEditingTitle(true)}>
                {displayTitle}
              </CardTitle>
              <div className="flex items-center gap-1">
                <TooltipButton
                  icon={<Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />}
                  tooltip={showDescription ? "Hide Details" : "Show Details"}
                  onClick={() => setShowDescription(!showDescription)}
                />
                <TooltipButton
                  icon={<Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />}
                  tooltip="Edit Panel"
                  onClick={() => onEditPanel(panel.id)}
                />
              </div>
            </>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-2 sm:p-3 flex-1 overflow-hidden flex flex-col gap-2">
        {/* Show either description or image grid */}
        {showDescription ? (
          <div className="h-full bg-accent/5 p-2 sm:p-3 rounded-md overflow-y-auto">
            {descriptionContent}
          </div>
        ) : (
          <div className={`grid ${panel.imageUrls.length > 1 ? 'grid-cols-2 gap-2' : ''} h-full`}>
            {panel.imageUrls.map((url, index) => (
              <ImagePreview 
                key={index} 
                imageUrl={url} 
                index={index} 
                prompt={panel.promptsUsed?.[index]} 
              />
            ))}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-2 sm:p-3 border-t grid grid-cols-3 gap-2">
        <Button 
          onClick={() => onGenerateNext(panel.id)} 
          size="sm" 
          variant="outline"
          className="text-xs sm:text-sm"
        >
          <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
          Continue
        </Button>
        <Button 
          onClick={() => onBranch(panel.id)} 
          size="sm" 
          variant="outline"
          className="text-xs sm:text-sm"
        >
          <GitFork className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
          Branch
        </Button>
        {hasAnimation && (
          <Button 
            onClick={() => window.open(panelAnimations.get(panel.id), '_blank')}
            size="sm" 
            variant="outline"
            className="text-xs sm:text-sm"
          >
            <Video className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
            Video
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

// Comic book page view
export const ComicBookPageView: FC<ComicBookPageViewProps> = ({
  panel,
  displayTitle,
  isEditingTitle,
  editingTitleValue,
  setEditingTitleValue,
  setIsEditingTitle,
  handleTitleKeyDown,
  handleTitleEditSubmit,
  defaultTitleValue,
  onRegenerateImage,
  onBranch,
  onEditPanel
}) => {
  const [hasAnimation, setHasAnimation] = useState(panelAnimations.has(panel.id));
  
  // Handle when a video is generated
  const handleVideoGenerated = (blobUrl: string) => {
    panelAnimations.set(panel.id, blobUrl);
    setHasAnimation(true);
  };
  
  return (
    <Card className="w-full h-full flex flex-col border rounded-md overflow-hidden bg-background">
      <CardHeader className="p-2 border-b">
        <div className="flex items-center justify-between">
          {isEditingTitle ? (
            <div className="flex-grow flex items-center gap-1">
              <input 
                type="text" 
                value={editingTitleValue} 
                onChange={(e) => setEditingTitleValue(e.target.value)} 
                onKeyDown={handleTitleKeyDown} 
                onBlur={handleTitleEditSubmit} 
                autoFocus 
                className="h-6 sm:h-7 flex-grow text-xs sm:text-sm rounded-md px-2 border" 
              />
              <Button variant="ghost" size="icon" onClick={handleTitleEditSubmit} className="h-6 w-6 sm:h-7 sm:w-7">
                <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-500" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => {
                setIsEditingTitle(false);
                setEditingTitleValue(defaultTitleValue);
              }} className="h-6 w-6 sm:h-7 sm:w-7">
                <X className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-500" />
              </Button>
            </div>
          ) : (
            <>
              <CardTitle className="text-xs sm:text-sm font-semibold text-primary truncate flex-grow cursor-pointer hover:underline" title={`Click to edit: ${displayTitle}`} onClick={() => setIsEditingTitle(true)}>
                <BookText className="h-3 w-3 sm:h-3.5 sm:w-3.5 inline mr-1 align-text-bottom" />
                {displayTitle}
              </CardTitle>
              <div className="flex items-center gap-1">
                <TooltipButton 
                  icon={<Edit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />}
                  tooltip="Edit Page"
                  onClick={() => onEditPanel(panel.id)} 
                  className="h-6 w-6 sm:h-7 sm:w-7"
                />
              </div>
            </>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-2 sm:p-3 flex-1 overflow-hidden relative">
        <div 
          className="w-full h-full overflow-hidden bg-muted-foreground/5 relative flex items-center justify-center cursor-pointer group"
          onClick={() => onRegenerateImage(panel.id, 0, panel.imageUrls[0], panel.promptsUsed?.[0])}
        >
          <img 
            src={panel.imageUrls[0]} 
            alt={`Comic book page ${panel.pageNumber}`}
            className="max-w-full max-h-full object-contain transition-all duration-300 ease-in-out group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <RefreshCcw className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <PanelAnimationButton 
          imageUrl={panel.imageUrls[0]}
          panelTitle={displayTitle}
          promptText={panel.promptsUsed?.[0]}
          onVideoGenerated={handleVideoGenerated}
        />
      </CardContent>
      
      <CardFooter className="p-2 border-t grid grid-cols-2 gap-2">
        <Button 
          onClick={() => onBranch(panel.id)} 
          size="sm" 
          variant="outline"
          className="text-xs"
        >
          <GitFork className="h-3 w-3 mr-1" />
          Branch
        </Button>
        
        {hasAnimation && (
          <Button 
            onClick={() => window.open(panelAnimations.get(panel.id), '_blank')}
            size="sm" 
            variant="outline"
            className="text-xs"
          >
            <Video className="h-3 w-3 mr-1" />
            Video
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

// Group node view (comic book container)
export const GroupNodeView: FC<GroupNodeViewProps> = ({
  panel,
  allPanels,
  displayTitle,
  isEditingTitle,
  editingTitleValue,
  setEditingTitleValue,
  setIsEditingTitle,
  handleTitleKeyDown,
  handleTitleEditSubmit,
  defaultTitleValue,
  descriptionContent,
  onGenerateNext,
  onBranch,
  onSelectPage
}) => {
  const [expanded, setExpanded] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  // Get all comic book pages that belong to this group
  const pageChildren = allPanels
    .filter(p => p.parentId === panel.id && p.isComicBookPage)
    .sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0));

  return (
    <Card className={`w-full h-full flex flex-col rounded-lg border-2 border-primary/30 bg-background/95 shadow-lg ${expanded ? '' : 'p-1'}`}>
      <CardHeader className={`${expanded ? 'p-2 sm:p-3' : 'p-1'} border-b`}>
        <div className="flex items-center justify-between">
          {isEditingTitle ? (
            <div className="flex-grow flex items-center gap-1">
              <input 
                type="text" 
                value={editingTitleValue} 
                onChange={(e) => setEditingTitleValue(e.target.value)} 
                onKeyDown={handleTitleKeyDown} 
                onBlur={handleTitleEditSubmit} 
                autoFocus 
                className="h-7 sm:h-8 flex-grow text-sm rounded-md px-2 border" 
              />
              <Button variant="ghost" size="icon" onClick={handleTitleEditSubmit} className="h-7 w-7 sm:h-8 sm:w-8">
                <Check className="h-4 w-4 text-green-500" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => {
                setIsEditingTitle(false);
                setEditingTitleValue(defaultTitleValue);
              }} className="h-7 w-7 sm:h-8 sm:w-8">
                <X className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ) : (
            <>
              <CardTitle className={`${expanded ? 'text-base sm:text-lg' : 'text-sm'} font-bold text-primary truncate flex-grow cursor-pointer hover:underline`} title={`Click to edit: ${displayTitle}`} onClick={() => setIsEditingTitle(true)}>
                <BookText className={`${expanded ? 'h-4 w-4 sm:h-5 sm:w-5' : 'h-3.5 w-3.5'} inline mr-1 align-text-bottom`} />
                {displayTitle} 
                <span className="ml-1 text-sm text-muted-foreground font-normal">
                  ({pageChildren.length} {pageChildren.length === 1 ? 'page' : 'pages'})
                </span>
              </CardTitle>
              <div className="flex items-center gap-1">
                {expanded && (
                  <TooltipButton 
                    icon={<Info className="h-4 w-4 text-muted-foreground" />}
                    tooltip={showInfo ? "Hide Info" : "Show Info"} 
                    onClick={() => setShowInfo(!showInfo)}
                  />
                )}
                <TooltipButton 
                  icon={expanded ? <Minimize2 className="h-4 w-4 text-muted-foreground" /> : <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />}
                  tooltip={expanded ? "Collapse" : "Expand"} 
                  onClick={() => setExpanded(!expanded)}
                />
              </div>
            </>
          )}
        </div>
      </CardHeader>

      {expanded && (
        <>
          {showInfo ? (
            <CardContent className="p-2 sm:p-3 flex-1 overflow-auto">
              <div className="bg-accent/5 p-2 sm:p-3 rounded-md h-full">
                {descriptionContent}
              </div>
            </CardContent>
          ) : (
            <CardContent className="p-2 sm:p-3 flex-1 overflow-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 h-full">
                {pageChildren.map((page, i) => (
                  <div 
                    key={page.id} 
                    className="relative bg-card rounded-md overflow-hidden border shadow-sm hover:shadow-md cursor-pointer group transition-all duration-200 flex flex-col"
                    onClick={() => onSelectPage?.(page.id)}
                  >
                    <div className="absolute top-0 left-0 z-10 bg-primary/80 text-primary-foreground rounded-br-md p-0.5 text-[10px] sm:text-xs font-medium">
                      {page.pageNumber || i+1}
                    </div>
                    
                    <div className="relative aspect-[3/4] bg-muted-foreground/5">
                      <img
                        src={page.imageUrls[0]} 
                        alt={`Page ${page.pageNumber || i+1}`}
                        className="w-full h-full object-cover transition-all duration-200 group-hover:scale-105"
                      />
                    </div>
                    
                    <div className="p-1 text-[10px] sm:text-xs text-center truncate border-t">
                      {page.title || `Page ${page.pageNumber || i+1}`}
                    </div>
                    
                    {panelAnimations.has(page.id) && (
                      <div className="absolute top-0 right-0 z-10 bg-secondary/80 text-secondary-foreground rounded-bl-md p-0.5">
                        <Video className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}

          <CardFooter className="p-2 sm:p-3 border-t grid grid-cols-2 gap-2">
            <Button 
              onClick={() => onGenerateNext(panel.id)} 
              size="sm" 
              variant="outline"
              className="text-xs sm:text-sm"
            >
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
              Generate Sequel
            </Button>
            <Button 
              onClick={() => onBranch(panel.id)} 
              size="sm" 
              variant="outline"
              className="text-xs sm:text-sm"
            >
              <GitFork className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
              Branch Story
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}; 