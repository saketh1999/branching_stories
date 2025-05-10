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
  const { panels, rootPanelId, addPanel, getPanel, resetStory } = useStoryState();
  const { toast } = useToast();

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedPanelForGeneration, setSelectedPanelForGeneration] = useState<ComicPanelData | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const handleUploadInitialPanel = useCallback(() => {
    if (rootPanelId) {
      toast({ title: "Story Exists", description: "Please start a new story to upload another initial panel.", variant: "default" });
      return;
    }
    setIsUploadDialogOpen(true);
  }, [rootPanelId, toast]);

  const handleNewStory = useCallback(() => {
    resetStory();
    toast({ title: "New Story Started", description: "Your canvas is clear. Upload a panel to begin!"});
  }, [resetStory, toast]);

  const processUploadedFile = (file: File, description: string) => {
    setIsProcessingFile(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageUrl = reader.result as string;
      addPanel({ imageUrl, parentId: null, userDescription: description });
      setIsUploadDialogOpen(false);
      setIsProcessingFile(false);
      toast({ title: "Panel Uploaded!", description: "Your story has begun." });
    };
    reader.onerror = () => {
      setIsProcessingFile(false);
      toast({ title: "File Error", description: "Could not read the uploaded file.", variant: "destructive" });
    };
    reader.readAsDataURL(file);
  };

  const handleOpenGenerateDialog = useCallback((panelId: string) => {
    const panel = getPanel(panelId); // getPanel is still useful here for fetching data for the dialog
    if (panel) {
      setSelectedPanelForGeneration(panel);
      setIsGenerateDialogOpen(true);
    }
  }, [getPanel]);

  const handlePanelGenerated = useCallback((newPanelDataUri: string, promptUsed: string) => {
    if (selectedPanelForGeneration) {
      addPanel({ 
        imageUrl: newPanelDataUri, 
        parentId: selectedPanelForGeneration.id,
        promptUsed
      });
    }
    setIsGenerateDialogOpen(false);
    setSelectedPanelForGeneration(null);
  }, [addPanel, selectedPanelForGeneration]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground antialiased">
      <AppHeader 
        onUploadInitialPanel={handleUploadInitialPanel}
        onNewStory={handleNewStory}
        hasStory={!!rootPanelId}
      />
      <main className="flex-1 overflow-hidden relative"> {/* Changed p- to overflow-hidden for ReactFlow */}
        {isProcessingFile && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-50">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-foreground">Processing your panel...</p>
          </div>
        )}
        {!rootPanelId && !isProcessingFile && (
          <div className="flex items-center justify-center h-full"> {/* Center WelcomeMessage */}
            <WelcomeMessage onUploadInitial={handleUploadInitialPanel} />
          </div>
        )}
        {/* FlowchartDisplay will now take full height of main if rootPanelId exists */}
        {rootPanelId && !isProcessingFile && (
          <FlowchartDisplay
            panels={panels}
            rootId={rootPanelId}
            onGenerateNext={handleOpenGenerateDialog}
            onBranch={handleOpenGenerateDialog} // Same action for now
          />
        )}
      </main>

      <UploadInitialPanelDialog
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        onUpload={processUploadedFile}
      />
      
      {selectedPanelForGeneration && (
        <GeneratePanelDialog
          isOpen={isGenerateDialogOpen}
          onClose={() => {
            setIsGenerateDialogOpen(false);
            setSelectedPanelForGeneration(null);
          }}
          parentPanel={selectedPanelForGeneration}
          onPanelGenerated={handlePanelGenerated}
        />
      )}
    </div>
  );
}
