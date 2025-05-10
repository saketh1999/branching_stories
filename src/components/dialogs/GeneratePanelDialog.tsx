
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
import { Sparkles, Wand2, Loader2, PlusCircle, XCircle, ImageIcon, UploadCloud, RotateCcw } from 'lucide-react';
import SuggestedPromptsDisplay from './SuggestedPromptsDisplay';
import SetContextImageDialog from './SetContextImageDialog'; // New dialog
import { suggestComicPanelPrompts } from '@/ai/flows/suggest-comic-panel-prompt';
import type { PromptWithContext } from '@/ai/flows/generate-comic-panel'; // Updated import
import { generateComicPanel } from '@/ai/flows/generate-comic-panel';
import type { ComicPanelData } from '@/types/story';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { v4 as uuidv4 } from 'uuid';

interface GeneratePanelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  parentPanel: ComicPanelData | null;
  allPanels: ComicPanelData[]; // All panels for context selection
  onPanelGenerated: (newPanelImageUrls: string[], promptsUsed: string[]) => void;
}

const MAX_PROMPTS = 4;

interface PromptStateItem {
  id: string; // for react key
  text: string;
  customContextImageUrl: string | null; // Data URI for AI if custom
  customContextImagePreviewUrl: string | null; // Data URI for preview in dialog
  // Info about source if selected from previous panel
  sourcePanelId?: string; 
  sourceImageIndex?: number;
}

const GeneratePanelDialog: FC<GeneratePanelDialogProps> = ({ isOpen, onClose, parentPanel, allPanels, onPanelGenerated }) => {
  const [prompts, setPrompts] = useState<PromptStateItem[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const { toast } = useToast();

  const [isSetContextImageDialogOpen, setIsSetContextImageDialogOpen] = useState(false);
  const [editingContextForPromptIndex, setEditingContextForPromptIndex] = useState<number | null>(null);

  const getDefaultContextImageUrl = useCallback(() => {
    return parentPanel?.imageUrls[0] || null;
  }, [parentPanel]);

  // Initialize prompts when dialog opens or parentPanel changes
  useEffect(() => {
    if (isOpen && parentPanel) {
      setPrompts([{ 
        id: uuidv4(), 
        text: '', 
        customContextImageUrl: null, 
        customContextImagePreviewUrl: null 
      }]);
      setSuggestedPrompts([]);
      setIsSuggesting(false);
      setIsGenerating(false);
    }
  }, [isOpen, parentPanel]);

  const handlePromptTextChange = (index: number, value: string) => {
    const newPrompts = [...prompts];
    newPrompts[index].text = value;
    setPrompts(newPrompts);
  };

  const addPromptField = () => {
    if (prompts.length < MAX_PROMPTS) {
      setPrompts([...prompts, { 
        id: uuidv4(), 
        text: '', 
        customContextImageUrl: null,
        customContextImagePreviewUrl: null
      }]);
    }
  };

  const removePromptField = (index: number) => {
    if (prompts.length > 1) {
      const newPrompts = prompts.filter((_, i) => i !== index);
      setPrompts(newPrompts);
    }
  };
  
  const handleSelectSuggestedPrompt = (suggestedPrompt: string) => {
    const emptyIndex = prompts.findIndex(p => p.text.trim() === '');
    if (emptyIndex !== -1) {
      handlePromptTextChange(emptyIndex, suggestedPrompt);
    } else if (prompts.length < MAX_PROMPTS) {
        addPromptField();
        // prompts.length will be the new last index *after* addPromptField updates state,
        // so we need to use the current length for the new field.
        handlePromptTextChange(prompts.length, suggestedPrompt);
    } else { 
      handlePromptTextChange(0, suggestedPrompt);
    }
  };

  const handleSuggestPrompts = async () => {
    if (!parentPanel || parentPanel.imageUrls.length === 0) return;
    setIsSuggesting(true);
    try {
      const textContext = parentPanel.userDescription || parentPanel.promptsUsed?.join('; ') || "A comic panel scene.";
      const result = await suggestComicPanelPrompts({ 
        currentPanelPrimaryImageUrl: parentPanel.imageUrls[0],
        currentPanelTextContext: textContext,
      });
      setSuggestedPrompts(result.suggestedPrompts);
    } catch (error) {
      console.error('Error suggesting prompts:', error);
      toast({ title: "Suggestion Error", description: "Could not fetch prompt suggestions.", variant: "destructive" });
      setSuggestedPrompts([]);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleOpenSetContextImageDialog = (index: number) => {
    setEditingContextForPromptIndex(index);
    setIsSetContextImageDialogOpen(true);
  };

  const handleContextImageSelected = (imageData: { dataUrl: string; previewUrl: string; sourcePanelId?: string; sourceImageIndex?: number }) => {
    if (editingContextForPromptIndex !== null) {
      const newPrompts = [...prompts];
      newPrompts[editingContextForPromptIndex].customContextImageUrl = imageData.dataUrl;
      newPrompts[editingContextForPromptIndex].customContextImagePreviewUrl = imageData.previewUrl;
      newPrompts[editingContextForPromptIndex].sourcePanelId = imageData.sourcePanelId;
      newPrompts[editingContextForPromptIndex].sourceImageIndex = imageData.sourceImageIndex;
      setPrompts(newPrompts);
    }
    setIsSetContextImageDialogOpen(false);
    setEditingContextForPromptIndex(null);
  };

  const handleClearCustomContext = (index: number) => {
    const newPrompts = [...prompts];
    newPrompts[index].customContextImageUrl = null;
    newPrompts[index].customContextImagePreviewUrl = null;
    newPrompts[index].sourcePanelId = undefined;
    newPrompts[index].sourceImageIndex = undefined;
    setPrompts(newPrompts);
  };

  const handleGeneratePanel = async () => {
    if (!parentPanel) return;
    
    const validPrompts = prompts.filter(p => p.text.trim() !== '');
    if (validPrompts.length === 0) {
      toast({ title: "No Prompts", description: "Please enter at least one prompt text.", variant: "destructive"});
      return;
    }

    const promptsForApi: PromptWithContext[] = validPrompts.map(p => ({
      promptText: p.text.trim(),
      contextImageUrl: p.customContextImageUrl || getDefaultContextImageUrl() || '', // Fallback if somehow default is null
    }));

    // Ensure all contextImageUrls are valid
    if (promptsForApi.some(p => !p.contextImageUrl)) {
        toast({ title: "Context Missing", description: "One or more prompts are missing a context image. Please ensure default or custom context is set.", variant: "destructive"});
        return;
    }


    setIsGenerating(true);
    try {
      const result = await generateComicPanel({ promptsWithContext: promptsForApi });
      onPanelGenerated(result.generatedImageUrls, promptsForApi.map(p => p.promptText));
      toast({ title: "Panel Images Generated!", description: `${result.generatedImageUrls.length} new image(s) added.` });
      handleClose();
    } catch (error) {
      console.error('Error generating panel images:', error);
      let description = "Could not generate new panel images. Please try again.";
      if (error instanceof Error) {
        description = error.message;
      }
      toast({ title: "Generation Error", description, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleClose = () => {
    onClose();
  }

  const activePromptsCount = prompts.filter(p => p.text.trim() !== '').length;
  const defaultCtxImg = getDefaultContextImageUrl();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-xl md:max-w-3xl lg:max-w-4xl bg-card">
          <DialogHeader>
            <DialogTitle className="text-2xl text-primary">Generate New Panel Images</DialogTitle>
            <DialogDescription>
              Describe up to {MAX_PROMPTS} images for the next panel. Each prompt generates one image. 
              You can set a custom context image for each prompt, or it will default to the first image of the parent panel.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(70vh-180px)] pr-3">
            <div className="grid gap-4 py-2">
              {prompts.map((promptItem, index) => (
                <div key={promptItem.id} className="p-3 border border-border rounded-md bg-background/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor={`prompt-text-${index}`} className="text-foreground font-semibold">
                      Image {index + 1} Prompt
                    </Label>
                    {prompts.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removePromptField(index)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Textarea
                    placeholder={`E.g., The knight raises a shield...`}
                    id={`prompt-text-${index}`}
                    value={promptItem.text}
                    onChange={(e) => handlePromptTextChange(index, e.target.value)}
                    rows={2}
                    className="text-foreground"
                  />
                  <div className="text-xs text-muted-foreground">Context for Image {index+1}:</div>
                  <div className="flex items-center gap-2">
                    {promptItem.customContextImagePreviewUrl ? (
                       <Image src={promptItem.customContextImagePreviewUrl} alt={`Custom context for prompt ${index + 1}`} width={64} height={48} className="rounded object-contain border" data-ai-hint="context preview small"/>
                    ) : defaultCtxImg ? (
                       <Image src={defaultCtxImg} alt="Default parent panel context" width={64} height={48} className="rounded object-contain border" data-ai-hint="parent context small"/>
                    ) : (
                      <div className="w-16 h-12 flex items-center justify-center bg-muted rounded border text-muted-foreground text-xs">No Ctx</div>
                    )}
                    <div className="flex flex-col gap-1">
                        <Button onClick={() => handleOpenSetContextImageDialog(index)} variant="outline" size="sm" className="text-xs">
                            <ImageIcon className="mr-1 h-3 w-3" /> Set Custom Context
                        </Button>
                        {promptItem.customContextImageUrl && (
                            <Button onClick={() => handleClearCustomContext(index)} variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive/80">
                                <RotateCcw className="mr-1 h-3 w-3" /> Use Default Context
                            </Button>
                        )}
                    </div>
                     {promptItem.customContextImageUrl && promptItem.sourcePanelId && (
                        <p className="text-xs text-muted-foreground ml-2">
                            Using image { (promptItem.sourceImageIndex ?? 0) + 1} from panel <span className="font-medium truncate max-w-[60px] inline-block align-bottom" title={allPanels.find(p=>p.id === promptItem.sourcePanelId)?.title}>{allPanels.find(p=>p.id === promptItem.sourcePanelId)?.title?.substring(0,10) || promptItem.sourcePanelId.substring(0,4)}...</span>
                        </p>
                    )}
                     {promptItem.customContextImageUrl && !promptItem.sourcePanelId && (
                        <p className="text-xs text-muted-foreground ml-2">Using uploaded image.</p>
                    )}
                    {!promptItem.customContextImageUrl && (
                         <p className="text-xs text-muted-foreground ml-2">Using default context (Parent Panel Image 1).</p>
                    )}
                  </div>
                </div>
              ))}
              {prompts.length < MAX_PROMPTS && (
                <Button onClick={addPromptField} variant="outline" size="sm" className="mt-1 justify-start">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Prompt for another Image (up to {MAX_PROMPTS})
                </Button>
              )}
            </div>
          </ScrollArea>

          <div className="mt-4 flex flex-col gap-2">
              <Button onClick={handleSuggestPrompts} disabled={isSuggesting || !parentPanel} variant="outline" size="sm">
                  {isSuggesting ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <Wand2 className="mr-2 h-4 w-4" /> )}
                  Suggest Prompts (uses default context)
              </Button>
              { (suggestedPrompts.length > 0 || isSuggesting) && (
                  <SuggestedPromptsDisplay
                      prompts={suggestedPrompts}
                      onSelectPrompt={handleSelectSuggestedPrompt}
                      isLoading={isSuggesting}
                  />
              )}
          </div>

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            </DialogClose>
            <Button 
              type="button" 
              onClick={handleGeneratePanel} 
              disabled={isGenerating || activePromptsCount === 0 || !parentPanel}
            >
              {isGenerating ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <Sparkles className="mr-2 h-4 w-4" /> )}
              Generate {activePromptsCount > 0 ? `${activePromptsCount} Image(s)` : 'Panel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {parentPanel && editingContextForPromptIndex !== null && (
        <SetContextImageDialog
          isOpen={isSetContextImageDialogOpen}
          onClose={() => {
            setIsSetContextImageDialogOpen(false);
            setEditingContextForPromptIndex(null);
          }}
          allPanels={allPanels}
          parentPanelId={parentPanel.id}
          onContextImageSelected={handleContextImageSelected}
        />
      )}
    </>
  );
};

export default GeneratePanelDialog;
