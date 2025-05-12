import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, ChevronDown, Pencil, Trash2, FilePlus } from 'lucide-react';
import type { ComicStoryInfo, StoriesCollection } from '@/types/story';

interface StoryPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  storiesCollection: StoriesCollection;
  onCreateNewStory: (title: string) => Promise<string>;
  onSwitchStory: (storyId: string) => Promise<boolean>;
  onDeleteStory: (storyId: string) => Promise<boolean>;
  onUpdateStoryTitle: (storyId: string, newTitle: string) => Promise<boolean>;
}

function StoryPickerDialog({
  isOpen,
  onClose,
  storiesCollection,
  onCreateNewStory,
  onSwitchStory,
  onDeleteStory,
  onUpdateStoryTitle
}: StoryPickerDialogProps) {
  const [newStoryTitle, setNewStoryTitle] = useState('');
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');

  const handleCreateStory = async () => {
    if (newStoryTitle.trim()) {
      await onCreateNewStory(newStoryTitle);
      setNewStoryTitle('');
      onClose();
    }
  };

  const handleStartEditingStory = (story: ComicStoryInfo) => {
    setEditingStoryId(story.id);
    setEditedTitle(story.title);
  };

  const handleSaveEditedTitle = async (storyId: string) => {
    if (editedTitle.trim()) {
      await onUpdateStoryTitle(storyId, editedTitle);
      setEditingStoryId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your Stories</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col space-y-4 max-h-[60vh] overflow-y-auto py-4">
          {/* Create new story input */}
          <div className="flex items-center space-x-2">
            <Input
              placeholder="New story title"
              value={newStoryTitle}
              onChange={(e) => setNewStoryTitle(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" onClick={handleCreateStory}>
              <Plus className="h-4 w-4 mr-1" />
              Create
            </Button>
          </div>

          {/* Stories list */}
          <div className="mt-4 space-y-2">
            {storiesCollection.stories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No stories yet. Create your first one!
              </p>
            ) : (
              storiesCollection.stories
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .map((story) => (
                  <div
                    key={story.id}
                    className={`flex items-center justify-between p-3 rounded-md border ${
                      story.id === storiesCollection.activeStoryId
                        ? 'bg-primary/10 border-primary'
                        : 'bg-card border-border'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      {editingStoryId === story.id ? (
                        <div className="flex space-x-2">
                          <Input
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            autoFocus
                            className="flex-1"
                          />
                          <Button size="sm" onClick={() => handleSaveEditedTitle(story.id)}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingStoryId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium truncate">{story.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Updated: {new Date(story.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex space-x-1">
                            {story.id !== storiesCollection.activeStoryId && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onSwitchStory(story.id)}
                              >
                                Open
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleStartEditingStory(story)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => onDeleteStory(story.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-end">
          <DialogClose asChild>
            <Button variant="secondary">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface StorySelectorProps {
  storiesCollection: StoriesCollection;
  activeStory: ComicStoryInfo | null;
  onCreateNewStory: (title: string) => Promise<string>;
  onSwitchStory: (storyId: string) => Promise<boolean>;
  onDeleteStory: (storyId: string) => Promise<boolean>;
  onUpdateStoryTitle: (storyId: string, newTitle: string) => Promise<boolean>;
}

export default function StorySelector({
  storiesCollection,
  activeStory,
  onCreateNewStory,
  onSwitchStory,
  onDeleteStory,
  onUpdateStoryTitle,
}: StorySelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center min-w-[180px] justify-between">
            <span className="truncate">
              {activeStory?.title || "Select a story"}
            </span>
            <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          {storiesCollection.stories.length > 0 ? (
            storiesCollection.stories
              .slice(0, 5) // Show only most recent 5 in dropdown
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((story) => (
                <DropdownMenuItem
                  key={story.id}
                  onClick={() => story.id !== storiesCollection.activeStoryId && onSwitchStory(story.id)}
                  className={story.id === storiesCollection.activeStoryId ? "bg-primary/10" : ""}
                >
                  <span className="truncate">{story.title}</span>
                </DropdownMenuItem>
              ))
          ) : (
            <DropdownMenuItem disabled>No stories</DropdownMenuItem>
          )}
          
          <DropdownMenuItem onClick={() => setIsDialogOpen(true)} className="border-t mt-1 pt-1">
            <FilePlus className="h-4 w-4 mr-2" />
            Manage Stories
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" size="icon" onClick={() => setIsDialogOpen(true)} title="Create new story">
        <Plus className="h-4 w-4" />
      </Button>

      <StoryPickerDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        storiesCollection={storiesCollection}
        onCreateNewStory={onCreateNewStory}
        onSwitchStory={onSwitchStory}
        onDeleteStory={onDeleteStory}
        onUpdateStoryTitle={onUpdateStoryTitle}
      />
    </div>
  );
} 