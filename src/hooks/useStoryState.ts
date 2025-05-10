
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
  const [lastInitialPanelId, setLastInitialPanelId] = useState<string | null>(null); // Tracks the ID of the last top-level item (initial panel or comic book group)

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

      // If it's an initial panel (user provided description)
      if (userDescription) { 
        panelTitle = userDescription.substring(0, 50) + (userDescription.length > 50 ? '...' : '');
        if (!rootPanelId) { 
          // This is the very first panel, becomes the root
          actualParentId = null; 
          setRootPanelId(newPanelId);
        } else if (lastInitialPanelId) {
          // This is a subsequent initial panel, parent it to the last top-level item
          actualParentId = lastInitialPanelId;
        } else {
          // Fallback if rootPanelId exists but lastInitialPanelId is somehow null (should not happen in normal flow)
          actualParentId = null; 
          if (!rootPanelId) setRootPanelId(newPanelId);
        }
      } else if (promptsUsed && promptsUsed.length > 0) { 
        // Generated panel
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

      // If this panel is a top-level item (no parent or its parent was a previous top-level item)
      if (!actualParentId || (actualParentId === lastInitialPanelId && !userDescription)) {
         // If it's truly a new root (userDescription sets this) or no parent
        if (userDescription || !actualParentId) {
            setLastInitialPanelId(newPanelId);
            if (!rootPanelId) setRootPanelId(newPanelId);
        }
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

      const comicBookGroupId = uuidv4();
      const actualComicBookTitle = comicBookTitle.trim() || `Comic Book ${comicBookGroupId.substring(0,4)}`;
      
      let comicBookParentId: string | null = null;
      if (!rootPanelId) {
        setRootPanelId(comicBookGroupId);
      } else {
        comicBookParentId = lastInitialPanelId;
      }

      const comicBookGroupNode: ComicPanelData = {
        id: comicBookGroupId,
        imageUrls: [], // Group node itself might not display images in the grid, or could show a cover if we adapt
        title: actualComicBookTitle,
        userDescription: `Comic Book: ${actualComicBookTitle}`, // Store full title here for group node info
        parentId: comicBookParentId, 
        childrenIds: [], // Will be populated with page IDs
        isGroupNode: true,
        isComicBookPage: false,
      };

      const pagePanelsToAdd: ComicPanelData[] = pageImageUrls.map((imageUrl, index) => {
        const pageId = uuidv4();
        comicBookGroupNode.childrenIds.push(pageId); // Add page ID to group's children
        return {
          id: pageId,
          imageUrls: [imageUrl], // Each page has one image
          title: `Page ${index + 1}`, // Default title for a page
          // promptsUsed: [`Page ${index + 1} of "${actualComicBookTitle}"`], // Could be used for context
          parentId: comicBookGroupId, // Parent is the group node
          childrenIds: [],
          isGroupNode: false,
          isComicBookPage: true,
          pageNumber: index + 1,
        };
      });
      
      setPanels(prevPanels => {
        let updatedPanels = [...prevPanels, comicBookGroupNode, ...pagePanelsToAdd];
        if (comicBookGroupNode.parentId) {
          // Link this new comic book group to the previous lastInitialPanelId
          updatedPanels = updatedPanels.map(p =>
            p.id === comicBookGroupNode.parentId ? { ...p, childrenIds: [...p.childrenIds, comicBookGroupId] } : p
          );
        }
        return updatedPanels;
      });

      setLastInitialPanelId(comicBookGroupId); // This new comic book group is now the last top-level item

      return comicBookGroupId;
    },
    [rootPanelId, lastInitialPanelId]
  );


  const updatePanelTitle = useCallback((panelId: string, newTitle: string) => {
    setPanels(prevPanels =>
      prevPanels.map(p => {
        if (p.id === panelId) {
          let finalTitle = newTitle.trim();
          if (!finalTitle) { // Ensure there's always a title
            if (p.isGroupNode) finalTitle = p.userDescription || `Comic Book ${p.id.substring(0,4)}`;
            else if (p.isComicBookPage) finalTitle = `Page ${p.pageNumber}`;
            else finalTitle = `Panel ${p.id.substring(0,4)}`;
          }
          // For group nodes, also update userDescription if it's the primary title source
          const updatedUserDescription = p.isGroupNode ? (p.userDescription?.startsWith("Comic Book:") ? `Comic Book: ${finalTitle}`: finalTitle) : p.userDescription;
          return { ...p, title: finalTitle, userDescription: updatedUserDescription };
        }
        return p;
      })
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

