
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

  // For group nodes, handles might not be relevant or could be styled differently.
  // For pages within a group, handles connect them sequentially or to branches.
  const showHandles = !panel.isGroupNode; // Only show default handles for non-group nodes

  return (
    <div className={cn(
        "transition-shadow duration-300 rounded-lg",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-2xl",
        panel.isGroupNode && "overflow-visible", // Ensure group node can contain children visually
        panel.isComicBookPage && "shadow-md hover:shadow-lg"
      )}
      style={{
        // Override width/height if panel is a group node, ReactFlow style prop for parent node handles this
      }}
    >
      {showHandles && !panel.isComicBookPage && ( // Standard panels get top/bottom handles
        <>
          <Handle 
            type="target" 
            position={targetPosition} 
            isConnectable={isConnectable} 
            className="!bg-primary !w-3 !h-3"
          />
          <Handle 
            type="source" 
            position={sourcePosition} 
            isConnectable={isConnectable} 
            className="!bg-primary !w-3 !h-3"
          />
        </>
      )}
       {panel.isComicBookPage && ( // Page nodes might have different handle logic for branching
        <>
         <Handle 
            type="target" 
            position={Position.Left} 
            isConnectable={isConnectable} 
            className="!bg-secondary !w-2.5 !h-2.5"
            style={{top: '50%'}}
          />
          <Handle 
            type="source" 
            position={Position.Right} 
            isConnectable={isConnectable} 
            className="!bg-secondary !w-2.5 !h-2.5"
            style={{top: '50%'}}
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
