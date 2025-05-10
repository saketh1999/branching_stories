
import type { FC } from 'react';
import { useState, useEffect } from 'react';
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
import { Sparkles, Wand2, Loader2, PlusCircle, XCircle } from 'lucide-react';
import SuggestedPromptsDisplay from './SuggestedPromptsDisplay'; // Assuming this component can be reused or adapted
import { suggestComicPanelPrompts } from '@/ai/flows/suggest-comic-panel-prompt';
import { generateComicPanel } from '@/ai/flows/generate-comic-panel';
import type { ComicPanelData } from '@/types/story';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GeneratePanelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  parentPanel: ComicPanelData | null;
  onPanelGenerated: (newPanelImageUrls: string[], promptsUsed: string[]) => void;
}

const MAX_PROMPTS = 4;

const GeneratePanelDialog: FC<GeneratePanelDialogProps> = ({ isOpen, onClose, parentPanel, onPanelGenerated }) => {
  const [prompts, setPrompts] = useState<string[]>(['']); // Start with one prompt field
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setPrompts(['']); // Reset to one empty prompt field when dialog opens
      setSuggestedPrompts([]);
      setIsSuggesting(false);
      setIsGenerating(false);
    }
  }, [isOpen]);

  const handlePromptChange = (index: number, value: string) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    setPrompts(newPrompts);
  };

  const addPromptField = () => {
    if (prompts.length < MAX_PROMPTS) {
      setPrompts([...prompts, '']);
    }
  };

  const removePromptField = (index: number) => {
    if (prompts.length > 1) {
      const newPrompts = prompts.filter((_, i) => i !== index);
      setPrompts(newPrompts);
    }
  };
  
  const handleSelectSuggestedPrompt = (suggestedPrompt: string) => {
    // Find first empty prompt or replace the first one if all are filled
    const emptyIndex = prompts.findIndex(p => p.trim() === '');
    if (emptyIndex !== -1) {
      handlePromptChange(emptyIndex, suggestedPrompt);
    } else if (prompts.length < MAX_PROMPTS) {
        addPromptField();
        handlePromptChange(prompts.length, suggestedPrompt); // prompts.length will be the new index
    }
     else { // All fields full, replace the first one
      handlePromptChange(0, suggestedPrompt);
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

  const handleGeneratePanel = async () => {
    if (!parentPanel || parentPanel.imageUrls.length === 0) return;
    
    const validPrompts = prompts.map(p => p.trim()).filter(p => p !== '');
    if (validPrompts.length === 0) {
      toast({ title: "No Prompts", description: "Please enter at least one prompt.", variant: "destructive"});
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateComicPanel({ 
        promptsToGenerate: validPrompts, 
        previousPanelContextImageUrl: parentPanel.imageUrls[0] 
      });
      onPanelGenerated(result.generatedImageUrls, validPrompts);
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
    // Prompts reset via useEffect on isOpen change
    onClose();
  }

  const activePrompts = prompts.map(p => p.trim()).filter(p => p !== '');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">Generate New Panel Images</DialogTitle>
          <DialogDescription>
            Describe up to {MAX_PROMPTS} images for the next panel. Each prompt generates one image. AI will use the first image of the previous panel for context.
          </DialogDescription>
        </DialogHeader>
        
        {parentPanel && parentPanel.imageUrls.length > 0 && (
          <div className="my-2 p-2 border border-border rounded-md flex flex-col items-center">
            <Label className="text-sm text-muted-foreground mb-1">Context from Previous Panel (First Image):</Label>
            <Image src={parentPanel.imageUrls[0]} alt="Previous Panel Context" width={120} height={90} className="rounded object-contain" data-ai-hint="comic context small"/>
          </div>
        )}
        
        <ScrollArea className="max-h-[40vh] pr-3">
          <div className="grid gap-3 py-2">
            {prompts.map((prompt, index) => (
              <div key={index} className="grid w-full gap-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor={`prompt-${index}`} className="text-foreground">
                    Prompt for Image {index + 1}
                  </Label>
                  {prompts.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removePromptField(index)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Textarea
                  placeholder={`E.g., Image ${index + 1}: The knight raises a shield...`}
                  id={`prompt-${index}`}
                  value={prompt}
                  onChange={(e) => handlePromptChange(index, e.target.value)}
                  rows={2}
                  className="text-foreground"
                />
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

        <div className="mt-2 flex flex-col gap-2">
            <Button onClick={handleSuggestPrompts} disabled={isSuggesting || !parentPanel} variant="outline" size="sm">
                {isSuggesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                <Wand2 className="mr-2 h-4 w-4" />
                )}
                Suggest Prompts from AI
            </Button>
            { (suggestedPrompts.length > 0 || isSuggesting) && (
                <SuggestedPromptsDisplay
                    prompts={suggestedPrompts}
                    onSelectPrompt={handleSelectSuggestedPrompt}
                    isLoading={isSuggesting}
                />
            )}
        </div>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          </DialogClose>
          <Button 
            type="button" 
            onClick={handleGeneratePanel} 
            disabled={isGenerating || activePrompts.length === 0 || !parentPanel}
          >
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate {activePrompts.length > 0 ? `${activePrompts.length} Image(s)` : 'Panel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GeneratePanelDialog;
