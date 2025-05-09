import type { FC } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ComicPanelData } from '@/types/story';
import { Sparkles, GitFork, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ComicPanelViewProps {
  panel: ComicPanelData;
  onGenerateNext: (panelId: string) => void;
  onBranch: (panelId: string) => void;
  isLeafNode?: boolean; // Optional: to indicate if this panel can have more children
}

const ComicPanelView: FC<ComicPanelViewProps> = ({ panel, onGenerateNext, onBranch }) => {
  const panelTitle = panel.parentId ? `Panel ${panel.id.substring(0,4)}` : "Initial Panel";
  const description = panel.promptUsed || panel.userDescription;

  return (
    <Card className="w-full max-w-sm overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card">
      <CardHeader className="p-4">
        <CardTitle className="flex items-center justify-between text-lg font-semibold text-card-foreground">
          {panelTitle}
          {description && (
             <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs break-words">
                  <p className="text-xs">{description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 aspect-[4/3] relative">
        <Image
          src={panel.imageUrl}
          alt={description || `Comic panel ${panel.id}`}
          layout="fill"
          objectFit="contain"
          className="bg-muted"
          data-ai-hint="comic panel"
        />
      </CardContent>
      <CardFooter className="p-4 grid grid-cols-2 gap-2">
        <Button onClick={() => onGenerateNext(panel.id)} size="sm" variant="outline">
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Next
        </Button>
        <Button onClick={() => onBranch(panel.id)} size="sm" variant="outline">
          <GitFork className="mr-2 h-4 w-4" />
          Branch Story
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ComicPanelView;
