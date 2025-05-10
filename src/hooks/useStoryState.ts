
"use client";

import type { ComicPanelData } from '@/types/story';
import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Using uuid for unique IDs

interface AddPanelArgs {
  imageUrls: string[]; // Array of 1-4 image URLs
  parentId: string | null;
  promptsUsed?: string[]; // For generated panels
  userDescription?: string; // For initial panel
}

export function useStoryState() {
  const [panels, setPanels] = useState<ComicPanelData[]>([]);
  const [rootPanelId, setRootPanelId] = useState<string | null>(null);

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
    ({ imageUrls, parentId, promptsUsed, userDescription }: AddPanelArgs): string => {
      if (imageUrls.length === 0 || imageUrls.length > 4) {
        console.error("A panel must have between 1 and 4 images.");
        // Or throw an error, depending on how strict you want to be.
        // For now, let's prevent adding if outside bounds, though UI should validate this.
        if (imageUrls.length === 0) throw new Error("Cannot add a panel with no images.");
        if (imageUrls.length > 4) throw new Error("Cannot add a panel with more than 4 images.");

      }
      if (promptsUsed && promptsUsed.length !== imageUrls.length) {
        console.error("Number of prompts must match number of images for generated panels.");
        throw new Error("Prompts and images count mismatch for generated panel.");
      }

      const newPanelId = uuidv4();
      const newPanel: ComicPanelData = {
        id: newPanelId,
        imageUrls,
        parentId,
        promptsUsed: promptsUsed,
        userDescription: userDescription,
        childrenIds: [],
      };

      setPanels(prevPanels => {
        const updatedPanels = [...prevPanels, newPanel];
        if (parentId) {
          return updatedPanels.map(p =>
            p.id === parentId ? { ...p, childrenIds: [...p.childrenIds, newPanelId] } : p
          );
        }
        return updatedPanels;
      });

      if (!parentId && !rootPanelId) {
        setRootPanelId(newPanelId);
      }
      
      return newPanelId;
    },
    [rootPanelId] 
  );

  const resetStory = useCallback(() => {
    setPanels([]);
    setRootPanelId(null);
  }, []);

  return {
    panels,
    rootPanelId,
    addPanel,
    getPanel,
    getChildren,
    resetStory,
  };
}
