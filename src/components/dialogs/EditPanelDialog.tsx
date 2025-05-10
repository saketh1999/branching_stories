
import type { FC } from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Loader2, Sparkles, ImageIcon, RotateCcw, RefreshCcw } from 'lucide-react';
import SetContextImageDialog from './SetContextImageDialog';
import { regenerateSingleImage } from '@/ai/flows/regenerate-single-image';
import type { ComicPanelData } from '@/types/story';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

export interface ImageEditState {
  id: string; 
  originalImageUrl: string;
  originalPrompt?: string;
  
  currentImageUrl: string; 
  currentPrompt: string;
  
  contextImageUrlForAI: string; 
  contextImagePreviewUrl: string;
  sourcePanelId?: string; 
  sourceImageIndex?: number;
  
  isModified: boolean; 
}

interface EditPanelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  panelToEdit: ComicPanelData | null;
  allPanels: ComicPanelData[];
  onPanelImagesUpdated: (
    panelId: string,
    updates: Array<{ imageIndex: number; newImageUrl: string; newPromptText: string }>
  ) => void;
}

const EditPanelDialog: FC<EditPanelDialogProps> = ({ 
  isOpen, 
  onClose, 
  panelToEdit, 
  allPanels, 
  onPanelImagesUpdated 
}) => {
  const [imageStates, setImageStates] = useState<ImageEditState[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSetContextImageDialogOpen, setIsSetContextImageDialogOpen] = useState(false);
  const [editingContextForImageEditStateIndex, setEditingContextForImageEditStateIndex] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && panelToEdit) {
      const initialStates: ImageEditState[] = panelToEdit.imageUrls.map((imgUrl, index) => ({
        id: uuidv4(),
        originalImageUrl: imgUrl,
        originalPrompt: panelToEdit.promptsUsed?.[index] || '',
        currentImageUrl: imgUrl, 
        currentPrompt: panelToEdit.promptsUsed?.[index] || '',
        contextImageUrlForAI: imgUrl, 
        contextImagePreviewUrl: imgUrl,
        isModified: false,
      }));
      setImageStates(initialStates);
    } else {
      setImageStates([]); 
    }
  }, [isOpen, panelToEdit]);

  const handlePromptChange = (stateIndex: number, newPrompt: string) => {
    setImageStates(prev => prev.map((state, idx) => 
      idx === stateIndex ? { ...state, currentPrompt: newPrompt, isModified: true } : state
    ));
  };

  const handleOpenSetContextDialog = (stateIndex: number) => {
    setEditingContextForImageEditStateIndex(stateIndex);
    setIsSetContextImageDialogOpen(true);
  };

  const handleContextImageSelected = (imageData: { dataUrl: string; previewUrl: string; sourcePanelId?: string; sourceImageIndex?: number }) => {
    if (editingContextForImageEditStateIndex !== null) {
      setImageStates(prev => prev.map((state, idx) => 
        idx === editingContextForImageEditStateIndex ? { 
          ...state, 
          contextImageUrlForAI: imageData.dataUrl,
          contextImagePreviewUrl: imageData.previewUrl,
          sourcePanelId: imageData.sourcePanelId,
          sourceImageIndex: imageData.sourceImageIndex,
          isModified: true 
        } : state
      ));
    }
    setIsSetContextImageDialogOpen(false);
    setEditingContextForImageEditStateIndex(null);
  };

  const handleClearCustomContext = (stateIndex: number) => {
    setImageStates(prev => prev.map((state, idx) => 
      idx === stateIndex ? { 
        ...state, 
        contextImageUrlForAI: state.originalImageUrl, 
        contextImagePreviewUrl: state.originalImageUrl,
        sourcePanelId: undefined,
        sourceImageIndex: undefined,
        isModified: true 
      } : state
    ));
  };

  const handleSaveChanges = async () => {
    if (!panelToEdit) return;

    const modifiedImageUpdates: Array<{ imageIndex: number; newPromptText: string; contextImageUrl: string }> = [];
    imageStates.forEach((state, index) => {
      if (state.isModified) {
        modifiedImageUpdates.push({
          imageIndex: index,
          newPromptText: state.currentPrompt.trim(),
          contextImageUrl: state.contextImageUrlForAI,
        });
      }
    });

    if (modifiedImageUpdates.length === 0) {
      toast({ title: "No Changes", description: "No images were modified." });
      onClose();
      return;
    }

    setIsGenerating(true);
    const regenerationPromises = modifiedImageUpdates.map(update => 
      regenerateSingleImage({
        newPromptText: update.newPromptText,
        contextImageUrl: update.contextImageUrl,
      }).then(result => ({ ...update, newImageUrl: result.generatedImageUrl }))
      .catch(error => {
        console.error(`Error regenerating image at index ${update.imageIndex}:`, error);
        toast({ title: `Regen Error (Image ${update.imageIndex+1})`, description: error instanceof Error ? error.message : "Failed to regenerate.", variant: "destructive"});
        return { ...update, newImageUrl: imageStates[update.imageIndex].currentImageUrl }; 
      })
    );

    try {
      const results = await Promise.all(regenerationPromises);
      const finalUpdates = results.map(result => ({
        imageIndex: result.imageIndex,
        newImageUrl: result.newImageUrl,
        newPromptText: result.newPromptText,
      }));
      
      onPanelImagesUpdated(panelToEdit.id, finalUpdates);
      toast({ title: "Panel Updated!", description: `${modifiedImageUpdates.length} image(s) processed.` });
      onClose();
    } catch (error) { 
      console.error('Error in batch regeneration process:', error);
      toast({ title: "Update Error", description: "An issue occurred while updating panel images.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!panelToEdit) return null;

  const modifiedCount = imageStates.filter(s => s.isModified).length;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-full max-w-sm sm:max-w-2xl md:max-w-4xl lg:max-w-5xl bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl text-primary">Edit Panel: {panelToEdit.title || `Panel ${panelToEdit.id.substring(0,4)}`}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Modify prompts and context images for each image in this panel. Click "Apply Changes" to regenerate modified images.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] sm:max-h-[calc(70vh-150px)] p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 py-4">
              {imageStates.map((state, index) => (
                <div key={state.id} className="p-2 sm:p-3 border border-border rounded-md bg-background/50 space-y-2 sm:space-y-3">
                  <Label className="text-sm sm:text-base font-semibold text-foreground">Image {index + 1}</Label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start">
                    <div className="w-full sm:w-1/3 aspect-square relative bg-muted rounded border overflow-hidden shrink-0">
                      <Image 
                        src={state.currentImageUrl} 
                        alt={`Current image ${index + 1}`} 
                        layout="fill" 
                        objectFit="contain" 
                        data-ai-hint="panel image large"
                        sizes="(max-width: 640px) 80vw, (max-width: 768px) 30vw, 200px"
                        />
                       {state.isModified && (
                        <div className="absolute top-1 right-1 bg-primary/80 text-primary-foreground text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full flex items-center">
                          <RefreshCcw size={10} className="mr-1 sm:size-3"/> Modified
                        </div>
                      )}
                    </div>
                    <div className="flex-grow space-y-1.5 sm:space-y-2 w-full sm:w-2/3">
                      <div>
                        <Label htmlFor={`edit-prompt-${index}`} className="text-xs sm:text-sm text-muted-foreground">Prompt</Label>
                        <Textarea
                          id={`edit-prompt-${index}`}
                          placeholder="Enter new prompt..."
                          value={state.currentPrompt}
                          onChange={(e) => handlePromptChange(index, e.target.value)}
                          rows={2}
                          className="text-foreground mt-1 text-sm"
                        />
                        {state.originalPrompt && state.originalPrompt !== state.currentPrompt && (
                            <p className="text-xs text-muted-foreground mt-1">Original: "{state.originalPrompt.substring(0,25)}..."</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs sm:text-sm text-muted-foreground">Context Image for AI</Label>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
                          <div className="w-12 h-9 sm:w-16 sm:h-12 relative bg-muted rounded border overflow-hidden shrink-0">
                            <Image 
                              src={state.contextImagePreviewUrl} 
                              alt={`Context for image ${index + 1}`} 
                              layout="fill" objectFit="contain" 
                              data-ai-hint="context preview small" 
                              sizes="48px sm:64px"
                              />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button onClick={() => handleOpenSetContextDialog(index)} variant="outline" size="sm" className="text-[10px] sm:text-xs px-2 h-7 sm:h-8">
                              <ImageIcon className="mr-1 h-3 w-3" /> Set Context
                            </Button>
                            {state.contextImageUrlForAI !== state.originalImageUrl && (
                              <Button onClick={() => handleClearCustomContext(index)} variant="ghost" size="sm" className="text-[10px] sm:text-xs text-destructive hover:text-destructive/80 px-2 h-7 sm:h-8">
                                <RotateCcw className="mr-1 h-3 w-3" /> Use Original
                              </Button>
                            )}
                          </div>
                        </div>
                        {state.sourcePanelId && (
                             <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                                Using img { (state.sourceImageIndex ?? 0) + 1} from <span className="font-medium truncate max-w-[50px] sm:max-w-[60px] inline-block align-bottom" title={allPanels.find(p=>p.id === state.sourcePanelId)?.title}>{allPanels.find(p=>p.id === state.sourcePanelId)?.title?.substring(0,10) || state.sourcePanelId.substring(0,4)}...</span>
                            </p>
                        )}
                         {state.contextImageUrlForAI !== state.originalImageUrl && !state.sourcePanelId && (
                             <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Using uploaded context.</p>
                         )}
                         {state.contextImageUrlForAI === state.originalImageUrl && (
                             <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Using its original image as context.</p>
                         )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
            </DialogClose>
            <Button 
              type="button" 
              onClick={handleSaveChanges} 
              disabled={isGenerating || modifiedCount === 0}
              className="w-full sm:w-auto"
            >
              {isGenerating ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <Sparkles className="mr-2 h-4 w-4" /> )}
              Apply Changes ({modifiedCount})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {panelToEdit && editingContextForImageEditStateIndex !== null && (
        <SetContextImageDialog
          isOpen={isSetContextImageDialogOpen}
          onClose={() => {
            setIsSetContextImageDialogOpen(false);
            setEditingContextForImageEditStateIndex(null);
          }}
          allPanels={allPanels}
          parentPanelId={panelToEdit.id} 
          onContextImageSelected={handleContextImageSelected}
        />
      )}
    </>
  );
};

export default EditPanelDialog;
