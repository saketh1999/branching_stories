
import type { FC } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ComicPanelData } from '@/types/story';
import { Sparkles, GitFork, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

interface ComicPanelViewProps {
  panel: ComicPanelData;
  onGenerateNext: (panelId: string) => void;
  onBranch: (panelId: string) => void;
}

const ComicPanelView: FC<ComicPanelViewProps> = ({ panel, onGenerateNext, onBranch }) => {
  const panelTitle = panel.parentId ? `Panel ${panel.id.substring(0,4)}...` : "Initial Panel";
  
  let descriptionContent: React.ReactNode;
  if (panel.userDescription) {
    descriptionContent = <p>{panel.userDescription}</p>;
  } else if (panel.promptsUsed && panel.promptsUsed.length > 0) {
    descriptionContent = (
      <ul className="list-disc pl-4">
        {panel.promptsUsed.map((prompt, index) => (
          <li key={index} className="text-xs"><strong>Image {index + 1}:</strong> {prompt}</li>
        ))}
      </ul>
    );
  } else {
    descriptionContent = <p>No description available.</p>;
  }

  const hasMultipleImages = panel.imageUrls.length > 1;

  return (
    <Card className="w-72 sm:w-80 md:w-96 max-w-sm overflow-hidden bg-card shadow-md">
      <CardHeader className="p-3">
        <CardTitle className="flex items-center justify-between text-base font-semibold text-card-foreground truncate">
          <span className="truncate" title={panelTitle}>{panelTitle}</span>
          {(panel.userDescription || (panel.promptsUsed && panel.promptsUsed.length > 0)) && (
             <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                     <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent 
                    className="max-w-xs break-words bg-popover text-popover-foreground p-2 rounded-md shadow-lg text-xs" 
                    side="top"
                    // Allow interaction if content is complex, e.g. scrollable if many prompts
                    // onPointerDownOutside={(e) => e.preventDefault()} 
                >
                  {descriptionContent}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn(
        "p-0 aspect-[4/3] relative bg-muted",
        hasMultipleImages && "grid grid-cols-2 grid-rows-2 gap-px" // gap-px for thin lines
      )}>
        {panel.imageUrls.map((url, index) => (
          <div key={index} className="relative w-full h-full overflow-hidden bg-muted-foreground/10">
            <Image
              src={url}
              alt={panel.promptsUsed?.[index] || panel.userDescription || `Comic panel image ${index + 1}`}
              layout="fill"
              objectFit="contain"
              data-ai-hint="comic panel image"
              className="transition-transform duration-300 ease-in-out hover:scale-105"
            />
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
