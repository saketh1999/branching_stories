import type { FC, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { BookImage, PlusSquare, Trash2, Home } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle'; 
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AppHeaderProps {
  onUploadInitialPanel: () => void;
  onUploadComicBook: () => void;
  onNewStory: () => void;
  hasStory: boolean;
  onNavigateHome: () => void;
  storySelector?: ReactNode;
}

const AppHeader: FC<AppHeaderProps> = ({ 
  onUploadInitialPanel, 
  onUploadComicBook, 
  onNewStory, 
  hasStory, 
  onNavigateHome,
  storySelector
}) => {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 sm:h-16 max-w-full items-center justify-between px-2 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <BookImage 
            className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary cursor-pointer" 
            onClick={onNavigateHome}
          />
          <h1 
            className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground cursor-pointer"
            onClick={onNavigateHome}
          >
            Branching Tales
          </h1>
          {storySelector && (
            <div className="ml-4">
              {storySelector}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 xs:gap-2 sm:gap-2.5 md:gap-3">
          <TooltipProvider delayDuration={200}>
            <TooltipWrapper text="Home">
              <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-auto sm:px-2 md:px-3" onClick={onNavigateHome}>
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline ml-1.5 sm:ml-2 text-xs sm:text-sm">Home</span>
              </Button>
            </TooltipWrapper>
            <TooltipWrapper text="Add Panel Images">
              <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-auto sm:px-2 md:px-3" onClick={onUploadInitialPanel}>
                <PlusSquare className="h-4 w-4" />
                <span className="hidden sm:inline ml-1.5 sm:ml-2 text-xs sm:text-sm">Add Images</span>
              </Button>
            </TooltipWrapper>
            <TooltipWrapper text="New Story">
              <Button variant="destructive" size="icon" className="h-8 w-8 sm:h-9 sm:w-auto sm:px-2 md:px-3" onClick={onNewStory} disabled={!hasStory}>
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline ml-1.5 sm:ml-2 text-xs sm:text-sm">New Story</span>
              </Button>
            </TooltipWrapper>
          </TooltipProvider>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

const TooltipWrapper: FC<{children: React.ReactNode, text: string}> = ({ children, text }) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent className="sm:hidden"> 
      <p>{text}</p>
    </TooltipContent>
  </Tooltip>
);

export default AppHeader;

