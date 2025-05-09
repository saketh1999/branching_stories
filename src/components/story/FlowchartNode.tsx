import type { FC } from 'react';
import type { ComicPanelData } from '@/types/story';
import ComicPanelView from './ComicPanelView';

interface FlowchartNodeProps {
  panelId: string;
  allPanels: ComicPanelData[];
  onGenerateNext: (panelId: string) => void;
  onBranch: (panelId: string) => void;
  getPanel: (panelId: string) => ComicPanelData | undefined;
  getChildren: (panelId: string) => ComicPanelData[];
  level?: number; // For indentation or styling based on depth
}

const FlowchartNode: FC<FlowchartNodeProps> = ({
  panelId,
  allPanels,
  onGenerateNext,
  onBranch,
  getPanel,
  getChildren,
  level = 0,
}) => {
  const panel = getPanel(panelId);

  if (!panel) {
    return null;
  }

  const childPanels = getChildren(panelId);

  return (
    <div className={`flex flex-col items-center p-2 ${level > 0 ? 'ml-8 border-l-2 border-primary/50 pl-4 pt-4 relative' : ''}`}>
      {level > 0 && (
        <div className="absolute -left-[1px] top-1/2 h-[2px] w-4 bg-primary/50 transform -translate-y-1/2"></div>
      )}
      <ComicPanelView panel={panel} onGenerateNext={onGenerateNext} onBranch={onBranch} />
      
      {childPanels.length > 0 && (
        <div className={`flex ${childPanels.length > 1 ? 'flex-row flex-wrap justify-center' : 'flex-col items-center'} gap-4 mt-4`}>
          {childPanels.map(child => (
            <FlowchartNode
              key={child.id}
              panelId={child.id}
              allPanels={allPanels}
              onGenerateNext={onGenerateNext}
              onBranch={onBranch}
              getPanel={getPanel}
              getChildren={getChildren}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FlowchartNode;
