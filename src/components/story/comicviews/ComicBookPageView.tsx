import type { FC, KeyboardEvent } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FileImage, GitFork, Edit2, Edit3, RefreshCcw } from 'lucide-react';
import Image from 'next/image';
import type { ComicPanelData } from '@/types/story';
import { cn } from '@/lib/utils';

import { TooltipButton, ActionButtonProps, isExternalImage } from './utils';
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
      <CardContent 
        className="p-0 aspect-[2/3] relative bg-muted flex-grow group cursor-pointer" 
        onClick={() => onRegenerateImage(panel.id, 0, panel.imageUrls[0], panel.promptsUsed?.[0])} 
        title="Click to regenerate this page"
      >
        <Image
          src={panel.imageUrls[0]}
          alt={panel.promptsUsed?.[0] || displayTitle}
          layout="fill"
          objectFit="contain"
          data-ai-hint="comic page"
          className="transition-transform duration-300 ease-in-out group-hover:scale-105"
          sizes="(max-width: 639px) 160px, (max-width: 1023px) 180px, 200px"
          unoptimized={isExternalImage(panel.imageUrls[0])}
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <RefreshCcw className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
        </div>
      </CardContent>
      <PanelActionsFooter actions={footerActions} className="grid-cols-2 p-1" />
    </Card>
  );
};

export default ComicBookPageView; 