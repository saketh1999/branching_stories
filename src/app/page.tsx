
"use client";

import { useState, useCallback } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import WelcomeMessage from '@/components/WelcomeMessage';
import FlowchartDisplay from '@/components/story/FlowchartDisplay';
import UploadInitialPanelDialog from '@/components/dialogs/UploadInitialPanelDialog';
import UploadComicBookDialog from '@/components/dialogs/UploadComicBookDialog';
import GeneratePanelDialog from '@/components/dialogs/GeneratePanelDialog';
import RegenerateImageDialog, { type RegenerateImageDetails } from '@/components/dialogs/RegenerateImageDialog';
import EditPanelDialog from '@/components/dialogs/EditPanelDialog';
import { useStoryState } from '@/hooks/useStoryState';
import type { ComicPanelData } from '@/types/story';
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from 'lucide-react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { 
    panels, 
    rootPanelId, 
    isLoading: isStoryLoading, 
    error: storyError,
    addPanel, 
    addComicBook, 
    getPanel, 
    resetStory, 
    updatePanelTitle, 
    updatePanelImage, 
    updatePanelImages 
  } = useStoryState();
  const { toast } = useToast();

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploadComicBookDialogOpen, setIsUploadComicBookDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedPanelForGeneration, setSelectedPanelForGeneration] = useState<ComicPanelData | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false); // For client-side file reading

  const [isRegenerateImageDialogOpen, setIsRegenerateImageDialogOpen] = useState(false);
  const [selectedImageForRegeneration, setSelectedImageForRegeneration] = useState<RegenerateImageDetails | null>(null);

  const [isEditPanelDialogOpen, setIsEditPanelDialogOpen] = useState(false);
  const [panelForEditing, setPanelForEditing] = useState<ComicPanelData | null>(null);


  const handleUploadInitialPanel = useCallback(() => {
    setIsUploadDialogOpen(true);
  }, []);

  const handleUploadComicBook = useCallback(() => {
    setIsUploadComicBookDialogOpen(true);
  }, []);

  const handleNewStory = useCallback(async () => {
    // useStoryState's resetStory now handles DB operations.
    await resetStory(); 
    // Toast is handled within resetStory
  }, [resetStory]);

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
      .then(async imageUrls => {
        // addPanel now handles DB operations
        await addPanel({ imageUrls, parentId: null, userDescription: description });
        setIsUploadDialogOpen(false);
        // Toast is handled within addPanel
      })
      .catch(error => {
        console.error("Error reading files or adding panel:", error);
        // Toast for file reading error
        toast({ title: "File Error", description: "Could not read files or create initial panel.", variant: "destructive" });
      })
      .finally(() => {
        setIsProcessingFile(false);
      });
  };
  
  const processUploadedComicBook = (files: File[], title: string) => {
    if (files.length === 0) {
      toast({ title: "No Pages", description: "Please select at least one image file for your comic book.", variant: "destructive" });
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
      .then(async pageImageUrls => {
        // addComicBook now handles DB operations
        await addComicBook({ pageImageUrls, comicBookTitle: title });
        setIsUploadComicBookDialogOpen(false);
        // Toast is handled within addComicBook
      })
      .catch(error => {
        console.error("Error reading comic book files or adding comic book:", error);
        toast({ title: "File Error", description: "Could not read files or create comic book.", variant: "destructive" });
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

  const handlePanelGenerated = useCallback(async (newPanelImageUrls: string[], promptsUsed: string[]) => {
    if (selectedPanelForGeneration) {
      // addPanel handles DB
      await addPanel({ 
        imageUrls: newPanelImageUrls, 
        parentId: selectedPanelForGeneration.id, 
        promptsUsed
      });
    }
    setIsGenerateDialogOpen(false);
    setSelectedPanelForGeneration(null);
    // Toast is handled in addPanel
  }, [addPanel, selectedPanelForGeneration]);

  const handleUpdatePanelTitle = useCallback(async (panelId: string, newTitle: string) => {
    // updatePanelTitle handles DB
    await updatePanelTitle(panelId, newTitle);
    // Toast is handled in updatePanelTitle
  }, [updatePanelTitle]);

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

  const handleImageRegenerated = useCallback(async (panelId: string, imageIndex: number, newImageUrl: string, newPromptText: string) => {
    // updatePanelImage handles DB
    await updatePanelImage(panelId, imageIndex, newImageUrl, newPromptText);
    setIsRegenerateImageDialogOpen(false);
    setSelectedImageForRegeneration(null);
    // Toast is handled in updatePanelImage
  }, [updatePanelImage]);

  const handleOpenEditPanelDialog = useCallback((panelId: string) => {
    const panel = getPanel(panelId);
    if (panel) {
      setPanelForEditing(panel);
      setIsEditPanelDialogOpen(true);
    }
  }, [getPanel]);

  const handlePanelImagesUpdated = useCallback(async (panelId: string, updates: Array<{ imageIndex: number; newImageUrl: string; newPromptText: string }>) => {
    // updatePanelImages handles DB
    await updatePanelImages(panelId, updates);
    setIsEditPanelDialogOpen(false);
    setPanelForEditing(null);
    // Toast is handled in updatePanelImages
  }, [updatePanelImages]);


  const renderContent = () => {
    if (isStoryLoading || isProcessingFile) {
      return (
        <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-50 p-4">
          <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-primary mb-3 sm:mb-4" />
          <p className="text-md sm:text-lg text-foreground text-center">
            {isStoryLoading ? "Loading your amazing story..." : "Processing your content..."}
          </p>
        </div>
      );
    }

    if (storyError) {
      return (
        <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-50 p-4 text-center">
            <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-destructive mb-3 sm:mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-destructive mb-2">Oops! Something went wrong.</h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">{storyError}</p>
            <Button onClick={() => window.location.reload()} variant="destructive">Try Reloading</Button>
        </div>
      );
    }

    if (!rootPanelId) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <WelcomeMessage onUploadInitial={handleUploadInitialPanel} onUploadComicBook={handleUploadComicBook} />
        </div>
      );
    }

    return (
      <FlowchartDisplay
        panels={panels}
        rootId={rootPanelId}
        onGenerateNext={handleOpenGenerateDialog}
        onBranch={handleOpenGenerateDialog} 
        onUpdateTitle={handleUpdatePanelTitle}
        onRegenerateImage={handleOpenRegenerateImageDialog}
        onEditPanel={handleOpenEditPanelDialog}
      />
    );
  };


  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex flex-col min-h-screen bg-background text-foreground antialiased">
        <AppHeader 
          onUploadInitialPanel={handleUploadInitialPanel}
          onUploadComicBook={handleUploadComicBook}
          onNewStory={handleNewStory}
          hasStory={!!rootPanelId && !isStoryLoading} // Disable New Story if loading or no story
        />
        <main className="flex-1 overflow-hidden relative">
          {renderContent()}
        </main>

        <UploadInitialPanelDialog
          isOpen={isUploadDialogOpen}
          onClose={() => setIsUploadDialogOpen(false)}
          onUpload={processUploadedFiles}
        />

        <UploadComicBookDialog
          isOpen={isUploadComicBookDialogOpen}
          onClose={() => setIsUploadComicBookDialogOpen(false)}
          onUpload={processUploadedComicBook}
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
    </ThemeProvider>
  );
}
