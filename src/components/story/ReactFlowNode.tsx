
import type { FC } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { ComicPanelData } from '@/types/story';
import ComicPanelView from './ComicPanelView';
import { cn } from '@/lib/utils';

export interface ReactFlowNodeData {
  panel: ComicPanelData;
  onGenerateNext: (panelId: string) => void;
  onBranch: (panelId: string) => void;
  onUpdateTitle: (panelId: string, newTitle: string) => void;
  onRegenerateImage: (panelId: string, imageIndex: number, imageUrl: string, originalPrompt?: string) => void;
  onEditPanel: (panelId: string) => void;
}

const ReactFlowNode: FC<NodeProps<ReactFlowNodeData>> = ({ data, isConnectable, selected, sourcePosition = Position.Bottom, targetPosition = Position.Top }) => {
  const { panel, onGenerateNext, onBranch, onUpdateTitle, onRegenerateImage, onEditPanel } = data;

  // Default handles for regular panels
  const showDefaultHandles = !panel.isGroupNode && !panel.isComicBookPage;
  // Specific handles for comic book pages (for branching out or connecting to next page if that's handled by edges)
  const showPageHandles = panel.isComicBookPage;
  // Group nodes might have specific connection points if needed, or connections go to/from the node itself (handled by ReactFlow)

  return (
    <div className={cn(
        "transition-all duration-200 ease-in-out rounded-lg", // Ensure rounded-lg is applied
        selected && "ring-4 ring-accent ring-offset-2 ring-offset-background shadow-2xl scale-105",
        panel.isGroupNode && "overflow-visible", 
        panel.isComicBookPage && "shadow-lg hover:shadow-xl transform hover:scale-102",
        !panel.isGroupNode && !panel.isComicBookPage && "shadow-lg hover:shadow-xl" // Regular panel shadow
      )}
      style={{
        // Width/height are set by ReactFlow for the node container.
        // For group nodes, this is dynamically calculated in FlowchartDisplay.
        // For page nodes, this is fixed.
        // For regular panels, this is fixed.
        width: panel.isGroupNode ? undefined : (panel.isComicBookPage ? '200px' : undefined), // Let group node width be dynamic from style prop
        height: panel.isGroupNode ? undefined : (panel.isComicBookPage ? '280px' : undefined),
      }}
    >
      {showDefaultHandles && (
        <>
          <Handle 
            type="target" 
            position={targetPosition} 
            isConnectable={isConnectable} 
            className="!bg-primary !w-3.5 !h-3.5 !border-2 !border-background"
            style={{ zIndex: 10 }}
          />
          <Handle 
            type="source" 
            position={sourcePosition} 
            isConnectable={isConnectable} 
            className="!bg-primary !w-3.5 !h-3.5 !border-2 !border-background"
            style={{ zIndex: 10 }}
          />
        </>
      )}
       {showPageHandles && ( // Handles for comic book pages
        <>
         {/* Target for previous page connection or branching into the page */}
         <Handle 
            type="target" 
            position={Position.Left} 
            isConnectable={isConnectable} 
            className="!bg-secondary !w-3 !h-3 !-ml-1 !border-background !border"
            style={{top: '50%', zIndex: 10}}
          />
          {/* Source for next page connection or branching from the page */}
          <Handle 
            type="source" 
            position={Position.Right} 
            isConnectable={isConnectable} 
            className="!bg-secondary !w-3 !h-3 !-mr-1 !border-background !border"
            style={{top: '50%', zIndex: 10}}
          />
          {/* Optional: Handle for branching out from bottom of a page (if design requires) */}
           <Handle
            type="source"
            position={Position.Bottom}
            id={`branch-from-page-${panel.id}`}
            isConnectable={isConnectable}
            className="!bg-primary !w-3 !h-3 !-mb-1 !border-background !border"
            style={{ zIndex: 10 }}
          />
        </>
      )}
      {/* Group nodes can also have handles if direct connections to the group are needed */}
      {panel.isGroupNode && (
         <>
          <Handle 
            type="target" 
            position={Position.Top} 
            isConnectable={isConnectable} 
            className="!bg-primary !w-4 !h-4 !border-2 !border-background" // Larger for groups
            style={{ zIndex: 10 }}
          />
          <Handle 
            type="source" 
            position={Position.Bottom} 
            isConnectable={isConnectable} 
            className="!bg-primary !w-4 !h-4 !border-2 !border-background"
            style={{ zIndex: 10 }}
          />
        </>
      )}


      <ComicPanelView 
        panel={panel} 
        onGenerateNext={onGenerateNext} 
        onBranch={onBranch}
        onUpdateTitle={onUpdateTitle} 
        onRegenerateImage={onRegenerateImage}
        onEditPanel={onEditPanel}
      />
    </div>
  );
};

export default ReactFlowNode;
