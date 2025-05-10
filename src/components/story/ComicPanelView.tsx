
import type { FC, KeyboardEvent } from 'react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ComicPanelData } from '@/types/story';
import { Sparkles, GitFork, Info, Edit3, Check, X, RefreshCcw, Edit2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

interface ComicPanelViewProps {
  panel: ComicPanelData;
  onGenerateNext: (panelId: string) => void;
  onBranch: (panelId: string) => void;
  onUpdateTitle: (panelId: string, newTitle: string) => void;
  onRegenerateImage: (panelId: string, imageIndex: number, imageUrl: string, originalPrompt?: string) => void;
  onEditPanel: (panelId: string) => void; // New prop for editing the entire panel
}

const ComicPanelView: FC<ComicPanelViewProps> = ({ panel, onGenerateNext, onBranch, onUpdateTitle, onRegenerateImage, onEditPanel }) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState(panel.title || '');

  useEffect(() => {
    setEditingTitleValue(panel.title || '');
  }, [panel.title]);

  const handleTitleEditSubmit = () => {
    if (editingTitleValue.trim() !== (panel.title || '')) {
      onUpdateTitle(panel.id, editingTitleValue.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleEditSubmit();
    } else if (e.key === 'Escape') {
      setEditingTitleValue(panel.title || '');
      setIsEditingTitle(false);
    }
  };

  let descriptionContent: React.ReactNode;
  if (panel.userDescription) {
    descriptionContent = <p><strong>User Description:</strong> {panel.userDescription}</p>;
  } else if (panel.promptsUsed && panel.promptsUsed.length > 0) {
    descriptionContent = (
      <>
        <p className="font-semibold mb-1">Prompts Used:</p>
        <ul className="list-disc pl-4 space-y-1">
          {panel.promptsUsed.map((prompt, index) => (
            <li key={index} className="text-xs"><strong>Image {index + 1}:</strong> {prompt}</li>
          ))}
        </ul>
      </>
    );
  } else {
    descriptionContent = <p>No detailed description or prompts available.</p>;
  }

  const hasMultipleImages = panel.imageUrls.length > 1;
  const displayTitle = panel.title || `Panel ${panel.id.substring(0,4)}...`;

  return (
    <Card className="w-72 sm:w-80 md:w-96 max-w-sm overflow-hidden bg-card shadow-md flex flex-col">
      <CardHeader className="p-3">
        <div className="flex items-center justify-between gap-2">
          {isEditingTitle ? (
            <div className="flex-grow flex items-center gap-1">
              <Input
                type="text"
                value={editingTitleValue}
                onChange={(e) => setEditingTitleValue(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={handleTitleEditSubmit} // Save on blur
                autoFocus
                className="h-8 text-sm flex-grow"
              />
              <Button variant="ghost" size="icon" onClick={handleTitleEditSubmit} className="h-7 w-7 shrink-0">
                <Check className="h-4 w-4 text-green-500" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => { setIsEditingTitle(false); setEditingTitleValue(panel.title || '');}} className="h-7 w-7 shrink-0">
                <X className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ) : (
            <CardTitle 
              className="text-base font-semibold text-card-foreground truncate cursor-pointer hover:text-primary"
              title={`Click pencil to edit. ${displayTitle}`}
              onClick={() => setIsEditingTitle(true)}
            >
              {displayTitle}
            </CardTitle>
          )}
          <div className="flex items-center shrink-0">
            {!isEditingTitle && (
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setIsEditingTitle(true)} className="h-7 w-7">
                      <Edit3 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top"><p>Edit Title</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => onEditPanel(panel.id)} className="h-7 w-7">
                    <Edit2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Edit Panel Images</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {(panel.userDescription || (panel.promptsUsed && panel.promptsUsed.length > 0)) && (
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                       <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent 
                      className="max-w-xs break-words bg-popover text-popover-foreground p-3 rounded-md shadow-lg text-xs" 
                      side="top"
                  >
                    {descriptionContent}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn(
        "p-0 aspect-[4/3] relative bg-muted flex-grow",
        hasMultipleImages && "grid grid-cols-2 grid-rows-2 gap-px" // gap-px for thin lines
      )}>
        {panel.imageUrls.map((url, index) => (
          <div 
            key={index} 
            className="relative w-full h-full overflow-hidden bg-muted-foreground/10 group cursor-pointer"
            onClick={() => onRegenerateImage(panel.id, index, url, panel.promptsUsed?.[index])}
            title="Click to regenerate this image"
          >
            <Image
              src={url}
              alt={panel.promptsUsed?.[index] || panel.userDescription || `Comic panel image ${index + 1}`}
              layout="fill"
              objectFit="contain"
              data-ai-hint="comic panel image"
              className="transition-transform duration-300 ease-in-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <RefreshCcw className="w-8 h-8 text-white" />
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter className="p-3 grid grid-cols-2 gap-2">
        <Button onClick={() => onGenerateNext(panel.id)} size="sm" variant="outline" className="text-xs sm:text-sm">
          <Sparkles className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          Next
        </Button>
        <Button onClick={() => onBranch(panel.id)} size="sm" variant="outline" className="text-xs sm:text-sm">
          <GitFork className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          Branch
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ComicPanelView;
