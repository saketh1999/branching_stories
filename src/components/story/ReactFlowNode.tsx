import type { FC, CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { ComicPanelData } from '@/types/story';
import ComicPanelView from './ComicPanelView';
import { cn } from '@/lib/utils';

export interface ReactFlowNodeData {
  panel: ComicPanelData;
  allPanels: ComicPanelData[]; 
  onGenerateNext: (panelId: string) => void;
  onBranch: (panelId: string) => void;
  onUpdateTitle: (panelId: string, newTitle: string) => void;
  onRegenerateImage: (panelId: string, imageIndex: number, imageUrl: string, originalPrompt?: string) => void;
  onEditPanel: (panelId: string) => void;
  onSelectPage?: (pageId: string) => void;
}

// Define an extended node props type that includes style
interface ExtendedNodeProps extends NodeProps<ReactFlowNodeData> {
  style?: CSSProperties;
}

const ReactFlowNode: FC<ExtendedNodeProps> = ({ data, isConnectable, selected, sourcePosition = Position.Bottom, targetPosition = Position.Top, style }) => {
  const { panel, allPanels, onGenerateNext, onBranch, onUpdateTitle, onRegenerateImage, onEditPanel, onSelectPage } = data;

  const showDefaultHandles = !panel.isGroupNode && !panel.isComicBookPage;
  const showPageHandles = panel.isComicBookPage;

  return (
    <div className={cn(
        "transition-all duration-200 ease-in-out rounded-lg", 
        selected && "ring-4 ring-accent ring-offset-2 ring-offset-background shadow-2xl scale-105",
        panel.isGroupNode && "overflow-visible", 
        panel.isComicBookPage && "shadow-lg hover:shadow-xl transform hover:scale-102",
        !panel.isGroupNode && !panel.isComicBookPage && "shadow-lg hover:shadow-xl" 
      )}
      style={{
        // Apply width/height from style prop (passed by FlowchartDisplay for group/page nodes)
        // Regular panels will use their clamp width from FlowchartDisplay and auto height from ComicPanelView
        width: style?.width,
        height: style?.height,
      }}
    >
      {showDefaultHandles && (
        <>
          <Handle 
            type="target" 
            position={targetPosition} 
            isConnectable={isConnectable} 
            className="!bg-primary !w-3 !h-3 sm:!w-3.5 sm:!h-3.5 !border-2 !border-background"
            style={{ zIndex: 10 }}
          />
          <Handle 
            type="source" 
            position={sourcePosition} 
            isConnectable={isConnectable} 
            className="!bg-primary !w-3 !h-3 sm:!w-3.5 sm:!h-3.5 !border-2 !border-background"
            style={{ zIndex: 10 }}
          />
        </>
      )}
       {showPageHandles && ( 
        <>
         <Handle 
            type="target" 
            position={Position.Left} 
            isConnectable={isConnectable} 
            className="!bg-secondary !w-2.5 !h-2.5 sm:!w-3 sm:!h-3 !-ml-1 !border-background !border"
            style={{top: '50%', zIndex: 10}}
          />
          <Handle 
            type="source" 
            position={Position.Right} 
            isConnectable={isConnectable} 
            className="!bg-secondary !w-2.5 !h-2.5 sm:!w-3 sm:!h-3 !-mr-1 !border-background !border"
            style={{top: '50%', zIndex: 10}}
          />
           <Handle
            type="source"
            position={Position.Bottom}
            id={`branch-from-page-${panel.id}`}
            isConnectable={isConnectable}
            className="!bg-primary !w-2.5 !h-2.5 sm:!w-3 sm:!h-3 !-mb-1 !border-background !border"
            style={{ zIndex: 10 }}
          />
        </>
      )}
      {panel.isGroupNode && (
         <>
          <Handle 
            type="target" 
            position={Position.Top} 
            isConnectable={isConnectable} 
            className="!bg-primary !w-3.5 !h-3.5 sm:!w-4 sm:!h-4 !border-2 !border-background" 
            style={{ zIndex: 10 }}
          />
          <Handle 
            type="source" 
            position={Position.Bottom} 
            isConnectable={isConnectable} 
            className="!bg-primary !w-3.5 !h-3.5 sm:!w-4 sm:!h-4 !border-2 !border-background"
            style={{ zIndex: 10 }}
          />
        </>
      )}

      <ComicPanelView 
        panel={panel}
        allPanels={allPanels} 
        onGenerateNext={onGenerateNext} 
        onBranch={onBranch}
        onUpdateTitle={onUpdateTitle} 
        onRegenerateImage={onRegenerateImage}
        onEditPanel={onEditPanel}
        onSelectPage={onSelectPage}
      />
    </div>
  );
};

export default ReactFlowNode;
