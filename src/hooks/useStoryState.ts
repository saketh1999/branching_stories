"use client";

import type { ComicPanelData } from '@/types/story';
import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Using uuid for unique IDs

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
    ({ imageUrl, parentId, promptUsed, userDescription }: {
      imageUrl: string;
      parentId: string | null;
      promptUsed?: string;
      userDescription?: string;
    }): string => {
      const newPanelId = uuidv4();
      const newPanel: ComicPanelData = {
        id: newPanelId,
        imageUrl,
        parentId,
        promptUsed,
        userDescription,
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
    [rootPanelId] // Add rootPanelId to dependencies
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
