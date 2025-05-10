
import type { FC, KeyboardEvent } from 'react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ComicPanelData } from '@/types/story';
import { Sparkles, GitFork, Info, Edit3, Check, X, RefreshCcw, Edit2, BookText, FileImage, Maximize2, Minimize2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

interface ComicPanelViewProps {
  panel: ComicPanelData;
  allPanels: ComicPanelData[];
  onGenerateNext: (panelId: string) => void;
  onBranch: (panelId: string) => void;
  onUpdateTitle: (panelId: string, newTitle: string) => void;
  onRegenerateImage: (panelId: string, imageIndex: number, imageUrl: string, originalPrompt?: string) => void;
  onEditPanel: (panelId: string) => void;
}

const ComicPanelView: FC<ComicPanelViewProps> = ({ panel, allPanels, onGenerateNext, onBranch, onUpdateTitle, onRegenerateImage, onEditPanel }) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState(panel.title || '');
  const [isExpanded, setIsExpanded] = useState(false); // For regular panels image view

  useEffect(() => {
    const currentDefaultTitle = panel.isGroupNode 
      ? (panel.userDescription || `Comic Book ${panel.id.substring(0,4)}`) 
      : panel.isComicBookPage 
      ? `Page ${panel.pageNumber}` 
      : (panel.promptsUsed?.[0]?.substring(0,30) || panel.userDescription?.substring(0,30) || `Panel ${panel.id.substring(0,4)}`);
    setEditingTitleValue(panel.title || currentDefaultTitle || '');
  }, [panel.title, panel.id, panel.isGroupNode, panel.isComicBookPage, panel.pageNumber, panel.promptsUsed, panel.userDescription]);

  const handleTitleEditSubmit = () => {
    let currentDefaultTitle = `Panel ${panel.id.substring(0,4)}`;
    if (panel.isGroupNode) {
      currentDefaultTitle = panel.userDescription || `Comic Book ${panel.id.substring(0,4)}`;
    } else if (panel.isComicBookPage) {
      currentDefaultTitle = `Page ${panel.pageNumber}`;
    } else if (panel.promptsUsed && panel.promptsUsed.length > 0) {
      currentDefaultTitle = panel.promptsUsed[0].substring(0,30) + (panel.promptsUsed[0].length > 30 ? '...' : '');
    } else if (panel.userDescription) {
      currentDefaultTitle = panel.userDescription.substring(0,30) + (panel.userDescription.length > 30 ? '...' : '');
    }
    
    if (editingTitleValue.trim() !== (panel.title || '')) {
      onUpdateTitle(panel.id, editingTitleValue.trim() || currentDefaultTitle);
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
  if (panel.isGroupNode && panel.userDescription) {
    descriptionContent = <p className="text-xs sm:text-sm">{panel.userDescription}</p>;
  } else if (panel.isComicBookPage && panel.promptsUsed && panel.promptsUsed.length > 0) {
    descriptionContent = <p className="text-xs sm:text-sm"><strong>Note/Context:</strong> {panel.promptsUsed[0]}</p>;
  } else if (panel.userDescription) {
    descriptionContent = <p className="text-xs sm:text-sm"><strong>Description:</strong> {panel.userDescription}</p>;
  } else if (panel.promptsUsed && panel.promptsUsed.length > 0) {
    descriptionContent = (
      <>
        <p className="font-semibold mb-1 text-xs sm:text-sm">Prompts Used:</p>
        <ul className="list-disc pl-4 space-y-0.5 sm:space-y-1">
          {panel.promptsUsed.map((prompt, index) => (
            <li key={index} className="text-xs"><strong>Img {index + 1}:</strong> {prompt}</li>
          ))}
        </ul>
      </>
    );
  } else {
    descriptionContent = <p className="text-xs sm:text-sm">No detailed description or prompts available.</p>;
  }
  
  const defaultTitle = panel.isGroupNode 
    ? (panel.title || panel.userDescription || `Comic Book ${panel.id.substring(0,4)}`)
    : panel.isComicBookPage 
    ? (panel.title || `Page ${panel.pageNumber}`) 
    : (panel.title || panel.promptsUsed?.[0]?.substring(0,30) || panel.userDescription?.substring(0,30) || `Panel ${panel.id.substring(0,4)}`);
  const displayTitle = panel.title || defaultTitle;

  // Group Node (Comic Book Container) View
  if (panel.isGroupNode) {
    const childComicBookPages = panel.childrenIds
      ? panel.childrenIds
          .map(childId => allPanels.find(p => p.id === childId))
          .filter((child): child is ComicPanelData => !!child && child.isComicBookPage === true)
      : [];

    return (
      <Card className="w-full h-full flex flex-col bg-card shadow-lg border-primary border-2">
        <CardHeader className="p-2 sm:p-3 flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
             {isEditingTitle ? (
              <div className="flex-grow flex items-center gap-1">
                <Input type="text" value={editingTitleValue} onChange={(e) => setEditingTitleValue(e.target.value)} onKeyDown={handleTitleKeyDown} onBlur={handleTitleEditSubmit} autoFocus className="h-8 text-sm w-full"/>
                <Button variant="ghost" size="icon" onClick={handleTitleEditSubmit} className="h-7 w-7 shrink-0"><Check className="h-4 w-4 text-green-500" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { setIsEditingTitle(false); setEditingTitleValue(panel.title || (panel.userDescription || `Comic Book ${panel.id.substring(0,4)}`));}} className="h-7 w-7 shrink-0"><X className="h-4 w-4 text-red-500" /></Button>
              </div>
            ) : (
              <CardTitle className="text-base sm:text-lg font-semibold text-primary truncate cursor-pointer hover:underline flex-grow" title={`Click pencil to edit. ${displayTitle}`} onClick={() => setIsEditingTitle(true)}>
                <BookText className="inline-block mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 align-text-bottom"/>{displayTitle}
              </CardTitle>
            )}
            <div className="flex items-center shrink-0">
              {!isEditingTitle && (
                <TooltipProvider><Tooltip delayDuration={100}><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setIsEditingTitle(true)} className="h-7 w-7"><Edit3 className="h-4 w-4 text-muted-foreground" /></Button></TooltipTrigger><TooltipContent side="top"><p>Edit Comic Book Title</p></TooltipContent></Tooltip></TooltipProvider>
              )}
               {panel.userDescription && (
                <TooltipProvider><Tooltip delayDuration={300}><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Info className="h-4 w-4 text-muted-foreground" /></Button></TooltipTrigger><TooltipContent className="max-w-[200px] sm:max-w-xs break-words p-2 sm:p-3" side="top">{descriptionContent}</TooltipContent></Tooltip></TooltipProvider>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-1 flex-grow relative">
           {childComicBookPages.length === 0 && (
             <div className="absolute inset-0 flex items-center justify-center p-2">
                <p className="text-muted-foreground text-center text-xs sm:text-sm">This comic book is empty. Pages will appear here.</p>
             </div>
           )}
        </CardContent>
        <CardFooter className="p-2 sm:p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t mt-auto flex-shrink-0">
          <TooltipProvider><Tooltip delayDuration={100}><TooltipTrigger asChild>
            <Button onClick={() => onGenerateNext(panel.id)} size="sm" variant="outline" className="text-xs sm:text-sm"><Sparkles className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />Next (After Book)</Button>
          </TooltipTrigger><TooltipContent side="bottom"><p>Generate a new panel after this entire comic book.</p></TooltipContent></Tooltip></TooltipProvider>
          <TooltipProvider><Tooltip delayDuration={100}><TooltipTrigger asChild>
            <Button onClick={() => onBranch(panel.id)} size="sm" variant="outline" className="text-xs sm:text-sm"><GitFork className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />Branch (From Book)</Button>
          </TooltipTrigger><TooltipContent side="bottom"><p>Create a new story branch from this comic book.</p></TooltipContent></Tooltip></TooltipProvider>
        </CardFooter>
      </Card>
    );
  }

  // Comic Book Page View
  if (panel.isComicBookPage) {
    const pageTitle = panel.title || `Page ${panel.pageNumber}`;
    return (
      <Card className={cn("w-[180px] h-[260px] sm:w-[200px] sm:h-[280px] max-w-xs overflow-hidden bg-card shadow-md flex flex-col border-secondary border-2")}>
         <CardHeader className="p-1.5 sm:p-2">
          <div className="flex items-center justify-between gap-1">
            {isEditingTitle ? (
              <div className="flex-grow flex items-center gap-1">
                <Input type="text" value={editingTitleValue} onChange={(e) => setEditingTitleValue(e.target.value)} onKeyDown={handleTitleKeyDown} onBlur={handleTitleEditSubmit} autoFocus className="h-7 text-xs w-full"/>
                 <Button variant="ghost" size="icon" onClick={handleTitleEditSubmit} className="h-6 w-6 shrink-0"><Check className="h-3 w-3 text-green-500" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { setIsEditingTitle(false); setEditingTitleValue(panel.title || `Page ${panel.pageNumber}`);}} className="h-6 w-6 shrink-0"><X className="h-3 w-3 text-red-500" /></Button>
              </div>
            ) : (
              <CardTitle className="text-xs font-semibold text-secondary-foreground truncate flex-grow cursor-pointer hover:underline" title={`Click pencil to edit. ${pageTitle}`} onClick={() => setIsEditingTitle(true)}>
                 <FileImage className="inline-block mr-1 h-3 w-3 align-text-bottom"/>{pageTitle}
              </CardTitle>
            )}
            <div className="flex items-center shrink-0">
             {!isEditingTitle && (
                <TooltipProvider><Tooltip delayDuration={100}><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setIsEditingTitle(true)} className="h-6 w-6"><Edit3 className="h-3 w-3 text-muted-foreground" /></Button></TooltipTrigger><TooltipContent side="top"><p>Edit Page Title/Note</p></TooltipContent></Tooltip></TooltipProvider>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 aspect-[2/3] relative bg-muted flex-grow group cursor-pointer" onClick={() => onRegenerateImage(panel.id, 0, panel.imageUrls[0], panel.promptsUsed?.[0])} title="Click to regenerate this page">
          <Image
            src={panel.imageUrls[0]}
            alt={panel.promptsUsed?.[0] || pageTitle}
            layout="fill"
            objectFit="contain"
            data-ai-hint="comic page"
            className="transition-transform duration-300 ease-in-out group-hover:scale-105"
            sizes="180px sm:200px"
          />
           <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <RefreshCcw className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
        </CardContent>
        <CardFooter className="p-1 grid grid-cols-1 xs:grid-cols-2 gap-1 border-t">
           <TooltipProvider><Tooltip delayDuration={100}><TooltipTrigger asChild>
            <Button onClick={() => onBranch(panel.id)} size="sm" variant="outline" className="text-[10px] px-1 py-0.5 h-6"><GitFork className="mr-1 h-3 w-3" />Branch</Button>
          </TooltipTrigger><TooltipContent side="bottom"><p>Create a new branch from this page.</p></TooltipContent></Tooltip></TooltipProvider>
           <TooltipProvider><Tooltip delayDuration={100}><TooltipTrigger asChild>
            <Button onClick={() => onEditPanel(panel.id)} size="sm" variant="outline" className="text-[10px] px-1 py-0.5 h-6"><Edit2 className="mr-1 h-3 w-3" />Edit Page</Button>
          </TooltipTrigger><TooltipContent side="bottom"><p>Edit prompt/context for this page image.</p></TooltipContent></Tooltip></TooltipProvider>
        </CardFooter>
      </Card>
    );
  }

  // Default Panel View (Multiple Images)
  const hasMultipleImages = panel.imageUrls.length > 1;
  const regularPanelTitle = panel.title || panel.promptsUsed?.[0]?.substring(0,30) || panel.userDescription?.substring(0,30) || `Panel ${panel.id.substring(0,4)}`;
  return (
    <Card className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg overflow-hidden bg-card shadow-md flex flex-col">
      <CardHeader className="p-2 sm:p-3">
        <div className="flex items-center justify-between gap-2">
          {isEditingTitle ? (
            <div className="flex-grow flex items-center gap-1">
              <Input type="text" value={editingTitleValue} onChange={(e) => setEditingTitleValue(e.target.value)} onKeyDown={handleTitleKeyDown} onBlur={handleTitleEditSubmit} autoFocus className="h-8 text-sm w-full flex-grow"/>
              <Button variant="ghost" size="icon" onClick={handleTitleEditSubmit} className="h-7 w-7 shrink-0"><Check className="h-4 w-4 text-green-500" /></Button>
              <Button variant="ghost" size="icon" onClick={() => { setIsEditingTitle(false); setEditingTitleValue(panel.title || regularPanelTitle);}} className="h-7 w-7 shrink-0"><X className="h-4 w-4 text-red-500" /></Button>
            </div>
          ) : (
            <CardTitle className="text-sm sm:text-base font-semibold text-card-foreground truncate cursor-pointer hover:text-primary flex-grow" title={`Click pencil to edit. ${regularPanelTitle}`} onClick={() => setIsEditingTitle(true)}>
              {regularPanelTitle}
            </CardTitle>
          )}
          <div className="flex items-center shrink-0">
             <TooltipProvider><Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-7 w-7">
                        {isExpanded ? <Minimize2 className="h-4 w-4 text-muted-foreground" /> : <Maximize2 className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>{isExpanded ? "Collapse Images" : "Expand Images"}</p></TooltipContent>
            </Tooltip></TooltipProvider>
            {!isEditingTitle && (
              <TooltipProvider><Tooltip delayDuration={100}><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setIsEditingTitle(true)} className="h-7 w-7"><Edit3 className="h-4 w-4 text-muted-foreground" /></Button></TooltipTrigger><TooltipContent side="top"><p>Edit Title</p></TooltipContent></Tooltip></TooltipProvider>
            )}
            {(panel.userDescription || (panel.promptsUsed && panel.promptsUsed.length > 0)) && (
              <TooltipProvider><Tooltip delayDuration={300}><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Info className="h-4 w-4 text-muted-foreground" /></Button></TooltipTrigger><TooltipContent className="max-w-[200px] sm:max-w-xs break-words bg-popover text-popover-foreground p-2 sm:p-3 rounded-md shadow-lg text-xs" side="top">{descriptionContent}</TooltipContent></Tooltip></TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn(
          "p-0 relative bg-muted flex-grow",
          isExpanded ? "aspect-auto" : "aspect-[4/3]",
          hasMultipleImages && !isExpanded && "grid grid-cols-2 grid-rows-2 gap-px",
          hasMultipleImages && isExpanded && "flex flex-col gap-px" // Stack images vertically when expanded
        )}>
        {panel.imageUrls.map((url, index) => (
          <div 
            key={index} 
            className={cn(
              "relative w-full overflow-hidden bg-muted-foreground/10 group cursor-pointer",
              isExpanded ? "h-auto aspect-video" : "h-full" // Adjust height for expanded view
            )}
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
                sizes={isExpanded ? "(max-width: 640px) 90vw, (max-width: 768px) 80vw, 500px" : "(max-width: 640px) 45vw, (max-width: 768px) 40vw, 250px"}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <RefreshCcw className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
        ))}
         {!hasMultipleImages && panel.imageUrls.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground p-2 text-xs sm:text-sm">No images in this panel.</div>
        )}
      </CardContent>
      <CardFooter className="p-2 sm:p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 border-t">
        <TooltipProvider><Tooltip delayDuration={100}><TooltipTrigger asChild><Button onClick={() => onGenerateNext(panel.id)} size="sm" variant="outline" className="text-xs sm:text-sm"><Sparkles className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />Next</Button></TooltipTrigger><TooltipContent side="bottom"><p>Generate next panel sequentially</p></TooltipContent></Tooltip></TooltipProvider>
        <TooltipProvider><Tooltip delayDuration={100}><TooltipTrigger asChild><Button onClick={() => onBranch(panel.id)} size="sm" variant="outline" className="text-xs sm:text-sm"><GitFork className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />Branch</Button></TooltipTrigger><TooltipContent side="bottom"><p>Create a new branch from this panel</p></TooltipContent></Tooltip></TooltipProvider>
        <TooltipProvider><Tooltip delayDuration={100}><TooltipTrigger asChild><Button onClick={() => onEditPanel(panel.id)} size="sm" variant="outline" className="text-xs sm:text-sm"><Edit2 className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />Edit</Button></TooltipTrigger><TooltipContent side="bottom"><p>Edit prompts/contexts for images in this panel</p></TooltipContent></Tooltip></TooltipProvider>
      </CardFooter>
    </Card>
  );
};

export default ComicPanelView;
