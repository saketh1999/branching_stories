
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
  onRegenerateImage: (panelId: string, imageIndex: number, imageUrl: string, originalPrompt?: string) => void;
  onEditPanel: (panelId: string) => void;
}

const nodeTypes = {
  comicPanelNode: ReactFlowNode,
  // Potentially add 'comicGroupNode' if more distinct styling/logic is needed later
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
  if (!panel || panel.isComicBookPage) return []; // Do not layout comic book pages here; they are relative to parent group

  const HORIZONTAL_SPACING_SIBLING = panel.isGroupNode ? 600 : 420; // Wider spacing for groups
  const VERTICAL_SPACING_LEVEL = panel.isGroupNode ? 550 : 450;   // More vertical space if it's a group

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

  // Only recurse for children that are NOT comic book pages (i.e., other groups or regular panels)
  const childrenToLayout = panel.childrenIds
    .map(id => panelMap.get(id))
    .filter(child => child && !child.isComicBookPage) as ComicPanelData[];

  childrenToLayout.forEach((child, index) => {
    positionsArray = positionsArray.concat(
      calculateNodePositions(child.id, panelMap, level + 1, x, index, childrenToLayout.length, visitedPositions)
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
  onRegenerateImage,
  onEditPanel,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<ReactFlowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const panelMap = new Map(panels.map(p => [p.id, p]));
    const newNodes: Node<ReactFlowNodeData>[] = [];
    const newEdges: Edge[] = [];

    if (rootId && panelMap.has(rootId)) {
      const topLevelPositions = calculateNodePositions(rootId, panelMap, 0);
      
      topLevelPositions.forEach(({ id, position }) => {
        const panel = panelMap.get(id)!;

        if (panel.isGroupNode) {
          const pageChildren = panel.childrenIds
            .map(cid => panelMap.get(cid)!)
            .filter(p => p?.isComicBookPage)
            .sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0));
          
          const PAGE_NODE_WIDTH = 200; // Approximate width for a page node
          const PAGE_NODE_HEIGHT = 280; // Approximate height for a page node
          const PAGE_SPACING = 15;
          const PAGES_PER_ROW = 3; // Max pages per row inside group

          const numRows = Math.ceil(pageChildren.length / PAGES_PER_ROW);
          const groupContentWidth = Math.min(pageChildren.length, PAGES_PER_ROW) * (PAGE_NODE_WIDTH + PAGE_SPACING) - PAGE_SPACING;
          const groupContentHeight = numRows * (PAGE_NODE_HEIGHT + PAGE_SPACING) - PAGE_SPACING;
          
          const groupPadding = 20;
          const groupWidth = Math.max(300, groupContentWidth + groupPadding * 2); // Min width for group title
          const groupHeight = Math.max(150, groupContentHeight + groupPadding * 2 + 60); // Extra for title/footer

          newNodes.push({
            id: panel.id,
            type: 'comicPanelNode', 
            data: { panel, onGenerateNext, onBranch, onUpdateTitle, onRegenerateImage, onEditPanel },
            position: position,
            draggable: true,
            style: { 
              width: `${groupWidth}px`, 
              height: `${groupHeight}px`, 
              backgroundColor: 'hsl(var(--muted))', 
              border: '2px dashed hsl(var(--primary))',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-md)',
            },
            zIndex: 0, // Groups behind pages
          });

          pageChildren.forEach((pagePanel, index) => {
            const rowIndex = Math.floor(index / PAGES_PER_ROW);
            const colIndex = index % PAGES_PER_ROW;
            newNodes.push({
              id: pagePanel.id,
              type: 'comicPanelNode',
              data: { panel: pagePanel, onGenerateNext, onBranch, onUpdateTitle, onRegenerateImage, onEditPanel },
              position: { 
                x: groupPadding + colIndex * (PAGE_NODE_WIDTH + PAGE_SPACING), 
                y: groupPadding + 60 + rowIndex * (PAGE_NODE_HEIGHT + PAGE_SPACING) // +60 for group title space
              },
              parentNode: panel.id,
              extent: 'parent',
              draggable: true,
              zIndex: 1, // Pages on top of group
            });
          });

        } else if (!panel.isComicBookPage) { // Regular panel (not a page already handled by its group)
          newNodes.push({
            id: panel.id,
            type: 'comicPanelNode',
            data: { panel, onGenerateNext, onBranch, onUpdateTitle, onRegenerateImage, onEditPanel },
            position: position,
            draggable: true,
          });
        }
      });

      // Edge Creation
      panels.forEach(panel => {
        // Edges from parent to direct children (groups or regular panels)
        if (panel.parentId && panelMap.has(panel.parentId) && !panel.isComicBookPage) {
          const parentPanel = panelMap.get(panel.parentId)!;
          // Only draw edge if parent is not a group node, or if parent IS a group node but child is NOT a page of THAT group
          if (!parentPanel.isGroupNode || (parentPanel.isGroupNode && !panel.isComicBookPage)) {
             if (newNodes.find(n => n.id === panel.parentId) && newNodes.find(n => n.id === panel.id)) {
                 newEdges.push({
                    id: `e-${panel.parentId}-${panel.id}`,
                    source: panel.parentId,
                    target: panel.id,
                    markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))', width: 20, height: 20 },
                    style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
                    animated: true,
                });
            }
          }
        }
        // Optional: Edges between comic book pages (sequential)
        if (panel.isComicBookPage && panel.pageNumber && panel.parentId) {
            const parentGroup = panelMap.get(panel.parentId);
            if (parentGroup && parentGroup.isGroupNode) {
                const siblings = parentGroup.childrenIds
                    .map(id => panelMap.get(id)!)
                    .filter(p => p?.isComicBookPage)
                    .sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0));
                const currentIndex = siblings.findIndex(p => p.id === panel.id);
                if (currentIndex !== -1 && currentIndex < siblings.length - 1) {
                    const nextPageInGroup = siblings[currentIndex + 1];
                    newEdges.push({
                        id: `e-page-${panel.id}-${nextPageInGroup.id}`,
                        source: panel.id,
                        target: nextPageInGroup.id,
                        type: 'smoothstep',
                        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--muted-foreground))', width:15, height:15 },
                        style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1.5 },
                        zIndex: 0, // Behind nodes but above group background
                    });
                }
            }
        }
      });
    }
    setNodes(newNodes);
    setEdges(newEdges);
  }, [panels, rootId, onGenerateNext, onBranch, onUpdateTitle, onRegenerateImage, onEditPanel, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (!rootId && panels.length === 0) {
     return null; 
  }
  
  if (rootId && nodes.length === 0) {
    return <p className="text-center text-muted-foreground p-8">Loading story map...</p>;
  }

  return (
    <div className="w-full h-[calc(100vh-var(--header-height,10rem))] overflow-hidden" style={{ '--header-height': '4rem' } as React.CSSProperties}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, minZoom: 0.1 }}
        minZoom={0.05} // Allow more zoom out for large stories
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
