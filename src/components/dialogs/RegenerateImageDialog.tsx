
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
import { Loader2, RefreshCw, ImageIcon, RotateCcw, Sparkles } from 'lucide-react';
import SetContextImageDialog from './SetContextImageDialog';
import { regenerateSingleImage } from '@/ai/flows/regenerate-single-image';
import type { ComicPanelData } from '@/types/story';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export interface RegenerateImageDetails {
  panelId: string;
  panelTitle?: string;
  imageIndex: number;
  originalImageUrl: string;
  originalPrompt?: string;
}

interface RegenerateImageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageDetails: RegenerateImageDetails | null;
  allPanels: ComicPanelData[];
  onImageRegenerated: (panelId: string, imageIndex: number, newImageUrl: string, newPromptText: string) => void;
}

const RegenerateImageDialog: FC<RegenerateImageDialogProps> = ({ 
  isOpen, 
  onClose, 
  imageDetails, 
  allPanels, 
  onImageRegenerated 
}) => {
  const [newPromptText, setNewPromptText] = useState('');
  const [contextImageUrl, setContextImageUrl] = useState<string | null>(null); // For AI
  const [contextImagePreviewUrl, setContextImagePreviewUrl] = useState<string | null>(null); // For dialog display
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSetContextImageDialogOpen, setIsSetContextImageDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && imageDetails) {
      setNewPromptText(imageDetails.originalPrompt || '');
      setContextImageUrl(imageDetails.originalImageUrl);
      setContextImagePreviewUrl(imageDetails.originalImageUrl);
    } else {
      // Reset on close or if imageDetails is null
      setNewPromptText('');
      setContextImageUrl(null);
      setContextImagePreviewUrl(null);
    }
  }, [isOpen, imageDetails]);

  const handleContextImageSelected = (imageData: { dataUrl: string; previewUrl: string; sourcePanelId?: string; sourceImageIndex?: number }) => {
    setContextImageUrl(imageData.dataUrl);
    setContextImagePreviewUrl(imageData.previewUrl);
    setIsSetContextImageDialogOpen(false);
  };

  const handleClearCustomContext = () => {
    if (imageDetails) {
      setContextImageUrl(imageDetails.originalImageUrl);
      setContextImagePreviewUrl(imageDetails.originalImageUrl);
    }
  };

  const handleRegenerate = async () => {
    if (!imageDetails || !contextImageUrl || !newPromptText.trim()) {
      toast({ title: "Missing Information", description: "Please provide a prompt and ensure a context image is set.", variant: "destructive"});
      return;
    }
    setIsGenerating(true);
    try {
      const result = await regenerateSingleImage({
        newPromptText: newPromptText.trim(),
        contextImageUrl: contextImageUrl,
      });
      onImageRegenerated(imageDetails.panelId, imageDetails.imageIndex, result.generatedImageUrl, newPromptText.trim());
      toast({ title: "Image Regenerated!", description: "The image has been updated with your new prompt." });
      handleClose();
    } catch (error) {
      console.error('Error regenerating image:', error);
      let description = "Could not regenerate the image. Please try again.";
      if (error instanceof Error) {
        description = error.message;
      }
      toast({ title: "Regeneration Error", description, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    // No need to reset states here if useEffect handles it based on isOpen and imageDetails
    onClose();
  };

  if (!imageDetails) return null;

  const isContextCustom = contextImageUrl !== imageDetails.originalImageUrl;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl text-primary">
              Regenerate Image {imageDetails.imageIndex + 1}
              {imageDetails.panelTitle && ` for "${imageDetails.panelTitle.substring(0,20)}..."`}
            </DialogTitle>
            <DialogDescription>
              Modify the prompt and/or context image to regenerate this specific image.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex justify-center items-center gap-4">
              <div className="w-1/2 space-y-1">
                <Label className="text-xs text-muted-foreground">Original Image</Label>
                <div className="aspect-square relative bg-muted rounded border overflow-hidden">
                  <Image src={imageDetails.originalImageUrl} alt="Original image to regenerate" layout="fill" objectFit="contain" data-ai-hint="original image thumbnail"/>
                </div>
              </div>
              <div className="w-1/2 space-y-1">
                <Label className="text-xs text-muted-foreground">Context for AI (Click to change)</Label>
                <div 
                  className="aspect-square relative bg-muted rounded border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary"
                  onClick={() => setIsSetContextImageDialogOpen(true)}
                >
                  {contextImagePreviewUrl ? (
                     <Image src={contextImagePreviewUrl} alt="Context for AI" layout="fill" objectFit="contain" data-ai-hint="context image thumbnail"/>
                  ): (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <ImageIcon className="w-8 h-8"/>
                    </div>
                  )}
                </div>
              </div>
            </div>
             <div className="flex items-center justify-end gap-2 -mt-2">
                {isContextCustom && (
                    <Button onClick={handleClearCustomContext} variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive/80">
                        <RotateCcw className="mr-1 h-3 w-3" /> Use Original as Context
                    </Button>
                )}
                <Button onClick={() => setIsSetContextImageDialogOpen(true)} variant="outline" size="sm" className="text-xs">
                    <ImageIcon className="mr-1 h-3 w-3" /> {isContextCustom ? "Change Custom Context" : "Set Custom Context"}
                </Button>
            </div>


            <div>
              <Label htmlFor="new-prompt" className="text-foreground font-semibold">New Prompt</Label>
              <Textarea
                id="new-prompt"
                placeholder="Describe the changes or the new scene..."
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                rows={3}
                className="text-foreground mt-1"
              />
              {imageDetails.originalPrompt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Original prompt: "{imageDetails.originalPrompt.substring(0, 50)}{imageDetails.originalPrompt.length > 50 ? '...' : ''}"
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            </DialogClose>
            <Button 
              type="button" 
              onClick={handleRegenerate} 
              disabled={isGenerating || !newPromptText.trim() || !contextImageUrl}
            >
              {isGenerating ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <Sparkles className="mr-2 h-4 w-4" /> )}
              Regenerate Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {imageDetails && (
        <SetContextImageDialog
          isOpen={isSetContextImageDialogOpen}
          onClose={() => setIsSetContextImageDialogOpen(false)}
          allPanels={allPanels}
          parentPanelId={imageDetails.panelId} // Pass current panel's ID
          onContextImageSelected={handleContextImageSelected}
        />
      )}
    </>
  );
};

export default RegenerateImageDialog;
