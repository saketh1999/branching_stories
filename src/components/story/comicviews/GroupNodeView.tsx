import type { FC, KeyboardEvent } from 'react';
import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { BookText, Sparkles, GitFork, Edit3, Info, ChevronsUp, ChevronsDown, LayoutGrid, Rows3 } from 'lucide-react';
import Image from 'next/image';
import type { ComicPanelData } from '@/types/story';
import { cn } from '@/lib/utils';

import { TooltipButton, ActionButtonProps, isExternalImage } from './utils';
import { PanelHeaderStandard, PanelActionsFooter } from './layout';

interface GroupNodeViewProps {
  panel: ComicPanelData;
  allPanels: ComicPanelData[];
  displayTitle: string;
  isEditingTitle: boolean;
  editingTitleValue: string;
  setEditingTitleValue: (value: string) => void;
  setIsEditingTitle: (value: boolean) => void;
  handleTitleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  handleTitleEditSubmit: () => void;
  defaultTitleValue: string;
  descriptionContent: React.ReactNode; // Not used here, description is tooltip
  onGenerateNext: (panelId: string) => void;
  onBranch: (panelId: string) => void;
  onSelectPage?: (pageId: string) => void; // New prop for page selection
}

/**
 * GroupNodeView Component
 * 
 * Displays a "Comic Book" container that can hold multiple comic pages
 * This version features a hovering card effect and displays all child images in a grid
 */
const GroupNodeView: FC<GroupNodeViewProps> = ({
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
  onGenerateNext,
  onBranch,
  onSelectPage
}) => {
  // Layout state
  const [gridLayout, setGridLayout] = useState(true);
  const [gridColumns, setGridColumns] = useState(3);

  // Get child comic book pages sorted by page number
  const childComicBookPages = panel.childrenIds
    ? panel.childrenIds
        .map(childId => allPanels.find(p => p.id === childId))
        .filter((child): child is ComicPanelData => !!child && child.isComicBookPage === true)
        .sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0))
    : [];

  const footerActions: ActionButtonProps[] = [
    { icon: <Sparkles />, label: "Next (After Book)", tooltip: "Generate a new panel after this entire comic book.", onClick: () => onGenerateNext(panel.id) },
    { icon: <GitFork />, label: "Branch (From Book)", tooltip: "Create a new story branch from this comic book.", onClick: () => onBranch(panel.id) }
  ];

  // Handle clicking on a page thumbnail
  const handlePageClick = (pageId: string) => {
    if (onSelectPage) {
      onSelectPage(pageId);
    }
  };

  // Toggle between grid and list view
  const toggleLayout = () => {
    setGridLayout(!gridLayout);
  };

  // Toggle grid columns (2, 3, or 4)
  const toggleGridColumns = () => {
    setGridColumns(prev => prev === 4 ? 2 : prev + 1);
  };

  // Get grid columns class based on current setting
  const getGridColumnsClass = () => {
    switch (gridColumns) {
      case 2: return "grid-cols-1 sm:grid-cols-2";
      case 3: return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
      case 4: return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
      default: return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
    }
  };

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden rounded-lg border-2 border-primary">
      {/* Header */}
      <CardHeader className="py-2 px-3 sm:py-3 sm:px-4 flex-shrink-0 border-b border-border bg-card z-10">
        <PanelHeaderStandard
          title={displayTitle}
          icon={<BookText />}
          isEditingTitle={isEditingTitle}
          editingTitleValue={editingTitleValue}
          setEditingTitleValue={setEditingTitleValue}
          setIsEditingTitle={setIsEditingTitle}
          handleTitleKeyDown={handleTitleKeyDown}
          handleTitleEditSubmit={handleTitleEditSubmit}
          defaultTitleValue={defaultTitleValue}
          titleClassName="text-sm sm:text-base md:text-lg font-semibold text-primary truncate cursor-pointer hover:underline flex-grow"
          actionIcons={
            <>
              {!isEditingTitle && (
                <TooltipButton
                  icon={<Edit3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />}
                  tooltip="Edit Comic Book Title"
                  onClick={() => setIsEditingTitle(true)}
                  className="h-6 w-6 sm:h-7 sm:w-7"
                />
              )}
              {panel.userDescription && (
                <TooltipButton
                  icon={<Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />}
                  tooltip={panel.userDescription}
                  className="h-6 w-6 sm:h-7 sm:w-7"
                />
              )}
              <TooltipButton
                icon={gridLayout ? <Rows3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" /> : <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />}
                tooltip={gridLayout ? "Switch to List View" : "Switch to Grid View"}
                onClick={toggleLayout}
                className="h-6 w-6 sm:h-7 sm:w-7"
              />
              {gridLayout && (
                <TooltipButton
                  icon={<span className="text-xs font-semibold text-muted-foreground">{gridColumns}</span>}
                  tooltip={`Currently ${gridColumns} columns - Click to change`}
                  onClick={toggleGridColumns}
                  className="h-6 w-6 sm:h-7 sm:w-7"
                />
              )}
            </>
          }
        />
      </CardHeader>

      {/* Content Area */}
      <CardContent className="flex-grow p-3 sm:p-4 md:p-6 overflow-auto">
        {childComicBookPages.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-muted-foreground text-center text-sm sm:text-base">This comic book is empty. Pages will appear here.</p>
          </div>
        ) : (
          <div className={cn(
            gridLayout 
              ? `grid ${getGridColumnsClass()} gap-4 sm:gap-6 md:gap-8 justify-items-center` 
              : "flex flex-col gap-5 items-center"
          )}>
            {childComicBookPages.map((page) => (
              <div 
                key={page.id} 
                className={cn(
                  "relative group cursor-pointer hover:transform hover:scale-105 transition-transform duration-200 shadow-lg rounded-md overflow-hidden",
                  gridLayout 
                    ? "w-full max-w-[250px] aspect-[2/3]"
                    : "w-full max-w-[320px] aspect-[2/3] mb-2"
                )}
                onClick={() => handlePageClick(page.id)}
                title={`Click to view ${page.title || `Page ${page.pageNumber}`}`}
              >
                <Image
                  src={page.imageUrls[0]}
                  alt={page.title || `Page ${page.pageNumber}`}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-md"
                  unoptimized={isExternalImage(page.imageUrls[0])}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <p className="text-sm font-semibold truncate">{page.title || `Page ${page.pageNumber}`}</p>
                    {page.pageNumber && <p className="text-xs opacity-80">Page {page.pageNumber}</p>}
                  </div>
                </div>
                <div className="absolute top-0 right-0 bg-black/50 text-white text-xs font-bold py-1 px-2 rounded-bl-md">
                  {page.pageNumber}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Footer */}
      <div className="mt-auto border-t border-border bg-card z-10">
        <PanelActionsFooter 
          actions={footerActions} 
          className="grid-cols-1 sm:grid-cols-2 py-2 px-3 sm:py-3 sm:px-4"
        />
        <div className="text-center text-xs text-muted-foreground pb-1.5">
          {childComicBookPages.length > 0 && 
            `${childComicBookPages.length} page${childComicBookPages.length !== 1 ? 's' : ''}`
          }
        </div>
      </div>
    </Card>
  );
};

export default GroupNodeView; 