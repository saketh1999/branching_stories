
"use client";

import type { ComicPanelData, ComicStoryInfo } from '@/types/story';
import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from './use-toast';

const LOCAL_STORAGE_STORY_INFO_KEY = "comicStoryInfo_v2";
const LOCAL_STORAGE_PANELS_KEY = "comicStoryPanels_v2";
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
  const [storyInfo, setStoryInfo] = useState<ComicStoryInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const rootPanelId = storyInfo?.rootPanelId || null;
  const lastInitialPanelId = storyInfo?.lastInitialPanelId || null;

  const saveStateToLocalStorage = useCallback((currentStoryInfo: ComicStoryInfo | null, currentPanels: ComicPanelData[]) => {
    try {
      if (currentStoryInfo) {
        localStorage.setItem(LOCAL_STORAGE_STORY_INFO_KEY, JSON.stringify(currentStoryInfo));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_STORY_INFO_KEY);
      }
      localStorage.setItem(LOCAL_STORAGE_PANELS_KEY, JSON.stringify(currentPanels));
    } catch (e) {
      console.error("Error saving state to localStorage:", e);
      toast({ title: "Local Storage Error", description: "Could not save story progress locally.", variant: "destructive" });
    }
  }, [toast]);

  const loadStory = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const storedStoryInfoJSON = localStorage.getItem(LOCAL_STORAGE_STORY_INFO_KEY);
      const storedPanelsJSON = localStorage.getItem(LOCAL_STORAGE_PANELS_KEY);

      let loadedStoryInfo: ComicStoryInfo | null = null;
      if (storedStoryInfoJSON) {
        const parsedInfo = JSON.parse(storedStoryInfoJSON);
        loadedStoryInfo = {
          ...parsedInfo,
          createdAt: new Date(parsedInfo.createdAt),
          updatedAt: new Date(parsedInfo.updatedAt),
        };
      } else {
        loadedStoryInfo = {
          id: uuidv4(), // Default story ID if none exists
          title: DEFAULT_STORY_TITLE,
          createdAt: new Date(),
          updatedAt: new Date(),
          rootPanelId: null,
          lastInitialPanelId: null,
        };
      }
      setStoryInfo(loadedStoryInfo);

      if (storedPanelsJSON) {
        const parsedPanels: ComicPanelData[] = JSON.parse(storedPanelsJSON);
        setPanels(parsedPanels.map(p => ({ ...p, createdAt: p.createdAt ? new Date(p.createdAt) : new Date() })));
      } else {
        setPanels([]);
      }

      if (!storedStoryInfoJSON || !storedPanelsJSON) {
        // If either is missing, effectively a new story, so save initial state
        saveStateToLocalStorage(loadedStoryInfo, []);
      }

    } catch (err) {
      console.error("Failed to load story from localStorage:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while loading the story.");
      toast({ title: "Load Error", description: "Could not load story data from local storage. Starting fresh.", variant: "destructive" });
      // Fallback to a fresh story
      const freshStoryInfo: ComicStoryInfo = {
        id: uuidv4(),
        title: DEFAULT_STORY_TITLE,
        createdAt: new Date(),
        updatedAt: new Date(),
        rootPanelId: null,
        lastInitialPanelId: null,
      };
      setStoryInfo(freshStoryInfo);
      setPanels([]);
      saveStateToLocalStorage(freshStoryInfo, []);
    } finally {
      setIsLoading(false);
    }
  }, [toast, saveStateToLocalStorage]);

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
      
      let newRootPanelId = storyInfo?.rootPanelId || null;
      let newLastInitialPanelId = storyInfo?.lastInitialPanelId || null;
      const currentStoryId = storyInfo?.id || uuidv4();


      if (userDescription) {
        panelTitle = userDescription.substring(0, 50) + (userDescription.length > 50 ? '...' : '');
        if (!newRootPanelId) { // This is the very first panel group uploaded
          actualParentId = null;
          newRootPanelId = newPanelId;
        } else { // Subsequent initial panels link to the last "initial" one
          actualParentId = newLastInitialPanelId; 
        }
        newLastInitialPanelId = newPanelId; // This new panel is now the last "initial" one
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
        createdAt: new Date(),
      };

      const updatedPanels = [...panels, newPanel];
      if (actualParentId) {
        const parentIndex = updatedPanels.findIndex(p => p.id === actualParentId);
        if (parentIndex > -1) {
          updatedPanels[parentIndex] = {
            ...updatedPanels[parentIndex],
            childrenIds: [...updatedPanels[parentIndex].childrenIds, newPanelId],
          };
        }
      }
      setPanels(updatedPanels);

      const updatedStoryInfo: ComicStoryInfo = {
        ...(storyInfo || { id: currentStoryId, title: DEFAULT_STORY_TITLE, createdAt: new Date() }),
        rootPanelId: newRootPanelId,
        lastInitialPanelId: newLastInitialPanelId,
        updatedAt: new Date(),
      };
      setStoryInfo(updatedStoryInfo);
      
      saveStateToLocalStorage(updatedStoryInfo, updatedPanels);
      toast({ title: "Panel Added", description: `Panel "${panelTitle}" created.` });
      return newPanelId;
    },
    [storyInfo, panels, toast, saveStateToLocalStorage]
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
      let newRootPanelId = storyInfo?.rootPanelId || null;
      let newLastInitialPanelId = storyInfo?.lastInitialPanelId || null;
      const currentStoryId = storyInfo?.id || uuidv4();

      if (!newRootPanelId) { // This is the very first comic book uploaded
        newRootPanelId = comicBookGroupId;
      } else { // Subsequent comic books link to the last "initial" panel/comic book
        comicBookParentId = newLastInitialPanelId;
      }
      newLastInitialPanelId = comicBookGroupId; // This new comic book is now the last "initial" one


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
      
      let updatedPanels = [...panels, comicBookGroupNode, ...pagePanelsToAdd];
      if (comicBookParentId) {
        const parentIndex = updatedPanels.findIndex(p => p.id === comicBookParentId);
        if (parentIndex > -1) {
          updatedPanels[parentIndex] = {
            ...updatedPanels[parentIndex],
            childrenIds: [...updatedPanels[parentIndex].childrenIds, comicBookGroupId],
          };
        }
      }
      setPanels(updatedPanels);
      
      const updatedStoryInfo: ComicStoryInfo = {
        ...(storyInfo || { id: currentStoryId, title: DEFAULT_STORY_TITLE, createdAt: new Date() }),
        rootPanelId: newRootPanelId,
        lastInitialPanelId: newLastInitialPanelId,
        updatedAt: new Date(),
      };
      setStoryInfo(updatedStoryInfo);

      saveStateToLocalStorage(updatedStoryInfo, updatedPanels);
      toast({ title: "Comic Book Added", description: `"${actualComicBookTitle}" created.` });
      return comicBookGroupId;
    },
    [storyInfo, panels, toast, saveStateToLocalStorage]
  );

  const updatePanelTitle = useCallback(async (panelId: string, newTitle: string) => {
    const panelIndex = panels.findIndex(p => p.id === panelId);
    if (panelIndex === -1) return;

    const panel = panels[panelIndex];
    let finalTitle = newTitle.trim();
    if (!finalTitle) {
      if (panel.isGroupNode) finalTitle = panel.userDescription || `Comic Book ${panel.id.substring(0,4)}`;
      else if (panel.isComicBookPage) finalTitle = `Page ${panel.pageNumber}`;
      else finalTitle = `Panel ${panel.id.substring(0,4)}`;
    }
    const updatedUserDescription = panel.isGroupNode ? (panel.userDescription?.startsWith("Comic Book:") ? `Comic Book: ${finalTitle}`: finalTitle) : panel.userDescription;


    const updatedPanels = [...panels];
    updatedPanels[panelIndex] = { ...updatedPanels[panelIndex], title: finalTitle, userDescription: updatedUserDescription };
    setPanels(updatedPanels);

    const updatedStoryInfo = storyInfo ? { ...storyInfo, updatedAt: new Date() } : null;
    if (updatedStoryInfo) setStoryInfo(updatedStoryInfo);
    
    saveStateToLocalStorage(updatedStoryInfo, updatedPanels);
    toast({ title: "Title Updated", description: `Panel title changed to "${finalTitle.substring(0,30)}...".`});
  }, [panels, storyInfo, toast, saveStateToLocalStorage]);

  const updatePanelImage = useCallback(async (panelId: string, imageIndex: number, newImageUrl: string, newPromptText?: string) => {
    const panelIdx = panels.findIndex(p => p.id === panelId);
    if (panelIdx === -1) return;

    const panel = panels[panelIdx];
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
    
    const updatedPanels = [...panels];
    updatedPanels[panelIdx] = { ...panel, imageUrls: updatedImageUrls, promptsUsed: updatedPromptsUsed };
    setPanels(updatedPanels);

    const updatedStoryInfo = storyInfo ? { ...storyInfo, updatedAt: new Date() } : null;
    if (updatedStoryInfo) setStoryInfo(updatedStoryInfo);

    saveStateToLocalStorage(updatedStoryInfo, updatedPanels);
    toast({ title: "Image Updated", description: `Image ${imageIndex + 1} in panel updated.`});
  }, [panels, storyInfo, toast, saveStateToLocalStorage]);

  const updatePanelImages = useCallback(async (panelId: string, updates: Array<{ imageIndex: number; newImageUrl: string; newPromptText: string }>) => {
    const panelIdx = panels.findIndex(p => p.id === panelId);
    if (panelIdx === -1) return;

    const panel = panels[panelIdx];
    const updatedImageUrls = [...panel.imageUrls];
    let updatedPromptsUsed = panel.promptsUsed ? [...panel.promptsUsed] : Array(panel.imageUrls.length).fill('');
    while(updatedPromptsUsed.length < panel.imageUrls.length) updatedPromptsUsed.push('');

    updates.forEach(update => {
      if (update.imageIndex >= 0 && update.imageIndex < updatedImageUrls.length) {
        updatedImageUrls[update.imageIndex] = update.newImageUrl;
        if (update.imageIndex < updatedPromptsUsed.length) updatedPromptsUsed[update.imageIndex] = update.newPromptText;
      }
    });
    
    const updatedPanels = [...panels];
    updatedPanels[panelIdx] = { ...panel, imageUrls: updatedImageUrls, promptsUsed: updatedPromptsUsed };
    setPanels(updatedPanels);

    const updatedStoryInfo = storyInfo ? { ...storyInfo, updatedAt: new Date() } : null;
    if (updatedStoryInfo) setStoryInfo(updatedStoryInfo);
    
    saveStateToLocalStorage(updatedStoryInfo, updatedPanels);
    toast({ title: "Panel Images Updated", description: "Multiple images in the panel were updated." });
  }, [panels, storyInfo, toast, saveStateToLocalStorage]);

  const resetStory = useCallback(async () => {
    setIsLoading(true);
    try {
      const newStoryInfo: ComicStoryInfo = {
        id: uuidv4(),
        title: DEFAULT_STORY_TITLE,
        createdAt: new Date(),
        updatedAt: new Date(),
        rootPanelId: null,
        lastInitialPanelId: null,
      };
      setPanels([]);
      setStoryInfo(newStoryInfo);
      saveStateToLocalStorage(newStoryInfo, []);
      toast({ title: "Story Reset", description: "The story has been cleared." });
    } catch (err) {
      console.error("Failed to reset story:", err);
      toast({ title: "Reset Error", description: "Could not reset story data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, saveStateToLocalStorage]);

  return {
    panels,
    rootPanelId, // Derived from storyInfo
    lastInitialPanelId, // Derived from storyInfo
    storyInfo, // Expose full storyInfo if needed by UI (e.g. story title)
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
