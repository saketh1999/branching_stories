export interface ComicPanelData {
  id: string;
  imageUrl: string; // Data URI of the panel image
  promptUsed?: string; // The prompt that generated this panel, if any
  userDescription?: string; // User-provided description for uploaded panels
  parentId: string | null;
  childrenIds: string[];
  // Optional: for explicit positioning in a complex flowchart in the future
  // x?: number; 
  // y?: number;
}
