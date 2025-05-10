
"use client";

import type { ComicPanelData } from '@/types/story';
import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Using uuid for unique IDs

interface AddPanelArgs {
  imageUrls: string[]; // Array of 1-4 image URLs
  parentId: string | null; // This is the *intended* parent from the UI action
  promptsUsed?: string[]; // For generated panels
  userDescription?: string; // For initial panel
}

export function useStoryState() {
  const [panels, setPanels] = useState<ComicPanelData[]>([]);
  const [rootPanelId, setRootPanelId] = useState<string | null>(null);
  const [lastInitialPanelId, setLastInitialPanelId] = useState<string | null>(null);

  const getPanel = useCallback(
    (panelId: string): ComicPanelData | undefined => {
      return panels.find(p => p.id === panelId);
    },
    [panels]
  );

  const getChildren = useCallback(
    (panelId: string): ComicPanelData[] => {
      const parentPanel = getPanel(panelId);
      if (!parentPanel) return [];
      return parentPanel.childrenIds.map(childId => getPanel(childId)).filter(Boolean) as ComicPanelData[];
    },
    [panels, getPanel]
  );
  
  const addPanel = useCallback(
    ({ imageUrls, parentId: intendedParentId, promptsUsed, userDescription }: AddPanelArgs): string => {
      if (imageUrls.length === 0 || imageUrls.length > 4) {
        const msg = imageUrls.length === 0 ? "Cannot add a panel with no images." : "Cannot add a panel with more than 4 images.";
        console.error(msg);
        throw new Error(msg);
      }
      if (promptsUsed && promptsUsed.length !== imageUrls.length) {
        const msg = "Prompts and images count mismatch for generated panel.";
        console.error(msg);
        throw new Error(msg);
      }

      const newPanelId = uuidv4();
      let actualParentId: string | null = intendedParentId;
      let panelTitle = `Panel ${newPanelId.substring(0, 4)}`; // Default title

      if (userDescription) { // This signifies an initial panel uploaded by user
        panelTitle = userDescription.substring(0, 50) + (userDescription.length > 50 ? '...' : '');
        if (!rootPanelId) { // Very first panel of the story
          actualParentId = null;
          setRootPanelId(newPanelId);
        } else { // Subsequent "initial" panel, chain it
          actualParentId = lastInitialPanelId;
        }
      } else if (promptsUsed && promptsUsed.length > 0) { // Generated panel
        panelTitle = promptsUsed[0].substring(0, 50) + (promptsUsed[0].length > 50 ? '...' : '');
        // actualParentId is already set correctly from intendedParentId for generated panels
      }


      const newPanel: ComicPanelData = {
        id: newPanelId,
        imageUrls,
        title: panelTitle,
        parentId: actualParentId,
        promptsUsed: promptsUsed,
        userDescription: userDescription,
        childrenIds: [],
      };

      setPanels(prevPanels => {
        const updatedPanels = [...prevPanels, newPanel];
        if (actualParentId) {
          return updatedPanels.map(p =>
            p.id === actualParentId ? { ...p, childrenIds: [...p.childrenIds, newPanelId] } : p
          );
        }
        return updatedPanels;
      });

      if (userDescription) { // If it was an "initial" panel type
        setLastInitialPanelId(newPanelId);
      }
      
      return newPanelId;
    },
    [rootPanelId, lastInitialPanelId] 
  );

  const updatePanelTitle = useCallback((panelId: string, newTitle: string) => {
    setPanels(prevPanels =>
      prevPanels.map(p =>
        p.id === panelId ? { ...p, title: newTitle.trim() || `Panel ${p.id.substring(0,4)}` } : p
      )
    );
  }, []);

  const resetStory = useCallback(() => {
    setPanels([]);
    setRootPanelId(null);
    setLastInitialPanelId(null);
  }, []);

  return {
    panels,
    rootPanelId,
    addPanel,
    getPanel,
    getChildren,
    resetStory,
    updatePanelTitle,
    lastInitialPanelId, // Potentially for UI logic if needed, though addPanel handles chaining.
  };
}

