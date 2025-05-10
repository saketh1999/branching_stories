
import type { FC } from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
  ReactFlowProvider,
} from 'reactflow';
import type { ComicPanelData } from '@/types/story';
import ReactFlowNode, { type ReactFlowNodeData } from './ReactFlowNode';

interface FlowchartDisplayProps {
  panels: ComicPanelData[];
  rootId: string | null;
  onGenerateNext: (panelId: string) => void;
  onBranch: (panelId: string) => void;
  onUpdateTitle: (panelId: string, newTitle: string) => void;
}

const nodeTypes = {
  comicPanelNode: ReactFlowNode,
};

const calculateNodePositions = (
  panelId: string,
  panelMap: Map<string, ComicPanelData>,
  level: number,
  parentX: number = 0,
  siblingIndex: number = 0,
  numSiblings: number = 1,
  visitedPositions: Map<string, { x: number; y: number }> = new Map()
): Array<{ id: string; position: { x: number; y: number }; level: number }> => {
  if (visitedPositions.has(panelId)) return [];

  const panel = panelMap.get(panelId);
  if (!panel) return [];

  // Increased spacing for better readability and to accommodate larger cards
  const HORIZONTAL_SPACING_SIBLING = 420; 
  const VERTICAL_SPACING_LEVEL = 450; // Increased vertical spacing slightly for taller cards with editable title

  const y = level * VERTICAL_SPACING_LEVEL;
  let x;
  if (level === 0) {
    x = 0;
  } else {
    const offsetFromParentCenter = (siblingIndex - (numSiblings - 1) / 2) * HORIZONTAL_SPACING_SIBLING;
    x = parentX + offsetFromParentCenter;
  }
  
  visitedPositions.set(panelId, { x, y });
  let positionsArray = [{ id: panelId, position: { x, y }, level }];

  const children = panel.childrenIds.map(id => panelMap.get(id)).filter(Boolean) as ComicPanelData[];
  children.forEach((child, index) => {
    positionsArray = positionsArray.concat(
      calculateNodePositions(child.id, panelMap, level + 1, x, index, children.length, visitedPositions)
    );
  });

  return positionsArray;
};

const FlowchartDisplayComponent: FC<FlowchartDisplayProps> = ({
  panels,
  rootId,
  onGenerateNext,
  onBranch,
  onUpdateTitle,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<ReactFlowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const panelMap = new Map(panels.map(p => [p.id, p]));
    const newNodes: Node<ReactFlowNodeData>[] = [];
    const newEdges: Edge[] = [];

    if (rootId && panelMap.has(rootId)) {
      const calculatedPositions = calculateNodePositions(rootId, panelMap, 0);
      
      calculatedPositions.forEach(({ id, position }) => {
        const panel = panelMap.get(id)!;
        newNodes.push({
          id: panel.id,
          type: 'comicPanelNode',
          data: { panel, onGenerateNext, onBranch, onUpdateTitle },
          position: position,
          draggable: true, // Make nodes draggable
        });
      });

      panels.forEach(panel => {
        if (panel.parentId && panelMap.has(panel.parentId) && panelMap.has(panel.id)) {
          if (newNodes.find(n => n.id === panel.parentId) && newNodes.find(n => n.id === panel.id)) {
               newEdges.push({
                  id: `e-${panel.parentId}-${panel.id}`,
                  source: panel.parentId,
                  target: panel.id,
                  markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))', width: 20, height: 20 },
                  style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
                  animated: true, // Make edges animated
              });
          }
        }
      });
    }
    setNodes(newNodes);
    setEdges(newEdges);
  }, [panels, rootId, onGenerateNext, onBranch, onUpdateTitle, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (!rootId && panels.length === 0) {
     return null; // Don't render flow if no story started
  }
  
  if (rootId && nodes.length === 0) {
    return <p className="text-center text-muted-foreground p-8">Loading story map...</p>;
  }


  return (
    <div className="w-full h-[calc(100vh-var(--header-height,10rem))] overflow-hidden" style={{ '--header-height': '4rem' } as React.CSSProperties}> {/* Adjust 4rem if header height changes */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-left"
        className="bg-background"
      >
        <Controls className="fill-primary stroke-primary text-primary" />
        <MiniMap nodeStrokeWidth={3} zoomable pannable className="!bg-muted !border-border"/>
        <Background color="hsl(var(--border))" gap={24} size={1.5} />
      </ReactFlow>
    </div>
  );
};


const FlowchartDisplay: FC<FlowchartDisplayProps> = (props) => (
  <ReactFlowProvider>
    <FlowchartDisplayComponent {...props} />
  </ReactFlowProvider>
);

export default FlowchartDisplay;

