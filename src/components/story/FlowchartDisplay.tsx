
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
  if (!panel || panel.isComicBookPage) return []; // Skip comic book pages for top-level layout

  const HORIZONTAL_SPACING_SIBLING = panel.isGroupNode ? 700 : 420; // Increased for larger group nodes
  const VERTICAL_SPACING_LEVEL = panel.isGroupNode ? 700 : 450; // Increased for larger group nodes

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

  // Only consider non-page children for further recursive layout
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

// Constants for group node internal layout
const PAGE_NODE_WIDTH = 200;
const PAGE_NODE_HEIGHT = 280;
const PAGE_SPACING = 20; // Increased spacing
const PAGES_PER_ROW = 3; 
const GROUP_NODE_CONTENT_PADDING = 25; // Increased padding

// Actual heights from ComicPanelView.tsx (CardHeader p-3 + (input or title) + p-3; CardFooter p-3 + button + p-3)
// p-3 = 12px. Title text-lg approx 18px line height. Buttons h-9 (sm size for footer).
// Group Header: approx 12(pad) + 24 (title height) + 12(pad) = 48px. (Can be taller if title wraps)
// Group Footer: approx 12(pad) + 36(button) + 12(pad) = 60px.
const GROUP_NODE_HEADER_ACTUAL_HEIGHT = 56; // Adjusted based on current ComicPanelView for group nodes
const GROUP_NODE_FOOTER_ACTUAL_HEIGHT = 74; // Adjusted for two buttons in footer

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
          
          const numRows = pageChildren.length > 0 ? Math.ceil(pageChildren.length / PAGES_PER_ROW) : 1; // Ensure at least 1 row for min height
          const maxPagesInAnyRow = pageChildren.length > 0 ? Math.min(pageChildren.length, PAGES_PER_ROW) : 0;

          const groupContentAreaWidth = (maxPagesInAnyRow * (PAGE_NODE_WIDTH + PAGE_SPACING)) - (maxPagesInAnyRow > 0 ? PAGE_SPACING : 0);
          const groupContentAreaHeight = (numRows * (PAGE_NODE_HEIGHT + PAGE_SPACING)) - (numRows > 0 ? PAGE_SPACING : 0);
          
          const groupWidth = Math.max(350, groupContentAreaWidth + GROUP_NODE_CONTENT_PADDING * 2); 
          const groupHeight = Math.max(250, 
            GROUP_NODE_HEADER_ACTUAL_HEIGHT + 
            (pageChildren.length > 0 ? groupContentAreaHeight : PAGE_NODE_HEIGHT ) + // min content height if empty
            GROUP_NODE_FOOTER_ACTUAL_HEIGHT + 
            (GROUP_NODE_CONTENT_PADDING * 2)
          );

          newNodes.push({
            id: panel.id,
            type: 'comicPanelNode', 
            data: { panel, allPanels: panels, onGenerateNext, onBranch, onUpdateTitle, onRegenerateImage, onEditPanel },
            position: position,
            draggable: true,
            style: { 
              width: `${groupWidth}px`, 
              height: `${groupHeight}px`, 
              backgroundColor: 'hsl(var(--card))', 
              border: '3px solid hsl(var(--primary))', // Thicker border for group
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-lg)', // More prominent shadow
            },
            zIndex: 0, // Group nodes behind their children
          });

          pageChildren.forEach((pagePanel, index) => {
            const rowIndex = Math.floor(index / PAGES_PER_ROW);
            const colIndex = index % PAGES_PER_ROW;
            newNodes.push({
              id: pagePanel.id,
              type: 'comicPanelNode',
              data: { panel: pagePanel, allPanels: panels, onGenerateNext, onBranch, onUpdateTitle, onRegenerateImage, onEditPanel },
              position: { 
                x: GROUP_NODE_CONTENT_PADDING + colIndex * (PAGE_NODE_WIDTH + PAGE_SPACING), 
                y: GROUP_NODE_HEADER_ACTUAL_HEIGHT + GROUP_NODE_CONTENT_PADDING + rowIndex * (PAGE_NODE_HEIGHT + PAGE_SPACING)
              },
              parentNode: panel.id,
              extent: 'parent', // Keep page nodes within the group node
              draggable: true, // Pages can be moved within the group
              zIndex: 1, // Page nodes on top of their parent group
            });
          });

        } else if (!panel.isComicBookPage) { // Regular panel, not a page
          newNodes.push({
            id: panel.id,
            type: 'comicPanelNode',
            data: { panel, allPanels: panels, onGenerateNext, onBranch, onUpdateTitle, onRegenerateImage, onEditPanel },
            position: position,
            draggable: true,
          });
        }
      });

      // Create Edges
      panels.forEach(panel => {
        // Edges from parent to non-page children (regular panels or group nodes)
        if (panel.parentId && panelMap.has(panel.parentId) && !panel.isComicBookPage) {
          const parentPanel = panelMap.get(panel.parentId)!;
          // Only draw edge if parent is not a group node OR if parent is group node but child is NOT a page
          if (!parentPanel.isGroupNode || (parentPanel.isGroupNode && !panel.isComicBookPage)) {
             if (newNodes.find(n => n.id === panel.parentId) && newNodes.find(n => n.id === panel.id)) {
                 newEdges.push({
                    id: `e-${panel.parentId}-${panel.id}`,
                    source: panel.parentId,
                    target: panel.id,
                    markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))', width: 20, height: 20 },
                    style: { stroke: 'hsl(var(--primary))', strokeWidth: 2.5 },
                    animated: true,
                    zIndex: 0,
                });
            }
          }
        }
        // Edges between sequential pages within a comic book group
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
                     if (newNodes.find(n => n.id === panel.id) && newNodes.find(n => n.id === nextPageInGroup.id)) {
                        newEdges.push({
                            id: `e-page-${panel.id}-${nextPageInGroup.id}`,
                            source: panel.id,
                            target: nextPageInGroup.id,
                            type: 'smoothstep', // Or 'default' if pages are directly aligned
                            markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--secondary))', width:15, height:15 },
                            style: { stroke: 'hsl(var(--secondary))', strokeWidth: 2 },
                            zIndex: 0, // Ensure page-to-page edges are behind nodes if overlap
                        });
                    }
                }
            }
        }
      });
    }
    setNodes(newNodes);
    setEdges(newEdges);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panels, rootId]); // Dependencies kept minimal, ensure callbacks don't cause loops if passed directly

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (!rootId && panels.length === 0) {
     return null; 
  }
  
  if (rootId && nodes.length === 0 && panels.length > 0) { // Check panels.length to distinguish from initial empty state
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
        fitViewOptions={{ padding: 0.25, minZoom: 0.05, maxZoom: 1.5 }} // Adjusted padding and zoom
        minZoom={0.05}
        maxZoom={2}
        attributionPosition="bottom-left"
        className="bg-background"
      >
        <Controls className="fill-primary stroke-primary text-primary" />
        <MiniMap nodeStrokeWidth={3} zoomable pannable className="!bg-muted !border-border shadow-lg"/>
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
