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
import { Switch } from '@/components/ui/switch';
import { ModelChoice } from '@/ai/flows/suggest-comic-panel-prompt';

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

/**
 * Helper function to determine if a URL is an external image like Vercel Blob storage
 */
const isExternalImage = (url: string): boolean => {
  return (
    url.startsWith('https://') && 
    (url.includes('blob.vercel-storage.com') || 
     url.includes('amazonaws.com') || 
     url.includes('cloudinary.com'))
  );
};

const RegenerateImageDialog: FC<RegenerateImageDialogProps> = ({ 
  isOpen, 
  onClose, 
  imageDetails, 
  allPanels, 
  onImageRegenerated 
}) => {
  const [newPromptText, setNewPromptText] = useState('');
  const [contextImageUrl, setContextImageUrl] = useState<string | null>(null);
  const [contextImagePreviewUrl, setContextImagePreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSetContextImageDialogOpen, setIsSetContextImageDialogOpen] = useState(false);
  const [modelChoice, setModelChoice] = useState<ModelChoice>('gemini');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && imageDetails) {
      setNewPromptText(imageDetails.originalPrompt || '');
      setContextImageUrl(imageDetails.originalImageUrl);
      setContextImagePreviewUrl(imageDetails.originalImageUrl);
    } else {
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
        modelChoice: modelChoice,
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
    onClose();
  };

  const toggleModel = () => {
    setModelChoice(prev => prev === 'gemini' ? 'chatgpt' : 'gemini');
  };

  if (!imageDetails) return null;

  const isContextCustom = contextImageUrl !== imageDetails.originalImageUrl;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="w-full max-w-xs sm:max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl text-primary">
              Regenerate Image {imageDetails.imageIndex + 1}
              {imageDetails.panelTitle && ` for "${imageDetails.panelTitle.substring(0,20)}..."`}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Modify the prompt and/or context image to regenerate this specific image.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 sm:gap-4 py-4">
            <div className="flex flex-col xs:flex-row justify-center items-center gap-2 sm:gap-4">
              <div className="w-full xs:w-1/2 space-y-1">
                <Label className="text-xs text-muted-foreground">Original Image</Label>
                <div className="aspect-square relative bg-muted rounded border overflow-hidden">
                  <Image 
                    src={imageDetails.originalImageUrl} 
                    alt="Original image to regenerate" 
                    layout="fill" 
                    objectFit="contain" 
                    data-ai-hint="original image thumbnail"
                    sizes="(max-width: 400px) 80vw, 200px"
                    unoptimized={isExternalImage(imageDetails.originalImageUrl)}
                  />
                </div>
              </div>
              <div className="w-full xs:w-1/2 space-y-1">
                <Label className="text-xs text-muted-foreground">Context for AI (Click to change)</Label>
                <div 
                  className="aspect-square relative bg-muted rounded border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary"
                  onClick={() => setIsSetContextImageDialogOpen(true)}
                >
                  {contextImagePreviewUrl ? (
                     <Image 
                        src={contextImagePreviewUrl} 
                        alt="Context for AI" 
                        layout="fill" 
                        objectFit="contain" 
                        data-ai-hint="context image thumbnail"
                        sizes="(max-width: 400px) 80vw, 200px"
                        unoptimized={isExternalImage(contextImagePreviewUrl)}
                      />
                  ): (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8"/>
                    </div>
                  )}
                </div>
              </div>
            </div>
             <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-end gap-1 sm:gap-2 -mt-1 sm:-mt-2">
                {isContextCustom && (
                    <Button onClick={handleClearCustomContext} variant="ghost" size="sm" className="text-[10px] sm:text-xs text-destructive hover:text-destructive/80 h-7 sm:h-8 px-2">
                        <RotateCcw className="mr-1 h-3 w-3" /> Use Original as Context
                    </Button>
                )}
                <Button onClick={() => setIsSetContextImageDialogOpen(true)} variant="outline" size="sm" className="text-[10px] sm:text-xs h-7 sm:h-8 px-2">
                    <ImageIcon className="mr-1 h-3 w-3" /> {isContextCustom ? "Change Custom Context" : "Set Custom Context"}
                </Button>
            </div>

            <div>
              <Label htmlFor="new-prompt" className="text-sm sm:text-base text-foreground font-semibold">New Prompt</Label>
              <Textarea
                id="new-prompt"
                placeholder="Describe the changes or the new scene..."
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                rows={3}
                className="text-foreground mt-1 text-sm"
              />
              {imageDetails.originalPrompt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Original prompt: "{imageDetails.originalPrompt.substring(0, 40)}{imageDetails.originalPrompt.length > 40 ? '...' : ''}"
                </p>
              )}
            </div>

            <div className="flex items-center justify-between space-x-2 pt-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="model-toggle"
                  checked={modelChoice === 'chatgpt'}
                  onCheckedChange={toggleModel}
                />
                <Label htmlFor="model-toggle" className="cursor-pointer">
                  {modelChoice === 'gemini' ? 'Gemini' : 'ChatGPT/DALL-E'}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                {modelChoice === 'gemini' ? 'Uses Google Gemini for faster generation' : 'Uses OpenAI for higher quality (slower)'}
              </p>
            </div>
          </div>

          <DialogFooter className="mt-2 flex flex-col sm:flex-row gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto">Cancel</Button>
            </DialogClose>
            <Button 
              type="button" 
              onClick={handleRegenerate} 
              disabled={isGenerating || !newPromptText.trim() || !contextImageUrl}
              className="w-full sm:w-auto"
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
          parentPanelId={imageDetails.panelId}
          onContextImageSelected={handleContextImageSelected}
        />
      )}
    </>
  );
};

export default RegenerateImageDialog;
