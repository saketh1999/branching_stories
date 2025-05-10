
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

interface AddComicBookArgs {
  pageImageUrls: string[]; // Array of image URLs, one for each page
  comicBookTitle: string;
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
      // For group nodes, children are its pages. For regular nodes, children are subsequent panels.
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
      let panelTitle = `Panel ${newPanelId.substring(0, 4)}`; 

      if (userDescription) { 
        panelTitle = userDescription.substring(0, 50) + (userDescription.length > 50 ? '...' : '');
        if (!rootPanelId) { 
          actualParentId = null;
          setRootPanelId(newPanelId);
        } else { 
          actualParentId = lastInitialPanelId;
        }
      } else if (promptsUsed && promptsUsed.length > 0) { 
        panelTitle = promptsUsed[0].substring(0, 50) + (promptsUsed[0].length > 50 ? '...' : '');
      }

      const newPanel: ComicPanelData = {
        id: newPanelId,
        imageUrls,
        title: panelTitle,
        parentId: actualParentId,
        promptsUsed: promptsUsed,
        userDescription: userDescription,
        childrenIds: [],
        isGroupNode: false,
        isComicBookPage: false,
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

      if (userDescription || !actualParentId) { 
        setLastInitialPanelId(newPanelId);
      }
      
      return newPanelId;
    },
    [rootPanelId, lastInitialPanelId] 
  );

  const addComicBook = useCallback(
    ({ pageImageUrls, comicBookTitle }: AddComicBookArgs): string => {
      if (pageImageUrls.length === 0) {
        throw new Error("Cannot create a comic book with no pages.");
      }

      const comicBookRootId = uuidv4();
      const comicBookRootPanel: ComicPanelData = {
        id: comicBookRootId,
        imageUrls: [], // Group node might not have its own images, or could show a cover
        title: comicBookTitle.trim() || `Comic Book ${comicBookRootId.substring(0,4)}`,
        userDescription: `Comic Book: ${comicBookTitle.trim()}`,
        parentId: rootPanelId ? lastInitialPanelId : null,
        childrenIds: [], // Will be populated with page IDs
        isGroupNode: true,
        isComicBookPage: false,
      };

      const pagePanelsToAdd: ComicPanelData[] = pageImageUrls.map((imageUrl, index) => {
        const pageId = uuidv4();
        comicBookRootPanel.childrenIds.push(pageId);
        return {
          id: pageId,
          imageUrls: [imageUrl],
          title: `Page ${index + 1}`,
          promptsUsed: [`Page ${index + 1} of "${comicBookTitle}"`], // Auto-prompt for page
          parentId: comicBookRootId,
          childrenIds: [],
          isGroupNode: false,
          isComicBookPage: true,
          pageNumber: index + 1,
        };
      });
      
      setPanels(prevPanels => {
        let updatedPanels = [...prevPanels, comicBookRootPanel, ...pagePanelsToAdd];
        if (comicBookRootPanel.parentId) {
          updatedPanels = updatedPanels.map(p =>
            p.id === comicBookRootPanel.parentId ? { ...p, childrenIds: [...p.childrenIds, comicBookRootId] } : p
          );
        }
        return updatedPanels;
      });

      if (!rootPanelId && !comicBookRootPanel.parentId) {
        setRootPanelId(comicBookRootId);
      }
      setLastInitialPanelId(comicBookRootId); // The new comic book group is the latest "initial" item

      return comicBookRootId;
    },
    [rootPanelId, lastInitialPanelId]
  );


  const updatePanelTitle = useCallback((panelId: string, newTitle: string) => {
    setPanels(prevPanels =>
      prevPanels.map(p =>
        p.id === panelId ? { ...p, title: newTitle.trim() || (p.isComicBookPage ? `Page ${p.pageNumber}` : `Panel ${p.id.substring(0,4)}`) } : p
      )
    );
  }, []);

  const updatePanelImage = useCallback(
    (panelId: string, imageIndex: number, newImageUrl: string, newPromptText?: string) => {
      setPanels(prevPanels =>
        prevPanels.map(panel => {
          if (panel.id === panelId) {
            const updatedImageUrls = [...panel.imageUrls];
            if (imageIndex < 0 || imageIndex >= updatedImageUrls.length) {
              console.error(`Invalid imageIndex ${imageIndex} for panel ${panelId} with ${updatedImageUrls.length} images.`);
              return panel; // Do not modify if index is out of bounds
            }
            updatedImageUrls[imageIndex] = newImageUrl;

            let updatedPromptsUsed = panel.promptsUsed ? [...panel.promptsUsed] : Array(updatedImageUrls.length).fill('');
            if (newPromptText !== undefined) {
              while(updatedPromptsUsed.length < updatedImageUrls.length) {
                updatedPromptsUsed.push('');
              }
               if (imageIndex < updatedPromptsUsed.length) {
                 updatedPromptsUsed[imageIndex] = newPromptText;
               } else {
                 console.warn(`Prompt index ${imageIndex} out of bounds during single image update for panel ${panelId}`);
               }
            }
            
            return { ...panel, imageUrls: updatedImageUrls, promptsUsed: updatedPromptsUsed };
          }
          return panel;
        })
      );
    },
    []
  );

  const updatePanelImages = useCallback(
    (panelId: string, updates: Array<{ imageIndex: number; newImageUrl: string; newPromptText: string }>) => {
      setPanels(prevPanels =>
        prevPanels.map(panel => {
          if (panel.id === panelId) {
            const updatedImageUrls = [...panel.imageUrls];
            let updatedPromptsUsed = panel.promptsUsed ? [...panel.promptsUsed] : Array(panel.imageUrls.length).fill('');
            while(updatedPromptsUsed.length < panel.imageUrls.length) {
                updatedPromptsUsed.push('');
            }

            updates.forEach(update => {
              if (update.imageIndex >= 0 && update.imageIndex < updatedImageUrls.length) {
                updatedImageUrls[update.imageIndex] = update.newImageUrl;
                if (update.imageIndex < updatedPromptsUsed.length) {
                    updatedPromptsUsed[update.imageIndex] = update.newPromptText;
                } else { 
                    console.warn(`Prompt index ${update.imageIndex} out of bounds during batch update for panel ${panelId}`);
                }
              }
            });
            
            return { ...panel, imageUrls: updatedImageUrls, promptsUsed: updatedPromptsUsed };
          }
          return panel;
        })
      );
    },
    []
  );


  const resetStory = useCallback(() => {
    setPanels([]);
    setRootPanelId(null);
    setLastInitialPanelId(null);
  }, []);

  return {
    panels,
    rootPanelId,
    addPanel,
    addComicBook,
    getPanel,
    getChildren,
    resetStory,
    updatePanelTitle,
    updatePanelImage,
    updatePanelImages, 
    lastInitialPanelId, 
  };
}

