
export interface ComicPanelData {
  id: string;
  imageUrls: string[]; // Array of 1 to 4 image data URIs
  title?: string; // User-editable title for the panel
  promptsUsed?: string[]; // For generated panels, array of prompts (1 per image). Length matches imageUrls.
  userDescription?: string; // For initial uploaded panel, single description for all its images.
  parentId: string | null;
  childrenIds: string[];
  isGroupNode?: boolean; // True if this panel represents a group of other panels (e.g., a comic book)
  isComicBookPage?: boolean; // True if this panel is a page within a comic book group
  pageNumber?: number; // The page number if isComicBookPage is true
}

