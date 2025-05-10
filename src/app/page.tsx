
"use client";

import { useState, useCallback } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import WelcomeMessage from '@/components/WelcomeMessage';
import FlowchartDisplay from '@/components/story/FlowchartDisplay';
import UploadInitialPanelDialog from '@/components/dialogs/UploadInitialPanelDialog';
import GeneratePanelDialog from '@/components/dialogs/GeneratePanelDialog';
import RegenerateImageDialog, { type RegenerateImageDetails } from '@/components/dialogs/RegenerateImageDialog';
import EditPanelDialog from '@/components/dialogs/EditPanelDialog'; // New Dialog
import { useStoryState } from '@/hooks/useStoryState';
import type { ComicPanelData } from '@/types/story';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { panels, rootPanelId, addPanel, getPanel, resetStory, updatePanelTitle, updatePanelImage, updatePanelImages } = useStoryState();
  const { toast } = useToast();

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedPanelForGeneration, setSelectedPanelForGeneration] = useState<ComicPanelData | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const [isRegenerateImageDialogOpen, setIsRegenerateImageDialogOpen] = useState(false);
  const [selectedImageForRegeneration, setSelectedImageForRegeneration] = useState<RegenerateImageDetails | null>(null);

  const [isEditPanelDialogOpen, setIsEditPanelDialogOpen] = useState(false);
  const [panelForEditing, setPanelForEditing] = useState<ComicPanelData | null>(null);


  const handleUploadInitialPanel = useCallback(() => {
    setIsUploadDialogOpen(true);
  }, []);

  const handleNewStory = useCallback(() => {
    resetStory();
    toast({ title: "New Story Started", description: "Your canvas is clear. Add starting panel images to begin!"});
  }, [resetStory, toast]);

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

  const handlePanelGenerated = useCallback((newPanelImageUrls: string[], promptsUsed: string[]) => {
    if (selectedPanelForGeneration) {
      addPanel({ 
        imageUrls: newPanelImageUrls, 
        parentId: selectedPanelForGeneration.id, 
        promptsUsed
      });
    }
    setIsGenerateDialogOpen(false);
    setSelectedPanelForGeneration(null);
  }, [addPanel, selectedPanelForGeneration]);

  const handleUpdatePanelTitle = useCallback((panelId: string, newTitle: string) => {
    updatePanelTitle(panelId, newTitle);
    toast({ title: "Panel Renamed", description: `Panel title updated to "${newTitle.substring(0,30)}...".`})
  }, [updatePanelTitle, toast]);

  const handleOpenRegenerateImageDialog = useCallback((panelId: string, imageIndex: number, imageUrl: string, originalPrompt?: string) => {
    const panel = getPanel(panelId);
    setSelectedImageForRegeneration({
      panelId,
      panelTitle: panel?.title,
      imageIndex,
      originalImageUrl: imageUrl,
      originalPrompt,
    });
    setIsRegenerateImageDialogOpen(true);
  }, [getPanel]);

  const handleImageRegenerated = useCallback((panelId: string, imageIndex: number, newImageUrl: string, newPromptText: string) => {
    updatePanelImage(panelId, imageIndex, newImageUrl, newPromptText);
    setIsRegenerateImageDialogOpen(false);
    setSelectedImageForRegeneration(null);
    // Toast is handled within RegenerateImageDialog
  }, [updatePanelImage]);

  const handleOpenEditPanelDialog = useCallback((panelId: string) => {
    const panel = getPanel(panelId);
    if (panel) {
      setPanelForEditing(panel);
      setIsEditPanelDialogOpen(true);
    }
  }, [getPanel]);

  const handlePanelImagesUpdated = useCallback((panelId: string, updates: Array<{ imageIndex: number; newImageUrl: string; newPromptText: string }>) => {
    updatePanelImages(panelId, updates);
    setIsEditPanelDialogOpen(false);
    setPanelForEditing(null);
    // Toast is handled within EditPanelDialog
  }, [updatePanelImages]);


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground antialiased">
      <AppHeader 
        onUploadInitialPanel={handleUploadInitialPanel}
        onNewStory={handleNewStory}
        hasStory={!!rootPanelId}
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
            onRegenerateImage={handleOpenRegenerateImageDialog}
            onEditPanel={handleOpenEditPanelDialog} // Pass new handler
          />
        )}
      </main>

      <UploadInitialPanelDialog
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        onUpload={processUploadedFiles}
      />
      
      {selectedPanelForGeneration && (
        <GeneratePanelDialog
          isOpen={isGenerateDialogOpen}
          onClose={() => {
            setIsGenerateDialogOpen(false);
            setSelectedPanelForGeneration(null);
          }}
          parentPanel={selectedPanelForGeneration}
          allPanels={panels}
          onPanelGenerated={handlePanelGenerated}
        />
      )}

      {selectedImageForRegeneration && (
        <RegenerateImageDialog
          isOpen={isRegenerateImageDialogOpen}
          onClose={() => {
            setIsRegenerateImageDialogOpen(false);
            setSelectedImageForRegeneration(null);
          }}
          imageDetails={selectedImageForRegeneration}
          allPanels={panels}
          onImageRegenerated={handleImageRegenerated}
        />
      )}

      {panelForEditing && (
        <EditPanelDialog
          isOpen={isEditPanelDialogOpen}
          onClose={() => {
            setIsEditPanelDialogOpen(false);
            setPanelForEditing(null);
          }}
          panelToEdit={panelForEditing}
          allPanels={panels}
          onPanelImagesUpdated={handlePanelImagesUpdated}
        />
      )}
    </div>
  );
}
