"use client";

import type { ComicPanelData, ComicStoryInfo } from '@/types/story';
import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from './use-toast';
import { uploadImageToBlob } from '@/lib/blob-storage';

const LOCAL_STORAGE_STORY_INFO_KEY = "comicStoryInfo_v3";
const LOCAL_STORAGE_PANELS_KEY = "comicStoryPanels_v3";
const DEFAULT_STORY_TITLE = "My Branching Tale";
const PREVIOUS_STORAGE_KEYS = ["comicStoryInfo_v2", "comicStoryPanels_v2", "comicStoryInfo_v1", "comicStoryPanels_v1"];
const MIGRATION_COMPLETED_KEY = "blob_migration_completed_v3";

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

/**
 * Hook for managing comic story state with Vercel Blob storage
 */
export function useStoryState() {
  const [panels, setPanels] = useState<ComicPanelData[]>([]);
  const [storyInfo, setStoryInfo] = useState<ComicStoryInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const { toast } = useToast();

  const rootPanelId = storyInfo?.rootPanelId || null;
  const lastInitialPanelId = storyInfo?.lastInitialPanelId || null;

  /**
   * Check if a URL is a data URI that needs to be converted to a Blob URL
   */
  const isDataUri = useCallback((url: string): boolean => {
    return url.startsWith('data:');
  }, []);

  /**
   * Save state to localStorage, but ensure image URLs are Blob URLs to avoid quota issues
   */
  const saveStateToLocalStorage = useCallback(async (currentStoryInfo: ComicStoryInfo | null, currentPanels: ComicPanelData[]) => {
    try {
      // Store the story info
      if (currentStoryInfo) {
        localStorage.setItem(LOCAL_STORAGE_STORY_INFO_KEY, JSON.stringify(currentStoryInfo));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_STORY_INFO_KEY);
      }
      
      // Process panels to ensure all images are stored as Blob URLs
      const panelsForStorage = await Promise.all(currentPanels.map(async (panel) => {
        // If the panel has image URLs that are data URIs, convert them to Blob URLs
        if (panel.imageUrls.length > 0) {
          const processedImageUrls = await Promise.all(panel.imageUrls.map(async (url, index) => {
            if (isDataUri(url)) {
              try {
                // Only upload to Blob if it's a data URI
                const sanitizedTitle = panel.title ? panel.title.slice(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase() : '';
                const blobUrl = await uploadImageToBlob(url, `panel_${panel.id}_img${index}_${sanitizedTitle}_${Date.now()}.png`);
                return blobUrl;
              } catch (error) {
                console.error(`Failed to upload image to Blob storage for panel ${panel.id}:`, error);
                // Fall back to the original URL if the upload fails
                return url;
              }
            }
            return url; // Return the URL unchanged if it's already a Blob URL
          }));
          
          return {...panel, imageUrls: processedImageUrls};
        }
        return panel;
      }));
      
      // Save the panels with Blob URLs to localStorage
      localStorage.setItem(LOCAL_STORAGE_PANELS_KEY, JSON.stringify(panelsForStorage));
      
      // Important: Update the state with the processed panels WITHOUT triggering another save
      // This prevents the recursive loop that's causing the maximum call stack error
      setPanels(prevPanels => {
        // Only update if there are actual changes to prevent unnecessary renders
        if (JSON.stringify(prevPanels) !== JSON.stringify(panelsForStorage)) {
          return panelsForStorage;
        }
        return prevPanels;
      });
    } catch (e) {
      console.error("Error saving state to localStorage:", e);
      toast({ title: "Storage Error", description: "Could not save story progress. Using Vercel Blob as a fallback.", variant: "warning" });
    }
  }, [toast, isDataUri]);

  /**
   * Migrate data from old localStorage versions to the new format with Blob URLs
   */
  const migrateOldData = useCallback(async () => {
    // Check if migration already completed
    if (localStorage.getItem(MIGRATION_COMPLETED_KEY) === 'true') {
      return;
    }

    setIsMigrating(true);
    toast({ title: "Migration in Progress", description: "Converting images to cloud storage. This may take a moment." });

    try {
      // Check for old versions of data
      for (const storageInfoKey of PREVIOUS_STORAGE_KEYS) {
        const oldPanelsKey = storageInfoKey.replace('Info', 'Panels');
        const oldStoryInfoJson = localStorage.getItem(storageInfoKey);
        const oldPanelsJson = localStorage.getItem(oldPanelsKey);

        if (oldStoryInfoJson && oldPanelsJson) {
          // Found old data, migrate it
          const oldStoryInfo = JSON.parse(oldStoryInfoJson);
          const oldPanels = JSON.parse(oldPanelsJson);

          // Process panels to convert data URIs to Blob URLs
          const migratedPanels = await Promise.all(oldPanels.map(async (panel: ComicPanelData) => {
            if (panel.imageUrls && panel.imageUrls.length > 0) {
              const processedUrls = await Promise.all(panel.imageUrls.map(async (url, index) => {
                if (isDataUri(url)) {
                  try {
                    // Use a descriptive filename based on panel properties
                    const sanitizedName = panel.title 
                      ? panel.title.slice(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase() 
                      : `panel_${panel.id.substring(0, 8)}`;
                    const blobUrl = await uploadImageToBlob(url, `migrated_${sanitizedName}_img${index}.png`);
                    return blobUrl;
                  } catch (err) {
                    console.error("Failed to migrate image:", err);
                    return url; // Keep the original URL on error
                  }
                }
                return url; // Already a Blob URL or external URL
              }));
              return { ...panel, imageUrls: processedUrls };
            }
            return panel;
          }));

          // Update story info dates
          const migratedStoryInfo = {
            ...oldStoryInfo,
            createdAt: new Date(oldStoryInfo.createdAt),
            updatedAt: new Date()
          };

          // Save migrated data to new storage keys
          localStorage.setItem(LOCAL_STORAGE_STORY_INFO_KEY, JSON.stringify(migratedStoryInfo));
          localStorage.setItem(LOCAL_STORAGE_PANELS_KEY, JSON.stringify(migratedPanels));

          // Update state
          setStoryInfo(migratedStoryInfo);
          setPanels(migratedPanels);

          // Mark as migrated to avoid re-doing next time
          localStorage.setItem(MIGRATION_COMPLETED_KEY, 'true');

          // Show toast
          toast({ title: "Migration Complete", description: "Your story has been migrated to cloud storage." });
          
          // We found and migrated data, so return
          return;
        }
      }

      // If we reached here, no old data was found - mark migration as complete anyway
      localStorage.setItem(MIGRATION_COMPLETED_KEY, 'true');
    } catch (error) {
      console.error("Error during migration:", error);
      toast({ 
        title: "Migration Error", 
        description: "Failed to migrate old data. Starting fresh.", 
        variant: "destructive"
      });
    } finally {
      setIsMigrating(false);
    }
  }, [toast, isDataUri]);

  const loadStory = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      // First, check if we need to migrate old data
      if (localStorage.getItem(MIGRATION_COMPLETED_KEY) !== 'true') {
        // We'll handle migration separately and return early
        migrateOldData().then(() => {
          setIsLoading(false);
        });
        return;
      }
      
      // Continue with normal loading if migration completed
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
      if (!isMigrating) {
        setIsLoading(false);
      }
    }
  }, [toast, saveStateToLocalStorage, migrateOldData, isMigrating]);

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

      // Ensure all images are stored as Blob URLs first
      const processedImageUrls = await Promise.all(imageUrls.map(async (url, index) => {
        if (isDataUri(url)) {
          const sanitizedPrompt = promptsUsed?.[index]?.slice(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'panel_image';
          return await uploadImageToBlob(url, `panel_${sanitizedPrompt}_${Date.now()}.png`);
        }
        return url;
      }));

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
        imageUrls: processedImageUrls,
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
    [storyInfo, panels, toast, saveStateToLocalStorage, isDataUri]
  );

  const addComicBook = useCallback(
    async ({ pageImageUrls, comicBookTitle }: AddComicBookArgs): Promise<string> => {
      if (pageImageUrls.length === 0) {
        toast({ title: "Comic Book Error", description: "Cannot create a comic book with no pages.", variant: "destructive" });
        throw new Error("Cannot create a comic book with no pages.");
      }

      // Ensure all page images are stored as Blob URLs
      const processedPageImageUrls = await Promise.all(pageImageUrls.map(async (url, index) => {
        if (isDataUri(url)) {
          return await uploadImageToBlob(url, `comic_book_page_${index + 1}_${Date.now()}.png`);
        }
        return url;
      }));

      const comicBookGroupId = uuidv4();
      const actualComicBookTitle = comicBookTitle.trim() || `Comic Book ${comicBookGroupId.substring(0,4)}`;
      
      let comicBookParentId: string | null = null;
      let newRootPanelId = storyInfo?.rootPanelId || null;
      let newLastInitialPanelId = storyInfo?.lastInitialPanelId || null;
      const currentStoryId = storyInfo?.id || uuidv4();

      if (!newRootPanelId) { // This is the very first comic book uploaded
        newRootPanelId = comicBookGroupId;
      } else { 
        // Modified: Always create standalone comic books without parent (no connection to previous)
        comicBookParentId = null;
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

      const pagePanelsToAdd: ComicPanelData[] = processedPageImageUrls.map((imageUrl, index) => {
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
    [storyInfo, panels, toast, saveStateToLocalStorage, isDataUri]
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
    
    // Process the image URL if it's a data URI
    let processedImageUrl = newImageUrl;
    if (isDataUri(newImageUrl)) {
      const sanitizedPrompt = newPromptText?.slice(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'updated_image';
      try {
        processedImageUrl = await uploadImageToBlob(newImageUrl, `panel_${panelId}_img${imageIndex}_${sanitizedPrompt}_${Date.now()}.png`);
      } catch (error) {
        console.error(`Failed to upload image to Blob storage for panel ${panelId}:`, error);
        // Fall back to the original URL if upload fails
      }
    }
    updatedImageUrls[imageIndex] = processedImageUrl;

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
  }, [panels, storyInfo, toast, saveStateToLocalStorage, isDataUri]);

  const updatePanelImages = useCallback(async (panelId: string, updates: Array<{ imageIndex: number; newImageUrl: string; newPromptText: string }>) => {
    const panelIdx = panels.findIndex(p => p.id === panelId);
    if (panelIdx === -1) return;

    const panel = panels[panelIdx];
    const updatedImageUrls = [...panel.imageUrls];
    let updatedPromptsUsed = panel.promptsUsed ? [...panel.promptsUsed] : Array(panel.imageUrls.length).fill('');
    while(updatedPromptsUsed.length < panel.imageUrls.length) updatedPromptsUsed.push('');

    // Process each update
    for (const update of updates) {
      if (update.imageIndex >= 0 && update.imageIndex < updatedImageUrls.length) {
        // Process the image URL if it's a data URI
        let processedImageUrl = update.newImageUrl;
        if (isDataUri(update.newImageUrl)) {
          const sanitizedPrompt = update.newPromptText?.slice(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'multi_update';
          try {
            processedImageUrl = await uploadImageToBlob(update.newImageUrl, `panel_${panelId}_img${update.imageIndex}_${sanitizedPrompt}_${Date.now()}.png`);
          } catch (error) {
            console.error(`Failed to upload image to Blob storage for panel ${panelId}:`, error);
            // Fall back to the original URL if upload fails
          }
        }
        updatedImageUrls[update.imageIndex] = processedImageUrl;
        if (update.imageIndex < updatedPromptsUsed.length) updatedPromptsUsed[update.imageIndex] = update.newPromptText;
      }
    }
    
    const updatedPanels = [...panels];
    updatedPanels[panelIdx] = { ...panel, imageUrls: updatedImageUrls, promptsUsed: updatedPromptsUsed };
    setPanels(updatedPanels);

    const updatedStoryInfo = storyInfo ? { ...storyInfo, updatedAt: new Date() } : null;
    if (updatedStoryInfo) setStoryInfo(updatedStoryInfo);
    
    saveStateToLocalStorage(updatedStoryInfo, updatedPanels);
    toast({ title: "Panel Images Updated", description: "Multiple images in the panel were updated." });
  }, [panels, storyInfo, toast, saveStateToLocalStorage, isDataUri]);

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
