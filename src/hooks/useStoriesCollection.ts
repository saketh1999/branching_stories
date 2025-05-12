"use client";

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from './use-toast';
import type { ComicStoryInfo, StoriesCollection, ComicPanelData, ReactFlowData } from '@/types/story';
import { uploadToVercelBlob } from '@/lib/blob-storage';

const LOCAL_STORAGE_STORIES_KEY = "comicStoriesCollection_v1";
const LOCAL_STORAGE_PANELS_PREFIX = "comicStoryPanels_";
const LOCAL_STORAGE_REACTFLOW_PREFIX = "reactFlowData_";
const DEFAULT_STORY_TITLE = "My Branching Tale";

// Safe storage access helper
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error('LocalStorage error:', error);
      }
    }
  },
  removeItem: (key: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
};

/**
 * Hook for managing multiple comic stories
 */
export function useStoriesCollection() {
  const [storiesCollection, setStoriesCollection] = useState<StoriesCollection>({
    stories: [],
    activeStoryId: null
  });
  const [activeStoryPanels, setActiveStoryPanels] = useState<ComicPanelData[]>([]);
  const [activeReactFlowData, setActiveReactFlowData] = useState<ReactFlowData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Get active story
  const activeStory = storiesCollection.activeStoryId 
    ? storiesCollection.stories.find(s => s.id === storiesCollection.activeStoryId) || null
    : null;

  // Check if a URL is a data URI that needs to be converted to a Blob URL
  const isDataUri = useCallback((url: string): boolean => {
    return url.startsWith('data:');
  }, []);

  // Save stories collection to localStorage safely
  const saveStoriesCollection = useCallback((collection: StoriesCollection) => {
    try {
      safeLocalStorage.setItem(LOCAL_STORAGE_STORIES_KEY, JSON.stringify(collection));
    } catch (error) {
      console.error("Failed to save stories collection to localStorage:", error);
      setError("Failed to save stories data.");
    }
  }, []);

  // Save panels for a specific story to localStorage with Vercel Blob for images
  const savePanelsForStory = useCallback(async (storyId: string, panels: ComicPanelData[]) => {
    try {
      // Process panels to ensure all images are stored in Vercel Blob
      const panelsForStorage = await Promise.all(panels.map(async (panel) => {
        // If the panel has image URLs that are data URIs, upload them to Vercel Blob
        if (panel.imageUrls.length > 0) {
          const processedImageUrls = await Promise.all(panel.imageUrls.map(async (url, index) => {
            if (isDataUri(url)) {
              try {
                // Upload to Vercel Blob
                const sanitizedTitle = panel.title 
                  ? panel.title.slice(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase() 
                  : '';
                const filename = `panel_${panel.id}_img${index}_${sanitizedTitle}_${Date.now()}.png`;
                return await uploadToVercelBlob(url, filename);
              } catch (error) {
                console.error(`Failed to upload image to Blob storage for panel ${panel.id}:`, error);
                return url; // Fall back to original URL if upload fails
              }
            }
            return url; // Return the URL unchanged if it's not a data URI
          }));
          
          return {...panel, imageUrls: processedImageUrls};
        }
        return panel;
      }));
      
      // Save panels with blob URLs to localStorage
      safeLocalStorage.setItem(`${LOCAL_STORAGE_PANELS_PREFIX}${storyId}`, JSON.stringify(panelsForStorage));
    } catch (error) {
      console.error(`Failed to save panels for story ${storyId}:`, error);
      setError("Failed to save story panels data.");
      toast({ 
        title: "Storage Error", 
        description: "Error saving panel data. Please try again.",
        variant: "destructive"
      });
    }
  }, [isDataUri, toast]);

  // Save ReactFlow data for a specific story
  const saveReactFlowData = useCallback((data: ReactFlowData) => {
    try {
      safeLocalStorage.setItem(`${LOCAL_STORAGE_REACTFLOW_PREFIX}${data.storyId}`, JSON.stringify(data));
    } catch (error) {
      console.error(`Failed to save ReactFlow data for story ${data.storyId}:`, error);
      setError("Failed to save flow diagram data.");
    }
  }, []);

  // Load all data from localStorage
  useEffect(() => {
    const loadData = () => {
      if (typeof window === 'undefined') return; // Skip on server
      
      setIsLoading(true);
      try {
        // Load stories collection
        const storedCollection = safeLocalStorage.getItem(LOCAL_STORAGE_STORIES_KEY);
        const collection: StoriesCollection = storedCollection 
          ? JSON.parse(storedCollection)
          : { stories: [], activeStoryId: null };
        
        setStoriesCollection(collection);
        
        // If there's an active story, load its panels and ReactFlow data
        if (collection.activeStoryId) {
          const storedPanels = safeLocalStorage.getItem(`${LOCAL_STORAGE_PANELS_PREFIX}${collection.activeStoryId}`);
          if (storedPanels) {
            setActiveStoryPanels(JSON.parse(storedPanels));
          } else {
            setActiveStoryPanels([]);
          }
          
          const storedReactFlowData = safeLocalStorage.getItem(`${LOCAL_STORAGE_REACTFLOW_PREFIX}${collection.activeStoryId}`);
          if (storedReactFlowData) {
            setActiveReactFlowData(JSON.parse(storedReactFlowData));
          } else {
            // Initialize empty ReactFlow data for this story
            const activeStory = collection.stories.find(s => s.id === collection.activeStoryId);
            if (activeStory) {
              const newReactFlowData: ReactFlowData = {
                storyId: activeStory.id,
                panels: [],
                createdAt: new Date(),
                updatedAt: new Date()
              };
              setActiveReactFlowData(newReactFlowData);
              saveReactFlowData(newReactFlowData);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load stories data:", error);
        setError("Failed to load stories data from storage.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [saveReactFlowData]);

  // Create a new story
  const createNewStory = useCallback(async (title: string): Promise<string> => {
    const newStoryId = uuidv4();
    const newStory: ComicStoryInfo = {
      id: newStoryId,
      title: title.trim() || DEFAULT_STORY_TITLE,
      createdAt: new Date(),
      updatedAt: new Date(),
      rootPanelId: null,
      lastInitialPanelId: null
    };
    
    const updatedCollection: StoriesCollection = {
      stories: [...storiesCollection.stories, newStory],
      activeStoryId: newStoryId
    };
    
    setStoriesCollection(updatedCollection);
    saveStoriesCollection(updatedCollection);
    
    // Initialize empty panels and ReactFlow data for this story
    setActiveStoryPanels([]);
    await savePanelsForStory(newStoryId, []);
    
    const newReactFlowData: ReactFlowData = {
      storyId: newStoryId,
      panels: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setActiveReactFlowData(newReactFlowData);
    saveReactFlowData(newReactFlowData);
    
    toast({ title: "Story Created", description: `"${newStory.title}" has been created.` });
    return newStoryId;
  }, [storiesCollection, saveStoriesCollection, savePanelsForStory, saveReactFlowData, toast]);

  // Switch to a different story
  const switchStory = useCallback(async (storyId: string): Promise<boolean> => {
    if (!storiesCollection.stories.find(s => s.id === storyId)) {
      toast({ title: "Story Error", description: "The selected story doesn't exist.", variant: "destructive" });
      return false;
    }
    
    // Save previous active story data if needed
    if (storiesCollection.activeStoryId && activeStoryPanels.length > 0) {
      await savePanelsForStory(storiesCollection.activeStoryId, activeStoryPanels);
    }
    
    // Update active story ID
    const updatedCollection: StoriesCollection = {
      ...storiesCollection,
      activeStoryId: storyId
    };
    
    setStoriesCollection(updatedCollection);
    saveStoriesCollection(updatedCollection);
    
    // Load panels for the new active story
    const storedPanels = safeLocalStorage.getItem(`${LOCAL_STORAGE_PANELS_PREFIX}${storyId}`);
    if (storedPanels) {
      setActiveStoryPanels(JSON.parse(storedPanels));
    } else {
      setActiveStoryPanels([]);
    }
    
    // Load ReactFlow data for the new active story
    const storedReactFlowData = safeLocalStorage.getItem(`${LOCAL_STORAGE_REACTFLOW_PREFIX}${storyId}`);
    if (storedReactFlowData) {
      setActiveReactFlowData(JSON.parse(storedReactFlowData));
    } else {
      // Initialize empty ReactFlow data for this story
      const newReactFlowData: ReactFlowData = {
        storyId,
        panels: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setActiveReactFlowData(newReactFlowData);
      saveReactFlowData(newReactFlowData);
    }
    
    const activeStory = storiesCollection.stories.find(s => s.id === storyId);
    toast({ title: "Story Switched", description: `Switched to "${activeStory?.title || 'Unknown story'}"` });
    return true;
  }, [storiesCollection, activeStoryPanels, saveStoriesCollection, savePanelsForStory, saveReactFlowData, toast]);

  // Delete a story
  const deleteStory = useCallback(async (storyId: string): Promise<boolean> => {
    if (!storiesCollection.stories.find(s => s.id === storyId)) {
      toast({ title: "Story Error", description: "The selected story doesn't exist.", variant: "destructive" });
      return false;
    }
    
    // Remove story from collection
    const updatedStories = storiesCollection.stories.filter(s => s.id !== storyId);
    
    // Determine new active story ID (previous story or first available)
    let newActiveStoryId: string | null = null;
    if (updatedStories.length > 0) {
      if (storiesCollection.activeStoryId === storyId) {
        // If we're deleting the active story, select another one
        newActiveStoryId = updatedStories[0].id;
      } else {
        // Keep the current active story
        newActiveStoryId = storiesCollection.activeStoryId;
      }
    }
    
    const updatedCollection: StoriesCollection = {
      stories: updatedStories,
      activeStoryId: newActiveStoryId
    };
    
    setStoriesCollection(updatedCollection);
    saveStoriesCollection(updatedCollection);
    
    // Clean up stored data for the deleted story
    safeLocalStorage.removeItem(`${LOCAL_STORAGE_PANELS_PREFIX}${storyId}`);
    safeLocalStorage.removeItem(`${LOCAL_STORAGE_REACTFLOW_PREFIX}${storyId}`);
    
    // If we have a new active story, load its data
    if (newActiveStoryId) {
      // Load panels for the new active story
      const storedPanels = safeLocalStorage.getItem(`${LOCAL_STORAGE_PANELS_PREFIX}${newActiveStoryId}`);
      if (storedPanels) {
        setActiveStoryPanels(JSON.parse(storedPanels));
      } else {
        setActiveStoryPanels([]);
      }
      
      // Load ReactFlow data for the new active story
      const storedReactFlowData = safeLocalStorage.getItem(`${LOCAL_STORAGE_REACTFLOW_PREFIX}${newActiveStoryId}`);
      if (storedReactFlowData) {
        setActiveReactFlowData(JSON.parse(storedReactFlowData));
      } else {
        const newReactFlowData: ReactFlowData = {
          storyId: newActiveStoryId,
          panels: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        setActiveReactFlowData(newReactFlowData);
        saveReactFlowData(newReactFlowData);
      }
    } else {
      // No stories left
      setActiveStoryPanels([]);
      setActiveReactFlowData(null);
    }
    
    toast({ title: "Story Deleted", description: "The story has been deleted." });
    return true;
  }, [storiesCollection, saveStoriesCollection, saveReactFlowData, toast]);

  // Update a story's title
  const updateStoryTitle = useCallback(async (storyId: string, newTitle: string): Promise<boolean> => {
    const storyIndex = storiesCollection.stories.findIndex(s => s.id === storyId);
    if (storyIndex === -1) {
      toast({ title: "Story Error", description: "The selected story doesn't exist.", variant: "destructive" });
      return false;
    }
    
    const updatedStories = [...storiesCollection.stories];
    updatedStories[storyIndex] = {
      ...updatedStories[storyIndex],
      title: newTitle.trim() || DEFAULT_STORY_TITLE,
      updatedAt: new Date()
    };
    
    const updatedCollection: StoriesCollection = {
      ...storiesCollection,
      stories: updatedStories
    };
    
    setStoriesCollection(updatedCollection);
    saveStoriesCollection(updatedCollection);
    
    toast({ title: "Story Updated", description: `Title changed to "${newTitle.trim() || DEFAULT_STORY_TITLE}"` });
    return true;
  }, [storiesCollection, saveStoriesCollection, toast]);

  // Update panels for the active story
  const updateActiveStoryPanels = useCallback(async (newPanels: ComicPanelData[]) => {
    if (!storiesCollection.activeStoryId) {
      console.error("Cannot update panels: No active story");
      return;
    }
    
    setActiveStoryPanels(newPanels);
    await savePanelsForStory(storiesCollection.activeStoryId, newPanels);
    
    // Also update the story info to reflect any root panel changes
    const updatedStories = storiesCollection.stories.map(story => {
      if (story.id === storiesCollection.activeStoryId) {
        // Determine root panel ID - first panel with no parent, or null
        const rootPanel = newPanels.find(p => p.parentId === null);
        
        // Determine last initial panel ID - most recently created panel with no parent
        let lastInitialPanel: ComicPanelData | undefined = undefined;
        for (const panel of newPanels) {
          if (panel.parentId === null && (!lastInitialPanel || 
              (panel.createdAt && lastInitialPanel.createdAt && 
               new Date(panel.createdAt) > new Date(lastInitialPanel.createdAt)))) {
            lastInitialPanel = panel;
          }
        }
        
        return {
          ...story,
          rootPanelId: rootPanel?.id || null,
          lastInitialPanelId: lastInitialPanel?.id || null,
          updatedAt: new Date()
        };
      }
      return story;
    });
    
    const updatedCollection: StoriesCollection = {
      ...storiesCollection,
      stories: updatedStories
    };
    
    setStoriesCollection(updatedCollection);
    saveStoriesCollection(updatedCollection);
  }, [storiesCollection, saveStoriesCollection, savePanelsForStory]);

  // Update ReactFlow data for the active story
  const updateActiveReactFlowData = useCallback((newData: Partial<ReactFlowData>) => {
    if (!storiesCollection.activeStoryId || !activeReactFlowData) {
      console.error("Cannot update ReactFlow data: No active story or flow data");
      return;
    }
    
    const updatedData: ReactFlowData = {
      ...activeReactFlowData,
      ...newData,
      updatedAt: new Date()
    };
    
    setActiveReactFlowData(updatedData);
    saveReactFlowData(updatedData);
  }, [storiesCollection, activeReactFlowData, saveReactFlowData]);

  return {
    storiesCollection,
    activeStory,
    activeStoryPanels,
    activeReactFlowData,
    isLoading,
    error,
    createNewStory,
    switchStory,
    deleteStory,
    updateStoryTitle,
    updateActiveStoryPanels,
    updateActiveReactFlowData
  };
} 