import type { FC } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ComicPanelData } from '@/types/story';
import { Sparkles, GitFork, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ComicPanelViewProps {
  panel: ComicPanelData;
  onGenerateNext: (panelId: string) => void;
  onBranch: (panelId: string) => void;
}

const ComicPanelView: FC<ComicPanelViewProps> = ({ panel, onGenerateNext, onBranch }) => {
  const panelTitle = panel.parentId ? `Panel ${panel.id.substring(0,4)}...` : "Initial Panel";
  const description = panel.promptUsed || panel.userDescription;

  return (
    <Card className="w-72 sm:w-80 md:w-96 max-w-sm overflow-hidden bg-card shadow-md"> {/* Fixed width for consistency in ReactFlow */}
      <CardHeader className="p-3">
        <CardTitle className="flex items-center justify-between text-base font-semibold text-card-foreground truncate">
          <span className="truncate" title={panelTitle}>{panelTitle}</span>
          {description && (
             <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                     <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs break-words bg-popover text-popover-foreground p-2 rounded-md shadow-lg text-xs" side="top">
                  <p>{description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 aspect-[4/3] relative bg-muted">
        <Image
          src={panel.imageUrl}
          alt={description || `Comic panel ${panel.id}`}
          layout="fill"
          objectFit="contain" // Changed to contain to ensure whole image is visible
          data-ai-hint="comic panel full"
        />
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
