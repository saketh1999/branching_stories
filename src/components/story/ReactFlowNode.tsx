
import type { FC } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { ComicPanelData } from '@/types/story';
import ComicPanelView from './ComicPanelView';

export interface ReactFlowNodeData {
  panel: ComicPanelData;
  onGenerateNext: (panelId: string) => void;
  onBranch: (panelId: string) => void;
  onUpdateTitle: (panelId: string, newTitle: string) => void;
}

const ReactFlowNode: FC<NodeProps<ReactFlowNodeData>> = ({ data, isConnectable, selected }) => {
  const { panel, onGenerateNext, onBranch, onUpdateTitle } = data;

  return (
    <div className={`shadow-lg hover:shadow-xl transition-shadow duration-300 ${selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg' : ''}`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable} 
        className="!bg-primary !w-3 !h-3"
      />
      <ComicPanelView 
        panel={panel} 
        onGenerateNext={onGenerateNext} 
        onBranch={onBranch}
        onUpdateTitle={onUpdateTitle} 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable} 
        className="!bg-primary !w-3 !h-3"
      />
    </div>
  );
};

export default ReactFlowNode;

