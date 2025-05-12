"use client";

import { useState, useCallback, useEffect } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import HomePage from '@/components/HomePage';
import FlowchartDisplay from '@/components/story/FlowchartDisplay';
import StorySelector from '@/components/story/StorySelector';
import UploadInitialPanelDialog from '@/components/dialogs/UploadInitialPanelDialog';
import GeneratePanelDialog from '@/components/dialogs/GeneratePanelDialog';
import RegenerateImageDialog, { type RegenerateImageDetails } from '@/components/dialogs/RegenerateImageDialog';
import EditPanelDialog from '@/components/dialogs/EditPanelDialog';
import { useStoriesCollection } from '@/hooks/useStoriesCollection';
import type { ComicPanelData } from '@/types/story';
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from 'lucide-react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';
import ClientFlowchartDisplay from '@/components/story/ClientFlowchartDisplay';
import DynamicFlowchart from '@/components/story/DynamicFlowchart';

export default function Main() {
  const { 
    storiesCollection,
    activeStory,
    activeStoryPanels: panels,
    isLoading: isStoryLoading, 
    error: storyError,       
    createNewStory,
    switchStory,
    deleteStory,
    updateStoryTitle,
    updateActiveStoryPanels
  } = useStoriesCollection();
  const { toast } = useToast();

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedPanelForGeneration, setSelectedPanelForGeneration] = useState<ComicPanelData | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false); 
  const [showHomePage, setShowHomePage] = useState(true);

  const [isRegenerateImageDialogOpen, setIsRegenerateImageDialogOpen] = useState(false);
  const [selectedImageForRegeneration, setSelectedImageForRegeneration] = useState<RegenerateImageDetails | null>(null);

  const [isEditPanelDialogOpen, setIsEditPanelDialogOpen] = useState(false);
  const [panelForEditing, setPanelForEditing] = useState<ComicPanelData | null>(null);

  const rootPanelId = activeStory?.rootPanelId || null;

  // Check if we should show story editor
  useEffect(() => {
    if (rootPanelId || panels.length > 0) {
      setShowHomePage(false);
    }
  }, [rootPanelId, panels.length]);

  const navigateToHome = useCallback(() => {
    setShowHomePage(true);
  }, []);

  const navigateToStoryEditor = useCallback(() => {
    setShowHomePage(false);
  }, []);

  const handleUploadInitialPanel = useCallback(() => {
    setIsUploadDialogOpen(true);
    navigateToStoryEditor();
  }, [navigateToStoryEditor]);

  const resetStory = useCallback(async () => {
    // Create a new empty story
    await createNewStory("New Story");
    navigateToHome();
  }, [createNewStory, navigateToHome]);

  const getPanel = useCallback((panelId: string) => {
    return panels.find(p => p.id === panelId) || null;
  }, [panels]);

  const addPanel = useCallback(({ imageUrls, parentId, promptsUsed, userDescription }: {
    imageUrls: string[];
    parentId: string | null;
    promptsUsed?: string[];
    userDescription?: string;
  }) => {
    const newPanelId = uuidv4();
    const now = new Date();
    
    const newPanel: ComicPanelData = {
      id: newPanelId,
      imageUrls,
      promptsUsed,
      userDescription,
      parentId,
      childrenIds: [],
      createdAt: now
    };
    
    let updatedPanels = [...panels, newPanel];
    
    // If this panel has a parent, update the parent's childrenIds
    if (parentId) {
      updatedPanels = updatedPanels.map(panel => {
        if (panel.id === parentId) {
          return {
            ...panel,
            childrenIds: [...panel.childrenIds, newPanelId]
          };
        }
        return panel;
      });
    }
    
    updateActiveStoryPanels(updatedPanels);
    return newPanelId;
  }, [panels, updateActiveStoryPanels]);

  const updatePanelTitle = useCallback((panelId: string, newTitle: string) => {
    const updatedPanels = panels.map(panel => {
      if (panel.id === panelId) {
        return { ...panel, title: newTitle };
      }
      return panel;
    });
    
    updateActiveStoryPanels(updatedPanels);
    toast({ title: "Title Updated", description: "Panel title has been updated." });
  }, [panels, toast, updateActiveStoryPanels]);

  const updatePanelImage = useCallback((panelId: string, imageIndex: number, newImageUrl: string, newPromptText?: string) => {
    const panel = panels.find(p => p.id === panelId);
    if (!panel) {
      console.error(`Panel not found: ${panelId}`);
      return;
    }
    
    const updatedImageUrls = [...panel.imageUrls];
    updatedImageUrls[imageIndex] = newImageUrl;
    
    let updatedPromptsUsed = panel.promptsUsed || [];
    if (newPromptText) {
      updatedPromptsUsed = [...updatedPromptsUsed];
      if (updatedPromptsUsed.length <= imageIndex) {
        // Fill with empty strings up to imageIndex
        while (updatedPromptsUsed.length < imageIndex) {
          updatedPromptsUsed.push('');
        }
        updatedPromptsUsed.push(newPromptText);
      } else {
        updatedPromptsUsed[imageIndex] = newPromptText;
      }
    }
    
    const updatedPanels = panels.map(p => {
      if (p.id === panelId) {
        return { 
          ...p, 
          imageUrls: updatedImageUrls,
          promptsUsed: updatedPromptsUsed
        };
      }
      return p;
    });
    
    updateActiveStoryPanels(updatedPanels);
    toast({ title: "Image Updated", description: "Panel image has been updated." });
  }, [panels, toast, updateActiveStoryPanels]);

  const updatePanelImages = useCallback((panelId: string, updates: Array<{ imageIndex: number; newImageUrl: string; newPromptText: string }>) => {
    const panel = panels.find(p => p.id === panelId);
    if (!panel) {
      console.error(`Panel not found: ${panelId}`);
      return;
    }
    
    const updatedImageUrls = [...panel.imageUrls];
    let updatedPromptsUsed = [...(panel.promptsUsed || [])];
    
    updates.forEach(update => {
      updatedImageUrls[update.imageIndex] = update.newImageUrl;
      
      if (update.newPromptText) {
        if (updatedPromptsUsed.length <= update.imageIndex) {
          // Fill with empty strings up to imageIndex
          while (updatedPromptsUsed.length < update.imageIndex) {
            updatedPromptsUsed.push('');
          }
          updatedPromptsUsed.push(update.newPromptText);
        } else {
          updatedPromptsUsed[update.imageIndex] = update.newPromptText;
        }
      }
    });
    
    const updatedPanels = panels.map(p => {
      if (p.id === panelId) {
        return { 
          ...p, 
          imageUrls: updatedImageUrls,
          promptsUsed: updatedPromptsUsed
        };
      }
      return p;
    });
    
    updateActiveStoryPanels(updatedPanels);
    toast({ title: "Panel Images Updated", description: "Multiple images in the panel were updated." });
  }, [panels, toast, updateActiveStoryPanels]);

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
        await addPanel({ imageUrls, parentId: null, userDescription: description });
        setIsUploadDialogOpen(false);
        navigateToStoryEditor();
      })
      .catch(error => {
        console.error("Error reading files or adding panel:", error);
        toast({ title: "File Error", description: "Could not read files or create initial panel.", variant: "destructive" });
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
      await addPanel({ 
        imageUrls: newPanelImageUrls, 
        parentId: selectedPanelForGeneration.id, 
        promptsUsed
      });
    }
    setIsGenerateDialogOpen(false);
    setSelectedPanelForGeneration(null);
  }, [addPanel, selectedPanelForGeneration]);

  const handleUpdatePanelTitle = useCallback(async (panelId: string, newTitle: string) => {
    await updatePanelTitle(panelId, newTitle);
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
    await updatePanelImage(panelId, imageIndex, newImageUrl, newPromptText);
    setIsRegenerateImageDialogOpen(false);
    setSelectedImageForRegeneration(null);
  }, [updatePanelImage]);

  const handleOpenEditPanelDialog = useCallback((panelId: string) => {
    const panel = getPanel(panelId);
    if (panel) {
      setPanelForEditing(panel);
      setIsEditPanelDialogOpen(true);
    }
  }, [getPanel]);

  const handlePanelImagesUpdated = useCallback(async (panelId: string, updates: Array<{ imageIndex: number; newImageUrl: string; newPromptText: string }>) => {
    await updatePanelImages(panelId, updates);
    setIsEditPanelDialogOpen(false);
    setPanelForEditing(null);
  }, [updatePanelImages]);

  const renderContent = () => {
    if (isStoryLoading || isProcessingFile) {
      return (
        <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-50 p-4">
          <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 animate-spin text-primary mb-2 sm:mb-3 md:mb-4" />
          <p className="text-sm sm:text-md md:text-lg text-foreground text-center">
            {isStoryLoading ? "Loading your story..." : "Processing your content..."}
          </p>
        </div>
      );
    }

    if (storyError) {
      return (
        <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-50 p-4 text-center">
            <AlertTriangle className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-destructive mb-2 sm:mb-3 md:mb-4" />
            <h2 className="text-md sm:text-lg md:text-xl font-semibold text-destructive mb-1 sm:mb-2">Oops! Something went wrong.</h2>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-3 sm:mb-4">{storyError}</p>
            <Button onClick={() => window.location.reload()} variant="destructive" size="sm" className="text-xs sm:text-sm">Try Reloading</Button>
        </div>
      );
    }

    if (showHomePage) { 
      return <HomePage onUploadInitial={handleUploadInitialPanel} />;
    }
    
    if (!rootPanelId && panels.length > 0) {
      return (
        <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-50 p-4">
          <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 animate-spin text-primary mb-2 sm:mb-3 md:mb-4" />
          <p className="text-sm sm:text-md md:text-lg text-foreground text-center">Initializing story map...</p>
        </div>
      );
    }

    return (
      <DynamicFlowchart
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
          onUploadComicBook={() => {}} // Provide empty function to satisfy interface
          onNewStory={resetStory}
          hasStory={!!rootPanelId || panels.length > 0}
          onNavigateHome={navigateToHome}
          storySelector={
            <StorySelector
              storiesCollection={storiesCollection}
              activeStory={activeStory}
              onCreateNewStory={createNewStory}
              onSwitchStory={switchStory}
              onDeleteStory={deleteStory}
              onUpdateStoryTitle={updateStoryTitle}
            />
          }
        />
        <main className="flex-1 overflow-hidden relative">
          {renderContent()}
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
    </ThemeProvider>
  );
}

