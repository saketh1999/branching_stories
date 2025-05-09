import type { FC } from 'react';
import type { ComicPanelData } from '@/types/story';
import FlowchartNode from './FlowchartNode';

interface FlowchartDisplayProps {
  panels: ComicPanelData[];
  rootId: string;
  onGenerateNext: (panelId: string) => void;
  onBranch: (panelId: string) => void;
  getPanel: (panelId: string) => ComicPanelData | undefined;
  getChildren: (panelId: string) => ComicPanelData[];
}

const FlowchartDisplay: FC<FlowchartDisplayProps> = ({
  panels,
  rootId,
  onGenerateNext,
  onBranch,
  getPanel,
  getChildren,
}) => {
  if (!getPanel(rootId)) {
    return <p className="text-center text-muted-foreground">Story not found or root panel missing.</p>;
  }

  return (
    <div className="w-full overflow-x-auto p-4">
      <div className="flex flex-col items-center min-w-max">
        <FlowchartNode
          panelId={rootId}
          allPanels={panels}
          onGenerateNext={onGenerateNext}
          onBranch={onBranch}
          getPanel={getPanel}
          getChildren={getChildren}
        />
      </div>
    </div>
  );
};

export default FlowchartDisplay;
