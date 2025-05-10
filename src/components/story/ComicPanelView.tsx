
import type { FC, KeyboardEvent } from 'react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ComicPanelData } from '@/types/story';
import { Sparkles, GitFork, Info, Edit3, Check, X, RefreshCcw, Edit2, BookText } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

interface ComicPanelViewProps {
  panel: ComicPanelData;
  onGenerateNext: (panelId: string) => void;
  onBranch: (panelId: string) => void;
  onUpdateTitle: (panelId: string, newTitle: string) => void;
  onRegenerateImage: (panelId: string, imageIndex: number, imageUrl: string, originalPrompt?: string) => void;
  onEditPanel: (panelId: string) => void;
}

const ComicPanelView: FC<ComicPanelViewProps> = ({ panel, onGenerateNext, onBranch, onUpdateTitle, onRegenerateImage, onEditPanel }) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState(panel.title || '');

  useEffect(() => {
    setEditingTitleValue(panel.title || '');
  }, [panel.title]);

  const handleTitleEditSubmit = () => {
    const currentDefaultTitle = panel.isComicBookPage ? `Page ${panel.pageNumber}` : `Panel ${panel.id.substring(0,4)}`;
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
  if (panel.userDescription) {
    descriptionContent = <p><strong>Description:</strong> {panel.userDescription}</p>;
  } else if (panel.promptsUsed && panel.promptsUsed.length > 0) {
    descriptionContent = (
      <>
        <p className="font-semibold mb-1">Prompts Used:</p>
        <ul className="list-disc pl-4 space-y-1">
          {panel.promptsUsed.map((prompt, index) => (
            <li key={index} className="text-xs"><strong>{panel.isComicBookPage ? 'Page Prompt' : `Image ${index + 1}`}:</strong> {prompt}</li>
          ))}
        </ul>
      </>
    );
  } else {
    descriptionContent = <p>No detailed description or prompts available.</p>;
  }
  
  const defaultTitle = panel.isGroupNode 
    ? `Comic Book ${panel.id.substring(0,4)}`
    : panel.isComicBookPage 
    ? `Page ${panel.pageNumber}` 
    : `Panel ${panel.id.substring(0,4)}`;
  const displayTitle = panel.title || defaultTitle;

  // Group Node (Comic Book) View
  if (panel.isGroupNode) {
    return (
      <Card className="w-full h-full flex flex-col bg-card shadow-lg border-primary border-2">
        <CardHeader className="p-3">
          <div className="flex items-center justify-between gap-2">
             {isEditingTitle ? (
              <div className="flex-grow flex items-center gap-1">
                <Input type="text" value={editingTitleValue} onChange={(e) => setEditingTitleValue(e.target.value)} onKeyDown={handleTitleKeyDown} onBlur={handleTitleEditSubmit} autoFocus className="h-8 text-sm"/>
                <Button variant="ghost" size="icon" onClick={handleTitleEditSubmit} className="h-7 w-7"><Check className="h-4 w-4 text-green-500" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { setIsEditingTitle(false); setEditingTitleValue(panel.title || '');}} className="h-7 w-7"><X className="h-4 w-4 text-red-500" /></Button>
              </div>
            ) : (
              <CardTitle className="text-lg font-semibold text-primary truncate cursor-pointer hover:underline" title={`Click pencil to edit. ${displayTitle}`} onClick={() => setIsEditingTitle(true)}>
                <BookText className="inline-block mr-2 h-5 w-5 align-text-bottom"/>{displayTitle}
              </CardTitle>
            )}
            <div className="flex items-center shrink-0">
              {!isEditingTitle && (
                <TooltipProvider><Tooltip delayDuration={100}><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setIsEditingTitle(true)} className="h-7 w-7"><Edit3 className="h-4 w-4 text-muted-foreground" /></Button></TooltipTrigger><TooltipContent side="top"><p>Edit Title</p></TooltipContent></Tooltip></TooltipProvider>
              )}
               {panel.userDescription && (
                <TooltipProvider><Tooltip delayDuration={300}><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Info className="h-4 w-4 text-muted-foreground" /></Button></TooltipTrigger><TooltipContent className="max-w-xs break-words p-3" side="top">{descriptionContent}</TooltipContent></Tooltip></TooltipProvider>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 flex-grow flex items-center justify-center">
          <p className="text-muted-foreground text-sm">{panel.childrenIds.length} page(s) in this comic book.</p>
          {/* This area is where child page nodes will be rendered by ReactFlow due to parentNode styling */}
        </CardContent>
        <CardFooter className="p-3 grid grid-cols-2 gap-2 border-t mt-auto">
          <Button onClick={() => onGenerateNext(panel.id)} size="sm" variant="outline" className="text-xs sm:text-sm"><Sparkles className="mr-1 h-4 w-4" />Next (After Book)</Button>
          <Button onClick={() => onBranch(panel.id)} size="sm" variant="outline" className="text-xs sm:text-sm"><GitFork className="mr-1 h-4 w-4" />Branch (From Book)</Button>
        </CardFooter>
      </Card>
    );
  }

  // Comic Book Page View
  if (panel.isComicBookPage) {
    return (
      <Card className={cn("w-[200px] h-[280px] max-w-xs overflow-hidden bg-card shadow-md flex flex-col", panel.isComicBookPage && "border-secondary")}>
         <CardHeader className="p-2">
          <div className="flex items-center justify-between gap-1">
            {isEditingTitle ? (
              <div className="flex-grow flex items-center gap-1">
                <Input type="text" value={editingTitleValue} onChange={(e) => setEditingTitleValue(e.target.value)} onKeyDown={handleTitleKeyDown} onBlur={handleTitleEditSubmit} autoFocus className="h-7 text-xs"/>
              </div>
            ) : (
              <CardTitle className="text-xs font-semibold text-card-foreground truncate" title={displayTitle}>
                {displayTitle}
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
            alt={panel.promptsUsed?.[0] || `Page ${panel.pageNumber}`}
            layout="fill"
            objectFit="contain"
            data-ai-hint="comic page"
            className="transition-transform duration-300 ease-in-out group-hover:scale-105"
          />
           <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <RefreshCcw className="w-6 h-6 text-white" />
            </div>
        </CardContent>
        <CardFooter className="p-2 grid grid-cols-2 gap-1">
          <Button onClick={() => onBranch(panel.id)} size="sm" variant="outline" className="text-[10px] px-1 py-0.5 h-auto"><GitFork className="mr-1 h-3 w-3" />Branch</Button>
          <Button onClick={() => onEditPanel(panel.id)} size="sm" variant="outline" className="text-[10px] px-1 py-0.5 h-auto"><Edit2 className="mr-1 h-3 w-3" />Edit</Button>
        </CardFooter>
      </Card>
    );
  }

  // Default Panel View (Multiple Images)
  const hasMultipleImages = panel.imageUrls.length > 1;
  return (
    <Card className="w-72 sm:w-80 md:w-96 max-w-sm overflow-hidden bg-card shadow-md flex flex-col">
      <CardHeader className="p-3">
        <div className="flex items-center justify-between gap-2">
          {isEditingTitle ? (
            <div className="flex-grow flex items-center gap-1">
              <Input type="text" value={editingTitleValue} onChange={(e) => setEditingTitleValue(e.target.value)} onKeyDown={handleTitleKeyDown} onBlur={handleTitleEditSubmit} autoFocus className="h-8 text-sm flex-grow"/>
              <Button variant="ghost" size="icon" onClick={handleTitleEditSubmit} className="h-7 w-7 shrink-0"><Check className="h-4 w-4 text-green-500" /></Button>
              <Button variant="ghost" size="icon" onClick={() => { setIsEditingTitle(false); setEditingTitleValue(panel.title || '');}} className="h-7 w-7 shrink-0"><X className="h-4 w-4 text-red-500" /></Button>
            </div>
          ) : (
            <CardTitle className="text-base font-semibold text-card-foreground truncate cursor-pointer hover:text-primary" title={`Click pencil to edit. ${displayTitle}`} onClick={() => setIsEditingTitle(true)}>
              {displayTitle}
            </CardTitle>
          )}
          <div className="flex items-center shrink-0">
            {!isEditingTitle && (
              <TooltipProvider><Tooltip delayDuration={100}><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setIsEditingTitle(true)} className="h-7 w-7"><Edit3 className="h-4 w-4 text-muted-foreground" /></Button></TooltipTrigger><TooltipContent side="top"><p>Edit Title</p></TooltipContent></Tooltip></TooltipProvider>
            )}
            {(panel.userDescription || (panel.promptsUsed && panel.promptsUsed.length > 0)) && (
              <TooltipProvider><Tooltip delayDuration={300}><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Info className="h-4 w-4 text-muted-foreground" /></Button></TooltipTrigger><TooltipContent className="max-w-xs break-words bg-popover text-popover-foreground p-3 rounded-md shadow-lg text-xs" side="top">{descriptionContent}</TooltipContent></Tooltip></TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("p-0 aspect-[4/3] relative bg-muted flex-grow", hasMultipleImages && "grid grid-cols-2 grid-rows-2 gap-px")}>
        {panel.imageUrls.map((url, index) => (
          <div key={index} className="relative w-full h-full overflow-hidden bg-muted-foreground/10 group cursor-pointer" onClick={() => onRegenerateImage(panel.id, index, url, panel.promptsUsed?.[index])} title="Click to regenerate this image">
            <Image src={url} alt={panel.promptsUsed?.[index] || panel.userDescription || `Comic panel image ${index + 1}`} layout="fill" objectFit="contain" data-ai-hint="comic panel image" className="transition-transform duration-300 ease-in-out group-hover:scale-105"/>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><RefreshCcw className="w-8 h-8 text-white" /></div>
          </div>
        ))}
      </CardContent>
      <CardFooter className="p-3 grid grid-cols-3 gap-2">
        <TooltipProvider><Tooltip delayDuration={100}><TooltipTrigger asChild><Button onClick={() => onGenerateNext(panel.id)} size="sm" variant="outline" className="text-xs sm:text-sm"><Sparkles className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />Next</Button></TooltipTrigger><TooltipContent side="bottom"><p>Generate next panel sequentially</p></TooltipContent></Tooltip></TooltipProvider>
        <TooltipProvider><Tooltip delayDuration={100}><TooltipTrigger asChild><Button onClick={() => onBranch(panel.id)} size="sm" variant="outline" className="text-xs sm:text-sm"><GitFork className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />Branch</Button></TooltipTrigger><TooltipContent side="bottom"><p>Create a new branch from this panel</p></TooltipContent></Tooltip></TooltipProvider>
        <TooltipProvider><Tooltip delayDuration={100}><TooltipTrigger asChild><Button onClick={() => onEditPanel(panel.id)} size="sm" variant="outline" className="text-xs sm:text-sm"><Edit2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />Edit</Button></TooltipTrigger><TooltipContent side="bottom"><p>Edit prompts/contexts for images in this panel</p></TooltipContent></Tooltip></TooltipProvider>
      </CardFooter>
    </Card>
  );
};

export default ComicPanelView;
