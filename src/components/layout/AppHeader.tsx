
import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { BookImage, PlusSquare, Trash2 } from 'lucide-react';

interface AppHeaderProps {
  onUploadInitialPanel: () => void;
  onNewStory: () => void;
  hasStory: boolean;
}

const AppHeader: FC<AppHeaderProps> = ({ onUploadInitialPanel, onNewStory, hasStory }) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <BookImage className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Branching Tales</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onUploadInitialPanel} disabled={hasStory}>
            <PlusSquare className="mr-2 h-4 w-4" />
            Upload First Panel Images
          </Button>
          <Button variant="destructive" onClick={onNewStory} disabled={!hasStory}>
            <Trash2 className="mr-2 h-4 w-4" />
            New Story
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
