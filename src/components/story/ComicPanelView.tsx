/**
 * ComicPanelView Component
 * * This component handles the display of comic panels in the story editor.
 * It can render three types of panels:
 * 1. Group Nodes (Comic Book containers)
 * 2. Comic Book Pages
 * 3. Regular Panels (with single or multiple images)
 * * Each panel type has different styling, behavior, and action capabilities.
 */

import type { FC, KeyboardEvent, ReactElement, ReactNode } from 'react';
import { useState, useEffect, cloneElement } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ComicPanelData } from '@/types/story';
import { Sparkles, GitFork, Info, Edit3, Check, X, RefreshCcw, Edit2, BookText, FileImage, Maximize2, Minimize2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

// Import the extracted components
import { 
  GroupNodeView,
  ComicBookPageView, 
  RegularPanelView
} from './comicviews';

// Types

/**
 * Main component props for ComicPanelView
 */
interface ComicPanelViewProps {
  panel: ComicPanelData;
  allPanels: ComicPanelData[];
  onGenerateNext: (panelId: string) => void;
  onBranch: (panelId: string) => void;
  onUpdateTitle: (panelId: string, newTitle: string) => void;
  onRegenerateImage: (panelId: string, imageIndex: number, imageUrl: string, originalPrompt?: string) => void;
  onEditPanel: (panelId: string) => void;
  onSelectPage?: (pageId: string) => void;
}

/**
 * Props for the title editor component
 */
interface TitleEditorProps {
  isEditing: boolean;
  value: string;
  onSubmit: () => void;
  onChange: (value: string) => void;
  onCancel: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  size?: 'small' | 'normal';
}

/**
 * Props for the image display component
 */
interface ImageDisplayProps {
  url: string;
  alt: string;
  onClick: () => void;
  isExpanded?: boolean;
}

/**
 * Props for the action button component
 */
interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  onClick: () => void;
  size?: 'small' | 'normal';
  key?: string; // Added for lists of actions
}

/**
 * Props for the new PanelHeaderStandard component
 */
interface PanelHeaderStandardProps {
  title: string;
  icon?: ReactElement;
  isEditingTitle: boolean;
  editingTitleValue: string;
  setEditingTitleValue: (value: string) => void;
  setIsEditingTitle: (isEditing: boolean) => void;
  handleTitleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  handleTitleEditSubmit: () => void;
  defaultTitleValue: string; // Used for cancel/reset
  titleClassName?: string;
  titleEditorSize?: 'small' | 'normal';
  actionIcons?: ReactNode; // For additional icons like Info, Expand/Collapse
}

/**
 * Props for the new PanelActionsFooter component
 */
interface PanelActionsFooterProps {
  actions: ActionButtonProps[];
  className?: string;
}


// Helper Components

/**
 * Helper function to determine if a URL is an external image
 */
const isExternalImage = (url: string): boolean => {
  return (
    url.startsWith('https://') && 
    (url.includes('blob.vercel-storage.com') || 
     url.includes('amazonaws.com') || 
     url.includes('cloudinary.com'))
  );
};

/**
 * TitleEditor Component
 */
const TitleEditor: FC<TitleEditorProps> = ({ 
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

/**
 * ActionButton Component
 */
const ActionButton: FC<ActionButtonProps> = ({ icon, label, tooltip, onClick, size = 'normal' }) => {
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
 * ImageDisplay Component
 */
const ImageDisplay: FC<ImageDisplayProps> = ({ url, alt, onClick, isExpanded }) => (
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


// New Reusable Components

/**
 * PanelHeaderStandard Component
 * * Handles title display, editing, and optional action icons for panel headers.
 */
const PanelHeaderStandard: FC<PanelHeaderStandardProps> = ({
  title,
  icon,
  isEditingTitle,
  editingTitleValue,
  setEditingTitleValue,
  setIsEditingTitle,
  handleTitleKeyDown,
  handleTitleEditSubmit,
  defaultTitleValue,
  titleClassName = "text-sm sm:text-base md:text-lg font-semibold text-primary truncate cursor-pointer hover:underline flex-grow",
  titleEditorSize = 'normal',
  actionIcons
}) => {
  return (
    <div className="flex items-start justify-between gap-1 sm:gap-2">
      {isEditingTitle ? (
        <TitleEditor
          isEditing={isEditingTitle}
          value={editingTitleValue}
          onChange={setEditingTitleValue}
          onSubmit={handleTitleEditSubmit}
          onCancel={() => {
            setIsEditingTitle(false);
            setEditingTitleValue(defaultTitleValue);
          }}
          onKeyDown={handleTitleKeyDown}
          size={titleEditorSize}
        />
      ) : (
        <CardTitle 
          className={titleClassName} 
          title={`Click pencil to edit. ${title}`} 
          onClick={() => setIsEditingTitle(true)}
        >
          {icon && cloneElement(icon, { className: `inline-block mr-1 sm:mr-2 ${titleEditorSize === 'small' ? 'h-3 w-3 sm:h-3.5 sm:w-3.5' : 'h-4 w-4 sm:h-5 sm:w-5'} align-text-bottom`})}
          {title}
        </CardTitle>
      )}
      <div className="flex items-center shrink-0">
        {!isEditingTitle && !icon && ( // Show edit icon only if no primary icon implies editability or if explicitly needed
            <TooltipButton
                icon={<Edit3 className={cn("text-muted-foreground", titleEditorSize === 'small' ? 'h-3 w-3' : 'h-3.5 w-3.5 sm:h-4 sm:w-4')} />}
                tooltip="Edit Title"
                onClick={() => setIsEditingTitle(true)}
                className={cn(titleEditorSize === 'small' ? 'h-5 w-5 sm:h-6 sm:w-6' : 'h-6 w-6 sm:h-7 sm:w-7')}
            />
        )}
        {actionIcons}
      </div>
    </div>
  );
};

/**
 * PanelActionsFooter Component
 * * Renders a list of action buttons in a consistent footer layout.
 */
const PanelActionsFooter: FC<PanelActionsFooterProps> = ({ actions, className }) => {
  return (
    <CardFooter className={cn("p-1.5 sm:p-2 md:p-3 grid gap-1.5 sm:gap-2 border-t mt-auto flex-shrink-0", className)}>
      {actions.map(actionProps => (
        <ActionButton {...actionProps} key={actionProps.label || actionProps.tooltip} />
      ))}
    </CardFooter>
  );
};


// Main ComicPanelView Component

/**
 * Main ComicPanelView Component
 */
const ComicPanelView: FC<ComicPanelViewProps> = ({ 
  panel, 
  allPanels, 
  onGenerateNext, 
  onBranch, 
  onUpdateTitle, 
  onRegenerateImage, 
  onEditPanel,
  onSelectPage
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
  /**
   * Generate a default title based on panel type and available data
   */
  const getDefaultTitle = (): string => {
    if (panel.isGroupNode) {
      return panel.userDescription || `Comic Book ${panel.id.substring(0,4)}`;
    }
    if (panel.isComicBookPage) {
      return `Page ${panel.pageNumber}`;
    }
    return panel.promptsUsed?.[0]?.substring(0,30) || 
           panel.userDescription?.substring(0,30) || 
           `Panel ${panel.id.substring(0,4)}`;
  };
  
  // Initialize and update title value when panel data changes
  const [editingTitleValue, setEditingTitleValue] = useState(panel.title || getDefaultTitle());
  
  useEffect(() => {
    const defaultTitle = getDefaultTitle();
    setEditingTitleValue(panel.title || defaultTitle);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel.title, panel.id, panel.isGroupNode, panel.isComicBookPage, panel.pageNumber, panel.userDescription, panel.promptsUsed]);

  // Reset editing state if the panel itself changes to prevent editing the wrong title
  useEffect(() => {
    setIsEditingTitle(false);
  }, [panel.id]);

  /**
   * Handle submission of title edits
   */
  const handleTitleEditSubmit = () => {
    const defaultTitle = getDefaultTitle();
    const newTitle = editingTitleValue.trim();
    
    if (newTitle !== (panel.title || '') && newTitle !== '') {
        onUpdateTitle(panel.id, newTitle);
    } else if (newTitle === '' && panel.title !== defaultTitle) {
        // If user clears the title, revert to default
        onUpdateTitle(panel.id, defaultTitle);
        setEditingTitleValue(defaultTitle); // also update local state to show the default
    }
    setIsEditingTitle(false);
  };

  /**
   * Handle keyboard events in title input
   */
  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission if wrapped in one
      handleTitleEditSubmit();
    } else if (e.key === 'Escape') {
      const defaultTitle = getDefaultTitle();
      setEditingTitleValue(panel.title || defaultTitle);
      setIsEditingTitle(false);
    }
  };

  /**
   * Generate React node for panel description content based on available data
   */
  const generateDescriptionContent = (): React.ReactNode => {
    if (panel.isGroupNode && panel.userDescription) {
      return <p className="text-xs sm:text-sm">{panel.userDescription}</p>;
    }
    if (panel.isComicBookPage && panel.promptsUsed && panel.promptsUsed.length > 0) {
      // For comic book pages, the 'prompt' is often used as a note/context
      return <p className="text-xs sm:text-sm"><strong>Note/Context:</strong> {panel.promptsUsed[0]}</p>;
    }
    if (panel.userDescription) {
      return <p className="text-xs sm:text-sm"><strong>Description:</strong> {panel.userDescription}</p>;
    }
    if (panel.promptsUsed && panel.promptsUsed.length > 0) {
      return (
        <>
          <p className="font-semibold mb-0.5 sm:mb-1 text-xs sm:text-sm">Prompts Used:</p>
          <ul className="list-disc pl-3 sm:pl-4 space-y-0.5">
            {panel.promptsUsed.map((prompt, index) => (
              <li key={index} className="text-[10px] sm:text-xs">
                <strong>Img {index + 1}:</strong> {prompt}
              </li>
            ))}
          </ul>
        </>
      );
    }
    return <p className="text-xs sm:text-sm">No detailed description or prompts available.</p>;
  };
  
  const displayTitle = panel.title || getDefaultTitle();
  const defaultTitleValue = getDefaultTitle(); // For reset/cancel
  const descriptionContent = generateDescriptionContent();

  // Common props for title editing
  const commonTitleProps = {
    isEditingTitle,
    editingTitleValue,
    setEditingTitleValue,
    setIsEditingTitle,
    handleTitleKeyDown,
    handleTitleEditSubmit,
    defaultTitleValue: panel.title || defaultTitleValue, // pass current saved title or default if not set
  };

  // Add a wrapper div to ensure consistent sizing for all panel types
  const wrapperClass = panel.isGroupNode 
    ? "w-full h-full overflow-hidden" 
    : "w-full h-full";

  // Render the appropriate view based on panel type
  return (
    <div className={wrapperClass}>
      {panel.isGroupNode ? (
        <GroupNodeView
          panel={panel}
          allPanels={allPanels}
          displayTitle={displayTitle}
          {...commonTitleProps}
          descriptionContent={descriptionContent}
          onGenerateNext={onGenerateNext}
          onBranch={onBranch}
          onSelectPage={onSelectPage}
        />
      ) : panel.isComicBookPage ? (
        <ComicBookPageView
          panel={panel}
          displayTitle={displayTitle}
          {...commonTitleProps}
          onRegenerateImage={onRegenerateImage}
          onBranch={onBranch}
          onEditPanel={onEditPanel}
        />
      ) : (
        <RegularPanelView
          panel={panel}
          displayTitle={displayTitle}
          {...commonTitleProps}
          descriptionContent={descriptionContent}
          onRegenerateImage={onRegenerateImage}
          onGenerateNext={onGenerateNext}
          onBranch={onBranch}
          onEditPanel={onEditPanel}
        />
      )}
    </div>
  );
};

export default ComicPanelView;