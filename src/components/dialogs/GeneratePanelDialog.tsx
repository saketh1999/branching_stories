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
import SetContextImageDialog from './SetContextImageDialog';
import { suggestComicPanelPrompts } from '@/ai/flows/suggest-comic-panel-prompt';
import type { PromptWithContext } from '@/ai/flows/generate-comic-panel';
import { generateComicPanel } from '@/ai/flows/generate-comic-panel';
import type { ComicPanelData } from '@/types/story';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { v4 as uuidv4 } from 'uuid';
import { Switch } from '@/components/ui/switch';
import { ModelChoice } from '@/ai/flows/suggest-comic-panel-prompt';

interface GeneratePanelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  parentPanel: ComicPanelData | null;
  allPanels: ComicPanelData[];
  onPanelGenerated: (newPanelImageUrls: string[], promptsUsed: string[]) => void;
}

const MAX_PROMPTS = 4;

interface PromptStateItem {
  id: string;
  text: string;
  customContextImageUrl: string | null;
  customContextImagePreviewUrl: string | null;
  sourcePanelId?: string; 
  sourceImageIndex?: number;
}

/**
 * Helper function to determine if a URL is an external image (like Vercel Blob)
 */
const isExternalImage = (url: string): boolean => {
  return (
    url.startsWith('https://') && 
    (url.includes('blob.vercel-storage.com') || 
     url.includes('amazonaws.com') || 
     url.includes('cloudinary.com'))
  );
};

const GeneratePanelDialog: FC<GeneratePanelDialogProps> = ({ isOpen, onClose, parentPanel, allPanels, onPanelGenerated }) => {
  const [prompts, setPrompts] = useState<PromptStateItem[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [modelChoice, setModelChoice] = useState<ModelChoice>('gemini');
  const { toast } = useToast();

  const [isSetContextImageDialogOpen, setIsSetContextImageDialogOpen] = useState(false);
  const [editingContextForPromptIndex, setEditingContextForPromptIndex] = useState<number | null>(null);

  const getDefaultContextImageUrl = useCallback(() => {
    return parentPanel?.imageUrls[0] || null;
  }, [parentPanel]);

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

  const toggleModel = () => {
    setModelChoice(prev => prev === 'gemini' ? 'chatgpt' : 'gemini');
  };

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
        handlePromptTextChange(prompts.length, suggestedPrompt);
    } else { 
      handlePromptTextChange(0, suggestedPrompt);
    }
  };

  const handleSuggestPrompts = async () => {
    if (!parentPanel && prompts.length === 0) {
        toast({ title: "Cannot Suggest", description: "No parent panel or initial prompt to base suggestions on.", variant: "destructive"});
        return;
    }
    
    const suggestionContextImageUrl = 
        (prompts.length > 0 && prompts[0].customContextImageUrl) 
        ? prompts[0].customContextImageUrl
        : getDefaultContextImageUrl();

    if (!suggestionContextImageUrl) {
        toast({ title: "Context Needed", description: "Please set a context image for the first prompt or ensure parent panel has an image.", variant: "destructive"});
        return;
    }

    setIsSuggesting(true);
    try {
      const firstPromptText = prompts.length > 0 && prompts[0].text.trim() !== '' ? prompts[0].text.trim() : null;
      const textContext = firstPromptText || parentPanel?.userDescription || parentPanel?.promptsUsed?.join('; ') || "A comic panel scene.";

      const result = await suggestComicPanelPrompts({ 
        currentPanelPrimaryImageUrl: suggestionContextImageUrl,
        currentPanelTextContext: textContext,
        modelChoice: modelChoice,
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
      contextImageUrl: p.customContextImageUrl || getDefaultContextImageUrl() || '', 
    }));

    if (promptsForApi.some(p => !p.contextImageUrl)) {
        toast({ title: "Context Missing", description: "One or more prompts are missing a context image. Please ensure default or custom context is set.", variant: "destructive"});
        return;
    }

    setIsGenerating(true);
    try {
      const result = await generateComicPanel({ 
        promptsWithContext: promptsForApi,
        modelChoice: modelChoice,
      });
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

  const suggestionButtonText = prompts.length > 0 && prompts[0].customContextImageUrl 
    ? "Suggest (uses Image 1 custom context)"
    : "Suggest (uses default context)";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="w-full max-w-sm sm:max-w-xl md:max-w-3xl lg:max-w-4xl bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl text-primary">Generate New Panel Images</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Describe up to {MAX_PROMPTS} images for the next panel. Each prompt generates one image. 
              You can set a custom context image for each prompt, or it will default to the first image of the parent panel.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[50vh] sm:max-h-[calc(70vh-180px)] pr-2 sm:pr-3">
            <div className="grid gap-3 sm:gap-4 py-2">
              {prompts.map((promptItem, index) => (
                <div key={promptItem.id} className="p-2 sm:p-3 border border-border rounded-md bg-background/50 space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor={`prompt-text-${index}`} className="text-sm sm:text-base text-foreground font-semibold">
                      Image {index + 1} Prompt
                    </Label>
                    {prompts.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removePromptField(index)} className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground hover:text-destructive">
                        <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    )}
                  </div>
                  <Textarea
                    placeholder={`E.g., The knight raises a shield...`}
                    id={`prompt-text-${index}`}
                    value={promptItem.text}
                    onChange={(e) => handlePromptTextChange(index, e.target.value)}
                    rows={2}
                    className="text-foreground text-sm"
                  />
                  <div className="text-xs text-muted-foreground">Context for Image {index+1}:</div>
                  <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2">
                    {promptItem.customContextImagePreviewUrl ? (
                       <Image 
                         src={promptItem.customContextImagePreviewUrl} 
                         alt={`Custom context for prompt ${index + 1}`} 
                         width={64} 
                         height={48} 
                         className="rounded object-contain border shrink-0" 
                         data-ai-hint="context preview small"
                         unoptimized={isExternalImage(promptItem.customContextImagePreviewUrl)}
                       />
                    ) : defaultCtxImg ? (
                       <Image 
                         src={defaultCtxImg} 
                         alt="Default parent panel context" 
                         width={64} 
                         height={48} 
                         className="rounded object-contain border shrink-0" 
                         data-ai-hint="parent context small"
                         unoptimized={isExternalImage(defaultCtxImg)}
                       />
                    ) : (
                      <div className="w-16 h-12 flex items-center justify-center bg-muted rounded border text-muted-foreground text-xs shrink-0">No Ctx</div>
                    )}
                    <div className="flex flex-col gap-1 w-full xs:w-auto">
                        <Button onClick={() => handleOpenSetContextImageDialog(index)} variant="outline" size="sm" className="text-[10px] sm:text-xs h-7 sm:h-8 px-2">
                            <ImageIcon className="mr-1 h-3 w-3" /> Set Custom Context
                        </Button>
                        {promptItem.customContextImageUrl && (
                            <Button onClick={() => handleClearCustomContext(index)} variant="ghost" size="sm" className="text-[10px] sm:text-xs text-destructive hover:text-destructive/80 h-7 sm:h-8 px-2">
                                <RotateCcw className="mr-1 h-3 w-3" /> Use Default Context
                            </Button>
                        )}
                    </div>
                     {promptItem.customContextImageUrl && promptItem.sourcePanelId && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground ml-0 xs:ml-2">
                            Using img { (promptItem.sourceImageIndex ?? 0) + 1} from <span className="font-medium truncate max-w-[60px] inline-block align-bottom" title={allPanels.find(p=>p.id === promptItem.sourcePanelId)?.title}>{allPanels.find(p=>p.id === promptItem.sourcePanelId)?.title?.substring(0,10) || promptItem.sourcePanelId.substring(0,4)}...</span>
                        </p>
                    )}
                     {promptItem.customContextImageUrl && !promptItem.sourcePanelId && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground ml-0 xs:ml-2">Using uploaded image.</p>
                    )}
                    {!promptItem.customContextImageUrl && (
                         <p className="text-[10px] sm:text-xs text-muted-foreground ml-0 xs:ml-2">Using default context (Parent Img 1).</p>
                    )}
                  </div>
                </div>
              ))}
              {prompts.length < MAX_PROMPTS && (
                <Button 
                  variant="outline" 
                  onClick={addPromptField} 
                  size="sm"
                  className="flex items-center justify-center p-4 border-2 border-dashed border-border hover:border-primary h-auto"
                >
                  <PlusCircle className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Add Another Image Prompt</span>
                </Button>
              )}
              
              <div className="flex justify-between items-center mt-2 p-2 sm:p-3 border border-border rounded-md bg-background/50">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="model-toggle"
                    checked={modelChoice === 'chatgpt'}
                    onCheckedChange={toggleModel}
                  />
                  <Label htmlFor="model-toggle" className="cursor-pointer text-sm">
                    {modelChoice === 'gemini' ? 'Gemini' : 'ChatGPT/DALL-E'}
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {modelChoice === 'gemini' ? 'Uses Google Gemini for faster generation' : 'Uses OpenAI for higher quality (slower)'}
                </p>
              </div>
            </div>
          </ScrollArea>

          <div className="mt-3 sm:mt-4 flex flex-col gap-2">
              <Button onClick={handleSuggestPrompts} disabled={isSuggesting || (!parentPanel && prompts.length === 0)} variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-9">
                  {isSuggesting ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <Wand2 className="mr-2 h-4 w-4" /> )}
                  {suggestionButtonText}
              </Button>
              { (suggestedPrompts.length > 0 || isSuggesting) && (
                  <SuggestedPromptsDisplay
                      prompts={suggestedPrompts}
                      onSelectPrompt={handleSelectSuggestedPrompt}
                      isLoading={isSuggesting}
                  />
              )}
          </div>

          <DialogFooter className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto">Cancel</Button>
            </DialogClose>
            <Button 
              type="button" 
              onClick={handleGeneratePanel} 
              disabled={isGenerating || activePromptsCount === 0 || !parentPanel}
              className="w-full sm:w-auto"
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
