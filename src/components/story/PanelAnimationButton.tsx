"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, ArrowUpRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import AnimateImageButton from '@/components/ui/AnimateImageButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PanelAnimationButtonProps {
  imageUrl: string;
  panelTitle?: string;
  promptText?: string;
  onVideoGenerated?: (blobUrl: string) => void;
}

export const PanelAnimationButton: React.FC<PanelAnimationButtonProps> = ({
  imageUrl,
  panelTitle = 'Panel',
  promptText,
  onVideoGenerated,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const defaultPrompt = promptText 
    ? promptText.includes('[') ? promptText : `[Pan right]${promptText}` 
    : `[Pan right]${panelTitle || 'A detailed scene'}`;

  const handleVideoGenerated = (blobUrl: string) => {
    if (onVideoGenerated) {
      onVideoGenerated(blobUrl);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1 absolute bottom-2 right-2 opacity-80 hover:opacity-100 z-10"
        >
          <Play className="h-3 w-3" />
          <span className="text-xs">Animate</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Animate {panelTitle}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Animation</TabsTrigger>
            <TabsTrigger value="help">Animation Help</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create" className="space-y-4 py-4">
            <div className="flex justify-center">
              <div className="relative max-h-[200px] overflow-hidden rounded-md mb-2">
                <img 
                  src={imageUrl} 
                  alt={`Panel to animate`} 
                  className="object-contain max-h-[200px]"
                />
              </div>
            </div>
            
            <AnimateImageButton 
              imageUrl={imageUrl} 
              prompt={defaultPrompt}
              className="w-full"
              onVideoGenerated={handleVideoGenerated}
            />
          </TabsContent>
          
          <TabsContent value="help" className="py-4">
            <ScrollArea className="h-[200px] rounded-md border p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Animation Prompt Guide</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    You can control how your image is animated by adding special camera movement instructions
                    at the beginning of your prompt.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-xs font-medium">Available Camera Movements:</h4>
                  <ul className="text-xs space-y-2">
                    <li><strong>[Pan right]</strong> - Camera moves from left to right</li>
                    <li><strong>[Pan left]</strong> - Camera moves from right to left</li>
                    <li><strong>[Zoom in]</strong> - Camera zooms into the image</li>
                    <li><strong>[Zoom out]</strong> - Camera zooms out from the image</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium">Examples:</h4>
                  <ul className="text-xs space-y-1">
                    <li><strong>[Pan right]</strong>A beautiful landscape</li>
                    <li><strong>[Zoom in]</strong>A character's face with detailed expression</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium">Tips:</h4>
                  <ul className="text-xs space-y-1 list-disc pl-4">
                    <li>Include descriptive details after the camera instruction</li>
                    <li>Animations typically last 3-5 seconds</li>
                    <li>Zooming works best with images that have a clear subject</li>
                    <li>Panning works well with landscape or panoramic scenes</li>
                  </ul>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            Uses Minimax API for animation
          </span>
          <DialogClose asChild>
            <Button 
              type="button" 
              variant="outline"
              size="sm"
            >
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PanelAnimationButton; 