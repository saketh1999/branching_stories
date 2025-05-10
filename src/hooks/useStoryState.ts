
"use client";

import type { ComicPanelData, ComicStoryInfo } from '@/types/story';
import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  getStoryInfo,
  createOrUpdateStoryInfo,
  getPanelsForStory,
  addPanelToDb,
  addComicBookToDb,
  updatePanelInDb,
  updatePanelChildrenInDb,
  resetStoryInDb
} from '@/services/firestoreService';
import { Timestamp } from 'firebase/firestore';
import { useToast } from './use-toast';


// TODO: For multi-user support, storyId would likely come from user auth or URL.
const DEFAULT_STORY_ID = "defaultStory"; 
const DEFAULT_STORY_TITLE = "My Branching Tale";

interface AddPanelArgs {
  imageUrls: string[];
  parentId: string | null;
  promptsUsed?: string[];
  userDescription?: string;
}

interface AddComicBookArgs {
  pageImageUrls: string[];
  comicBookTitle: string;
}

export function useStoryState() {
  const [panels, setPanels] = useState<ComicPanelData[]>([]);
  const [rootPanelId, setRootPanelId] = useState<string | null>(null);
  const [lastInitialPanelId, setLastInitialPanelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadStory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let storyInfo = await getStoryInfo(DEFAULT_STORY_ID);
      if (!storyInfo) {
        await createOrUpdateStoryInfo(DEFAULT_STORY_ID, { 
            title: DEFAULT_STORY_TITLE, 
            rootPanelId: null, 
            lastInitialPanelId: null 
        });
        storyInfo = await getStoryInfo(DEFAULT_STORY_ID); // Re-fetch after creation
         if (!storyInfo) throw new Error("Failed to create or load story info.");
      }
      
      const dbPanels = await getPanelsForStory(DEFAULT_STORY_ID);
      setPanels(dbPanels.map(p => ({...p, createdAt: p.createdAt || new Date() }))); // Ensure createdAt is a Date
      setRootPanelId(storyInfo.rootPanelId);
      setLastInitialPanelId(storyInfo.lastInitialPanelId);

    } catch (err) {
      console.error("Failed to load story:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while loading the story.");
      toast({ title: "Load Error", description: "Could not load story data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadStory();
  }, [loadStory]);


  const getPanel = useCallback(
    (panelId: string): ComicPanelData | undefined => {
      return panels.find(p => p.id === panelId);
    },
    [panels]
  );

  const addPanel = useCallback(
    async ({ imageUrls, parentId: intendedParentId, promptsUsed, userDescription }: AddPanelArgs): Promise<string> => {
      if (imageUrls.length === 0 || imageUrls.length > 4) {
        const msg = imageUrls.length === 0 ? "Cannot add a panel with no images." : "Cannot add a panel with more than 4 images.";
        toast({ title: "Panel Error", description: msg, variant: "destructive" });
        throw new Error(msg);
      }
      if (promptsUsed && promptsUsed.length !== imageUrls.length) {
        const msg = "Prompts and images count mismatch for generated panel.";
        toast({ title: "Panel Error", description: msg, variant: "destructive" });
        throw new Error(msg);
      }

      const newPanelId = uuidv4();
      let actualParentId: string | null = intendedParentId;
      let panelTitle = `Panel ${newPanelId.substring(0, 4)}`;
      let newRootPanelId = rootPanelId;
      let newLastInitialPanelId = lastInitialPanelId;

      if (userDescription) {
        panelTitle = userDescription.substring(0, 50) + (userDescription.length > 50 ? '...' : '');
        if (!rootPanelId) {
          actualParentId = null;
          newRootPanelId = newPanelId;
        } else {
          actualParentId = lastInitialPanelId; 
        }
        newLastInitialPanelId = newPanelId;
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
        createdAt: new Date(), // Use client date, Firestore will use serverTimestamp on first save
      };

      try {
        // Optimistic UI update
        setPanels(prevPanels => {
          const updatedPanels = [...prevPanels, newPanel];
          if (actualParentId) {
            return updatedPanels.map(p =>
              p.id === actualParentId ? { ...p, childrenIds: [...p.childrenIds, newPanelId] } : p
            );
          }
          return updatedPanels;
        });
        if (newRootPanelId !== rootPanelId) setRootPanelId(newRootPanelId);
        if (newLastInitialPanelId !== lastInitialPanelId) setLastInitialPanelId(newLastInitialPanelId);
        
        // DB update
        await addPanelToDb(DEFAULT_STORY_ID, newPanel);
        if (actualParentId) {
          const parentPanel = getPanel(actualParentId);
          if (parentPanel) {
            await updatePanelChildrenInDb(DEFAULT_STORY_ID, actualParentId, [...parentPanel.childrenIds, newPanelId]);
          }
        }
        await createOrUpdateStoryInfo(DEFAULT_STORY_ID, { rootPanelId: newRootPanelId, lastInitialPanelId: newLastInitialPanelId });
        
        toast({ title: "Panel Added", description: `Panel "${panelTitle}" created.` });
      } catch (err) {
        console.error("Failed to add panel:", err);
        toast({ title: "Save Error", description: "Could not save new panel.", variant: "destructive" });
        // Revert optimistic update (simplified - full revert might need storing pre-update state)
        loadStory(); // Reload to ensure consistency
        throw err; 
      }
      return newPanelId;
    },
    [rootPanelId, lastInitialPanelId, getPanel, toast, loadStory, panels]
  );

  const addComicBook = useCallback(
    async ({ pageImageUrls, comicBookTitle }: AddComicBookArgs): Promise<string> => {
      if (pageImageUrls.length === 0) {
        toast({ title: "Comic Book Error", description: "Cannot create a comic book with no pages.", variant: "destructive" });
        throw new Error("Cannot create a comic book with no pages.");
      }

      const comicBookGroupId = uuidv4();
      const actualComicBookTitle = comicBookTitle.trim() || `Comic Book ${comicBookGroupId.substring(0,4)}`;
      let comicBookParentId: string | null = null;
      let newRootPanelId = rootPanelId;

      if (!rootPanelId) {
        newRootPanelId = comicBookGroupId;
      } else {
        comicBookParentId = lastInitialPanelId;
      }

      const comicBookGroupNode: ComicPanelData = {
        id: comicBookGroupId,
        imageUrls: [],
        title: actualComicBookTitle,
        userDescription: `Comic Book: ${actualComicBookTitle}`,
        parentId: comicBookParentId,
        childrenIds: [],
        isGroupNode: true,
        isComicBookPage: false,
        createdAt: new Date(),
      };

      const pagePanelsToAdd: ComicPanelData[] = pageImageUrls.map((imageUrl, index) => {
        const pageId = uuidv4();
        comicBookGroupNode.childrenIds.push(pageId);
        return {
          id: pageId,
          imageUrls: [imageUrl],
          title: `Page ${index + 1}`,
          parentId: comicBookGroupId,
          childrenIds: [],
          isGroupNode: false,
          isComicBookPage: true,
          pageNumber: index + 1,
          createdAt: new Date(),
        };
      });
      
      try {
        // Optimistic UI Update
        setPanels(prev => {
            let updatedPanels = [...prev, comicBookGroupNode, ...pagePanelsToAdd];
            if (comicBookParentId) {
                updatedPanels = updatedPanels.map(p =>
                    p.id === comicBookParentId ? { ...p, childrenIds: [...p.childrenIds, comicBookGroupId] } : p
                );
            }
            return updatedPanels;
        });
        if(newRootPanelId !== rootPanelId) setRootPanelId(newRootPanelId);
        setLastInitialPanelId(comicBookGroupId);

        // DB Update
        await addComicBookToDb(DEFAULT_STORY_ID, comicBookGroupNode, pagePanelsToAdd);
        if (comicBookParentId) {
          const parentPanel = getPanel(comicBookParentId); // getPanel uses current state, which should be updated
          if (parentPanel) {
             await updatePanelChildrenInDb(DEFAULT_STORY_ID, comicBookParentId, [...parentPanel.childrenIds, comicBookGroupId]);
          }
        }
        await createOrUpdateStoryInfo(DEFAULT_STORY_ID, { rootPanelId: newRootPanelId, lastInitialPanelId: comicBookGroupId });

        toast({ title: "Comic Book Added", description: `"${actualComicBookTitle}" created.` });
      } catch (err) {
        console.error("Failed to add comic book:", err);
        toast({ title: "Save Error", description: "Could not save new comic book.", variant: "destructive" });
        loadStory(); // Revert
        throw err;
      }
      return comicBookGroupId;
    },
    [rootPanelId, lastInitialPanelId, getPanel, toast, loadStory, panels]
  );

  const updatePanelTitle = useCallback(async (panelId: string, newTitle: string) => {
    const panel = getPanel(panelId);
    if (!panel) return;

    let finalTitle = newTitle.trim();
    if (!finalTitle) {
      if (panel.isGroupNode) finalTitle = panel.userDescription || `Comic Book ${panel.id.substring(0,4)}`;
      else if (panel.isComicBookPage) finalTitle = `Page ${panel.pageNumber}`;
      else finalTitle = `Panel ${panel.id.substring(0,4)}`;
    }
    const updatedUserDescription = panel.isGroupNode ? (panel.userDescription?.startsWith("Comic Book:") ? `Comic Book: ${finalTitle}`: finalTitle) : panel.userDescription;

    const oldTitle = panel.title;
    const oldUserDesc = panel.userDescription;

    // Optimistic update
    setPanels(prevPanels =>
      prevPanels.map(p => p.id === panelId ? { ...p, title: finalTitle, userDescription: updatedUserDescription } : p)
    );

    try {
      await updatePanelInDb(DEFAULT_STORY_ID, panelId, { title: finalTitle, userDescription: updatedUserDescription });
      toast({ title: "Title Updated", description: `Panel title changed to "${finalTitle.substring(0,30)}...".`});
    } catch (err) {
      console.error("Failed to update panel title:", err);
      toast({ title: "Save Error", description: "Could not update panel title.", variant: "destructive" });
      // Revert optimistic update
      setPanels(prevPanels =>
        prevPanels.map(p => p.id === panelId ? { ...p, title: oldTitle, userDescription: oldUserDesc } : p)
      );
    }
  }, [getPanel, toast, panels]);

  const updatePanelImage = useCallback(async (panelId: string, imageIndex: number, newImageUrl: string, newPromptText?: string) => {
    const panel = getPanel(panelId);
    if (!panel) return;

    const oldImageUrls = [...panel.imageUrls];
    const oldPromptsUsed = panel.promptsUsed ? [...panel.promptsUsed] : undefined;

    const updatedImageUrls = [...panel.imageUrls];
    if (imageIndex < 0 || imageIndex >= updatedImageUrls.length) {
      console.error(`Invalid imageIndex ${imageIndex} for panel ${panelId}`);
      return;
    }
    updatedImageUrls[imageIndex] = newImageUrl;

    let updatedPromptsUsed = panel.promptsUsed ? [...panel.promptsUsed] : Array(updatedImageUrls.length).fill('');
    if (newPromptText !== undefined) {
      while(updatedPromptsUsed.length < updatedImageUrls.length) updatedPromptsUsed.push('');
      if (imageIndex < updatedPromptsUsed.length) updatedPromptsUsed[imageIndex] = newPromptText;
    }
    
    // Optimistic update
    setPanels(prevPanels =>
      prevPanels.map(p => p.id === panelId ? { ...p, imageUrls: updatedImageUrls, promptsUsed: updatedPromptsUsed } : p)
    );
    
    try {
      await updatePanelInDb(DEFAULT_STORY_ID, panelId, { imageUrls: updatedImageUrls, promptsUsed: updatedPromptsUsed });
      toast({ title: "Image Updated", description: `Image ${imageIndex + 1} in panel updated.`});
    } catch (err) {
      console.error("Failed to update panel image:", err);
      toast({ title: "Save Error", description: "Could not update panel image.", variant: "destructive" });
      // Revert
      setPanels(prevPanels =>
        prevPanels.map(p => p.id === panelId ? { ...p, imageUrls: oldImageUrls, promptsUsed: oldPromptsUsed } : p)
      );
    }
  }, [getPanel, toast, panels]);

  const updatePanelImages = useCallback(async (panelId: string, updates: Array<{ imageIndex: number; newImageUrl: string; newPromptText: string }>) => {
    const panel = getPanel(panelId);
    if (!panel) return;

    const oldImageUrls = [...panel.imageUrls];
    const oldPromptsUsed = panel.promptsUsed ? [...panel.promptsUsed] : undefined;

    const updatedImageUrls = [...panel.imageUrls];
    let updatedPromptsUsed = panel.promptsUsed ? [...panel.promptsUsed] : Array(panel.imageUrls.length).fill('');
    while(updatedPromptsUsed.length < panel.imageUrls.length) updatedPromptsUsed.push('');

    updates.forEach(update => {
      if (update.imageIndex >= 0 && update.imageIndex < updatedImageUrls.length) {
        updatedImageUrls[update.imageIndex] = update.newImageUrl;
        if (update.imageIndex < updatedPromptsUsed.length) updatedPromptsUsed[update.imageIndex] = update.newPromptText;
      }
    });
    
    // Optimistic update
    setPanels(prevPanels =>
      prevPanels.map(p => p.id === panelId ? { ...p, imageUrls: updatedImageUrls, promptsUsed: updatedPromptsUsed } : p)
    );

    try {
      await updatePanelInDb(DEFAULT_STORY_ID, panelId, { imageUrls: updatedImageUrls, promptsUsed: updatedPromptsUsed });
      toast({ title: "Panel Images Updated", description: "Multiple images in the panel were updated." });
    } catch (err) {
      console.error("Failed to update panel images:", err);
      toast({ title: "Save Error", description: "Could not update panel images.", variant: "destructive" });
      // Revert
      setPanels(prevPanels =>
        prevPanels.map(p => p.id === panelId ? { ...p, imageUrls: oldImageUrls, promptsUsed: oldPromptsUsed } : p)
      );
    }
  }, [getPanel, toast, panels]);

  const resetStory = useCallback(async () => {
    setIsLoading(true);
    try {
      await resetStoryInDb(DEFAULT_STORY_ID);
      setPanels([]);
      setRootPanelId(null);
      setLastInitialPanelId(null);
      toast({ title: "Story Reset", description: "The story has been cleared." });
    } catch (err) {
      console.error("Failed to reset story:", err);
      toast({ title: "Reset Error", description: "Could not reset story data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    panels,
    rootPanelId,
    lastInitialPanelId,
    isLoading,
    error,
    addPanel,
    addComicBook,
    getPanel,
    resetStory,
    updatePanelTitle,
    updatePanelImage,
    updatePanelImages,
  };
}
