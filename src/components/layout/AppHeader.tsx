
import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { BookImage, PlusSquare, Trash2, BookOpenCheck } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle'; // Assuming ThemeToggle is extracted

interface AppHeaderProps {
  onUploadInitialPanel: () => void;
  onUploadComicBook: () => void;
  onNewStory: () => void;
  hasStory: boolean;
}

const AppHeader: FC<AppHeaderProps> = ({ onUploadInitialPanel, onUploadComicBook, onNewStory, hasStory }) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <BookImage className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Branching Tales
          </h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <TooltipProviderWrapper>
            <TooltipWrapper text="Add Panel Images">
              <Button variant="outline" size="icon" className="h-9 w-9 sm:w-auto sm:px-3" onClick={onUploadInitialPanel}>
                <PlusSquare className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Add Images</span>
              </Button>
            </TooltipWrapper>
            <TooltipWrapper text="Upload Comic Book">
              <Button variant="outline" size="icon" className="h-9 w-9 sm:w-auto sm:px-3" onClick={onUploadComicBook}>
                <BookOpenCheck className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Upload Book</span>
              </Button>
            </TooltipWrapper>
            <TooltipWrapper text="New Story">
              <Button variant="destructive" size="icon" className="h-9 w-9 sm:w-auto sm:px-3" onClick={onNewStory} disabled={!hasStory}>
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">New Story</span>
              </Button>
            </TooltipWrapper>
          </TooltipProviderWrapper>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

// Helper components for Tooltips to avoid clutter
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const TooltipProviderWrapper: FC<{children: React.ReactNode}> = ({ children }) => (
  <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
);

const TooltipWrapper: FC<{children: React.ReactNode, text: string}> = ({ children, text }) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent className="sm:hidden"> 
      <p>{text}</p>
    </TooltipContent>
  </Tooltip>
);

export default AppHeader;
