
"use client";

import { useState, useCallback } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import WelcomeMessage from '@/components/WelcomeMessage';
import FlowchartDisplay from '@/components/story/FlowchartDisplay';
import UploadInitialPanelDialog from '@/components/dialogs/UploadInitialPanelDialog';
import GeneratePanelDialog from '@/components/dialogs/GeneratePanelDialog';
import { useStoryState } from '@/hooks/useStoryState';
import type { ComicPanelData } from '@/types/story';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { panels, rootPanelId, addPanel, getPanel, resetStory, updatePanelTitle } = useStoryState();
  const { toast } = useToast();

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedPanelForGeneration, setSelectedPanelForGeneration] = useState<ComicPanelData | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const handleUploadInitialPanel = useCallback(() => {
    // Dialog can always open. The logic for chaining or starting new is in useStoryState.
    setIsUploadDialogOpen(true);
  }, []);

  const handleNewStory = useCallback(() => {
    resetStory();
    toast({ title: "New Story Started", description: "Your canvas is clear. Add starting panel images to begin!"});
  }, [resetStory, toast]);

  // Updated to handle multiple files
  const processUploadedFiles = (files: File[], description: string) => {
    if (files.length === 0) {
        toast({ title: "No Files", description: "Please select at least one image file.", variant: "destructive"});
        return;
    }
    setIsProcessingFile(true);
    const fileReadPromises = files.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(fileReadPromises)
      .then(imageUrls => {
        // Pass parentId as null. useStoryState will handle chaining if rootPanelId already exists.
        addPanel({ imageUrls, parentId: null, userDescription: description });
        setIsUploadDialogOpen(false);
        toast({ title: "Panel Uploaded!", description: `${imageUrls.length} image(s) added to your story.` });
      })
      .catch(error => {
        console.error("Error reading files:", error);
        toast({ title: "File Error", description: "Could not read one or more uploaded files.", variant: "destructive" });
      })
      .finally(() => {
        setIsProcessingFile(false);
      });
  };

  const handleOpenGenerateDialog = useCallback((panelId: string) => {
    const panel = getPanel(panelId);
    if (panel) {
      setSelectedPanelForGeneration(panel);
      setIsGenerateDialogOpen(true);
    }
  }, [getPanel]);

  // Updated to handle multiple generated images and their prompts
  const handlePanelGenerated = useCallback((newPanelImageUrls: string[], promptsUsed: string[]) => {
    if (selectedPanelForGeneration) {
      addPanel({ 
        imageUrls: newPanelImageUrls, 
        parentId: selectedPanelForGeneration.id, // Explicit parent for generated panels
        promptsUsed
      });
    }
    setIsGenerateDialogOpen(false);
    setSelectedPanelForGeneration(null);
     // Toast is now handled within GeneratePanelDialog upon success/failure
  }, [addPanel, selectedPanelForGeneration]);

  const handleUpdatePanelTitle = useCallback((panelId: string, newTitle: string) => {
    updatePanelTitle(panelId, newTitle);
    toast({ title: "Panel Renamed", description: `Panel title updated to "${newTitle.substring(0,30)}...".`})
  }, [updatePanelTitle, toast]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground antialiased">
      <AppHeader 
        onUploadInitialPanel={handleUploadInitialPanel}
        onNewStory={handleNewStory}
        hasStory={!!rootPanelId} // Still useful for "New Story" button disability
      />
      <main className="flex-1 overflow-hidden relative">
        {isProcessingFile && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-50">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-foreground">Processing your panel images...</p>
          </div>
        )}
        {!rootPanelId && !isProcessingFile && (
          <div className="flex items-center justify-center h-full">
            <WelcomeMessage onUploadInitial={handleUploadInitialPanel} />
          </div>
        )}
        {rootPanelId && !isProcessingFile && (
          <FlowchartDisplay
            panels={panels}
            rootId={rootPanelId}
            onGenerateNext={handleOpenGenerateDialog}
            onBranch={handleOpenGenerateDialog} 
            onUpdateTitle={handleUpdatePanelTitle}
          />
        )}
      </main>

      <UploadInitialPanelDialog
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        onUpload={processUploadedFiles} // Updated handler
      />
      
      {selectedPanelForGeneration && (
        <GeneratePanelDialog
          isOpen={isGenerateDialogOpen}
          onClose={() => {
            setIsGenerateDialogOpen(false);
            setSelectedPanelForGeneration(null);
          }}
          parentPanel={selectedPanelForGeneration}
          onPanelGenerated={handlePanelGenerated} // Updated handler
        />
      )}
    </div>
  );
}

