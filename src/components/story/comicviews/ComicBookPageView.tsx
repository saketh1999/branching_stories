import type { FC, KeyboardEvent } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FileImage, GitFork, Edit2, Edit3 } from 'lucide-react';
import type { ComicPanelData } from '@/types/story';
import { cn } from '@/lib/utils';

import { TooltipButton, ActionButtonProps, AnimatedImageDisplay } from './utils';
import { PanelHeaderStandard, PanelActionsFooter } from './layout';

interface ComicBookPageViewProps {
  panel: ComicPanelData;
  displayTitle: string;
  isEditingTitle: boolean;
  editingTitleValue: string;
  setEditingTitleValue: (value: string) => void;
  setIsEditingTitle: (value: boolean) => void;
  handleTitleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  handleTitleEditSubmit: () => void;
  defaultTitleValue: string;
  onRegenerateImage: (panelId: string, imageIndex: number, imageUrl: string, originalPrompt?: string) => void;
  onBranch: (panelId: string) => void;
  onEditPanel: (panelId: string) => void;
}

/**
 * ComicBookPageView Component
 * 
 * Displays a single comic book page with its image and actions
 * This is a child of a GroupNodeView (comic book)
 */
const ComicBookPageView: FC<ComicBookPageViewProps> = ({
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
  const footerActions: ActionButtonProps[] = [
    { icon: <GitFork />, label: "Branch", tooltip: "Create a new branch from this page.", onClick: () => onBranch(panel.id), size: "small" },
    { icon: <Edit2 />, label: "Edit Page", tooltip: "Edit prompt/context for this page image.", onClick: () => onEditPanel(panel.id), size: "small" }
  ];
  
  return (
    <Card className={cn("w-full h-full overflow-hidden bg-card shadow-md flex flex-col border-secondary border-2")}>
      <CardHeader className="p-1.5 sm:p-2">
        <PanelHeaderStandard
          title={displayTitle}
          icon={<FileImage />}
          isEditingTitle={isEditingTitle}
          editingTitleValue={editingTitleValue}
          setEditingTitleValue={setEditingTitleValue}
          setIsEditingTitle={setIsEditingTitle}
          handleTitleKeyDown={handleTitleKeyDown}
          handleTitleEditSubmit={handleTitleEditSubmit}
          defaultTitleValue={defaultTitleValue}
          titleClassName="text-[11px] sm:text-xs font-semibold text-secondary-foreground truncate flex-grow cursor-pointer hover:underline"
          titleEditorSize="small"
          actionIcons={
            !isEditingTitle && (
                <TooltipButton
                    icon={<Edit3 className="h-3 w-3 text-muted-foreground" />}
                    tooltip="Edit Page Title/Note"
                    onClick={() => setIsEditingTitle(true)}
                    className="h-5 w-5 sm:h-6 sm:w-6"
                />
            )
          }
        />
      </CardHeader>
      <CardContent className="p-0 aspect-[2/3] relative bg-muted flex-grow">
        {panel.imageUrls.length > 0 ? (
          <AnimatedImageDisplay
            url={panel.imageUrls[0]}
            alt={panel.promptsUsed?.[0] || displayTitle}
            onClick={() => onRegenerateImage(panel.id, 0, panel.imageUrls[0], panel.promptsUsed?.[0])}
            prompt={panel.promptsUsed?.[0] || panel.userDescription}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground p-2 text-xs sm:text-sm">
            No image for this page.
          </div>
        )}
      </CardContent>
      <PanelActionsFooter actions={footerActions} className="grid-cols-2 p-1" />
    </Card>
  );
};

export default ComicBookPageView; 