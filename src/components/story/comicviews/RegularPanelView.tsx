import type { FC, KeyboardEvent } from 'react';
import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Sparkles, GitFork, Edit2, Edit3, Info, Maximize2, Minimize2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from '@/components/ui/button';
import type { ComicPanelData } from '@/types/story';
import { cn } from '@/lib/utils';

import { TooltipButton, ActionButtonProps, AnimatedImageDisplay } from './utils';
import { PanelHeaderStandard, PanelActionsFooter } from './layout';

interface RegularPanelViewProps {
  panel: ComicPanelData;
  displayTitle: string;
  isEditingTitle: boolean;
  editingTitleValue: string;
  setEditingTitleValue: (value: string) => void;
  setIsEditingTitle: (value: boolean) => void;
  handleTitleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  handleTitleEditSubmit: () => void;
  defaultTitleValue: string;
  descriptionContent: React.ReactNode;
  onRegenerateImage: (panelId: string, imageIndex: number, imageUrl: string, originalPrompt?: string) => void;
  onGenerateNext: (panelId: string) => void;
  onBranch: (panelId: string) => void;
  onEditPanel: (panelId: string) => void;
}

/**
 * RegularPanelView Component
 * 
 * Displays a regular comic panel that can contain multiple images
 * This is the most common panel type
 */
const RegularPanelView: FC<RegularPanelViewProps> = ({
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
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMultipleImages = panel.imageUrls.length > 1;
  
  const footerActions: ActionButtonProps[] = [
    { icon: <Sparkles />, label: "Next", tooltip: "Generate next panel sequentially", onClick: () => onGenerateNext(panel.id) },
    { icon: <GitFork />, label: "Branch", tooltip: "Create a new branch from this panel", onClick: () => onBranch(panel.id) },
    { icon: <Edit2 />, label: "Edit", tooltip: "Edit prompts/contexts for images in this panel", onClick: () => onEditPanel(panel.id) }
  ];

  return (
    <Card className="w-full h-full overflow-hidden bg-card shadow-md flex flex-col">
      <CardHeader className="p-2 sm:p-3">
        <PanelHeaderStandard
          title={displayTitle}
          isEditingTitle={isEditingTitle}
          editingTitleValue={editingTitleValue}
          setEditingTitleValue={setEditingTitleValue}
          setIsEditingTitle={setIsEditingTitle}
          handleTitleKeyDown={handleTitleKeyDown}
          handleTitleEditSubmit={handleTitleEditSubmit}
          defaultTitleValue={defaultTitleValue}
          titleClassName="text-xs sm:text-sm md:text-base font-semibold text-card-foreground truncate cursor-pointer hover:text-primary flex-grow"
          actionIcons={
            <>
              <TooltipButton
                icon={isExpanded ? 
                  <Minimize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" /> : 
                  <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                }
                tooltip={isExpanded ? "Collapse Images" : "Expand Images"}
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 sm:h-7 sm:w-7"
              />
              {!isEditingTitle && (
                <TooltipButton
                  icon={<Edit3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />}
                  tooltip="Edit Title"
                  onClick={() => setIsEditingTitle(true)}
                  className="h-6 w-6 sm:h-7 sm:w-7"
                />
              )}
              {(panel.userDescription || (panel.promptsUsed && panel.promptsUsed.length > 0)) && (
                <TooltipProvider>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7">
                        <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[180px] xs:max-w-[200px] sm:max-w-xs break-words bg-popover text-popover-foreground p-1.5 sm:p-2 rounded-md shadow-lg text-xs" side="top">
                      {descriptionContent}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </>
          }
        />
      </CardHeader>
      <CardContent className={cn(
        "p-0 relative bg-muted flex-grow",
        isExpanded ? "aspect-auto" : "aspect-[4/3]",
        hasMultipleImages && !isExpanded && "grid grid-cols-2 grid-rows-2 gap-px",
        hasMultipleImages && isExpanded && "flex flex-col gap-px" 
      )}>
        {panel.imageUrls.map((url, index) => (
          <AnimatedImageDisplay
            key={index}
            url={url}
            alt={panel.promptsUsed?.[index] || panel.userDescription || `Comic panel image ${index + 1}`}
            onClick={() => onRegenerateImage(panel.id, index, url, panel.promptsUsed?.[index])}
            isExpanded={isExpanded}
            prompt={panel.promptsUsed?.[index] || panel.userDescription}
          />
        ))}
        {!hasMultipleImages && panel.imageUrls.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground p-2 text-xs sm:text-sm">
            No images in this panel.
          </div>
        )}
      </CardContent>
      <PanelActionsFooter actions={footerActions} className="grid-cols-1 sm:grid-cols-3"/>
    </Card>
  );
};

export default RegularPanelView; 