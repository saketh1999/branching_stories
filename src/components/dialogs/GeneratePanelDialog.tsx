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
import { Sparkles, Wand2, Loader2 } from 'lucide-react';
import SuggestedPromptsDisplay from './SuggestedPromptsDisplay';
import { suggestComicPanelPrompts } from '@/ai/flows/suggest-comic-panel-prompt';
import { generateComicPanel } from '@/ai/flows/generate-comic-panel';
import type { ComicPanelData } from '@/types/story';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface GeneratePanelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  parentPanel: ComicPanelData | null; // Parent panel for context
  onPanelGenerated: (newPanelDataUri: string, promptUsed: string) => void;
}

const GeneratePanelDialog: FC<GeneratePanelDialogProps> = ({ isOpen, onClose, parentPanel, onPanelGenerated }) => {
  const [prompt, setPrompt] = useState<string>('');
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setSuggestedPrompts([]);
    }
  }, [isOpen]);

  const handleSuggestPrompts = async () => {
    if (!parentPanel) return;
    setIsSuggesting(true);
    try {
      const currentPanelContent = parentPanel.promptUsed || parentPanel.userDescription || "A comic panel scene.";
      const result = await suggestComicPanelPrompts({ currentPanelContent });
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
    if (!prompt.trim() || !parentPanel) return;
    setIsGenerating(true);
    try {
      const result = await generateComicPanel({ 
        prompt, 
        previousPanelDataUri: parentPanel.imageUrl 
      });
      onPanelGenerated(result.panelDataUri, prompt);
      toast({ title: "Panel Generated!", description: "New comic panel added to your story." });
      handleClose();
    } catch (error) {
      console.error('Error generating panel:', error);
      toast({ title: "Generation Error", description: "Could not generate new panel. Please try again.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleClose = () => {
    setPrompt('');
    setSuggestedPrompts([]);
    setIsSuggesting(false);
    setIsGenerating(false);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">Generate New Comic Panel</DialogTitle>
          <DialogDescription>
            Describe the next panel or choose a suggestion. The AI will generate it based on the previous panel.
          </DialogDescription>
        </DialogHeader>
        
        {parentPanel && (
          <div className="my-4 p-2 border border-border rounded-md flex flex-col items-center">
            <Label className="text-sm text-muted-foreground mb-1">Previous Panel:</Label>
            <Image src={parentPanel.imageUrl} alt="Previous Panel" width={120} height={90} className="rounded object-contain" data-ai-hint="comic panel small"/>
          </div>
        )}

        <div className="grid gap-4 py-2">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="prompt" className="text-foreground">Your Prompt</Label>
            <Textarea
              placeholder="E.g., The knight raises their shield as the dragon breathes fire..."
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="text-foreground"
            />
          </div>
          <Button onClick={handleSuggestPrompts} disabled={isSuggesting || !parentPanel} variant="outline" size="sm">
            {isSuggesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Suggest Prompts
          </Button>
          <SuggestedPromptsDisplay
            prompts={suggestedPrompts}
            onSelectPrompt={(p) => setPrompt(p)}
            isLoading={isSuggesting}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleGeneratePanel} disabled={isGenerating || !prompt.trim() || !parentPanel}>
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate Panel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GeneratePanelDialog;
