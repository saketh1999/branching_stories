export interface ComicPanelData {
  id: string;
  imageUrls: string[]; // Array of 1 to 4 image data URIs
  title?: string; // User-editable title for the panel. For group nodes, this is the comic book title.
  promptsUsed?: string[]; // For generated panels, array of prompts (1 per image). Length matches imageUrls.
  userDescription?: string; // For initial uploaded panel, single description for all its images. For comic book group nodes, this holds the main title/description.
  parentId: string | null;
  childrenIds: string[];
  isGroupNode?: boolean; // True if this panel represents a group of other panels (e.g., a comic book)
  isComicBookPage?: boolean; // True if this panel is a page within a comic book group
  pageNumber?: number; // The page number if isComicBookPage is true
  createdAt?: Date; // Changed for local state management
}

// Represents the main story document
export interface ComicStoryInfo {
  id: string;
  title: string;
  createdAt: Date; // Changed for local state management
  updatedAt: Date; // Changed for local state management
  rootPanelId: string | null;
  lastInitialPanelId: string | null;
}

// Collection of all stories with an active story ID
export interface StoriesCollection {
  stories: ComicStoryInfo[];
  activeStoryId: string | null;
}

// ReactFlow specific data for a story
export interface ReactFlowData {
  storyId: string;
  panels: ComicPanelData[];
  createdAt: Date;
  updatedAt: Date;
}
