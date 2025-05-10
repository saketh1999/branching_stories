
import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react'; // Added useState
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
  if (!panel || panel.isComicBookPage) return []; 

  // Base spacing - can be adjusted, perhaps even dynamically based on viewport later
  const BASE_HORIZONTAL_SPACING = 350; // Reduced for tighter packing initially
  const BASE_VERTICAL_SPACING = 380;  // Reduced for tighter packing initially

  const HORIZONTAL_SPACING_SIBLING = panel.isGroupNode ? BASE_HORIZONTAL_SPACING * 1.5 : BASE_HORIZONTAL_SPACING; 
  const VERTICAL_SPACING_LEVEL = panel.isGroupNode ? BASE_VERTICAL_SPACING * 1.5 : BASE_VERTICAL_SPACING; 

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

const PAGE_NODE_WIDTH = 180; 
const PAGE_NODE_HEIGHT = 260;
const PAGE_SPACING = 10; // Reduced for smaller screens
const PAGES_PER_ROW_SM = 1; // Changed to 1 for very small screens
const PAGES_PER_ROW_MD = 3;
const GROUP_NODE_CONTENT_PADDING = 15; // Reduced padding

const GROUP_NODE_HEADER_ACTUAL_HEIGHT = 50; // Adjusted based on new styles
const GROUP_NODE_FOOTER_ACTUAL_HEIGHT = 68; // Adjusted based on new styles

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
  const [pagesPerRow, setPagesPerRow] = useState(PAGES_PER_ROW_MD);

  useEffect(() => {
    const updatePagesPerRow = () => {
      if (window.innerWidth < 768) { // md breakpoint in Tailwind
        setPagesPerRow(PAGES_PER_ROW_SM);
      } else {
        setPagesPerRow(PAGES_PER_ROW_MD);
      }
    };
    updatePagesPerRow();
    window.addEventListener('resize', updatePagesPerRow);
    return () => window.removeEventListener('resize', updatePagesPerRow);
  }, []);


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
          
          const numRows = pageChildren.length > 0 ? Math.ceil(pageChildren.length / pagesPerRow) : 1;
          const maxPagesInAnyRow = pageChildren.length > 0 ? Math.min(pageChildren.length, pagesPerRow) : 0;

          const groupContentAreaWidth = (maxPagesInAnyRow * (PAGE_NODE_WIDTH + PAGE_SPACING)) - (maxPagesInAnyRow > 0 ? PAGE_SPACING : 0);
          const groupContentAreaHeight = (numRows * (PAGE_NODE_HEIGHT + PAGE_SPACING)) - (numRows > 0 ? PAGE_SPACING : 0);
          
          // Make group node width more adaptive to content
          const baseGroupWidth = pagesPerRow === PAGES_PER_ROW_SM ? 280 : 320; // Smaller base width
          const groupWidth = Math.max(baseGroupWidth, groupContentAreaWidth + GROUP_NODE_CONTENT_PADDING * 2); 
          const baseGroupHeight = pagesPerRow === PAGES_PER_ROW_SM ? 180 : 220; // Smaller base height

          const groupHeight = Math.max(baseGroupHeight, 
            GROUP_NODE_HEADER_ACTUAL_HEIGHT + 
            (pageChildren.length > 0 ? groupContentAreaHeight : PAGE_NODE_HEIGHT / 2 ) + // Smaller placeholder if empty
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
              border: '3px solid hsl(var(--primary))',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-lg)',
            },
            zIndex: 0,
          });

          pageChildren.forEach((pagePanel, index) => {
            const rowIndex = Math.floor(index / pagesPerRow);
            const colIndex = index % pagesPerRow;
            newNodes.push({
              id: pagePanel.id,
              type: 'comicPanelNode',
              data: { panel: pagePanel, allPanels: panels, onGenerateNext, onBranch, onUpdateTitle, onRegenerateImage, onEditPanel },
              position: { 
                x: GROUP_NODE_CONTENT_PADDING + colIndex * (PAGE_NODE_WIDTH + PAGE_SPACING), 
                y: GROUP_NODE_HEADER_ACTUAL_HEIGHT + GROUP_NODE_CONTENT_PADDING + rowIndex * (PAGE_NODE_HEIGHT + PAGE_SPACING)
              },
              parentNode: panel.id,
              extent: 'parent',
              draggable: true, 
              zIndex: 1, 
            });
          });

        } else if (!panel.isComicBookPage) { 
          newNodes.push({
            id: panel.id,
            type: 'comicPanelNode',
            data: { panel, allPanels: panels, onGenerateNext, onBranch, onUpdateTitle, onRegenerateImage, onEditPanel },
            position: position,
            draggable: true,
            // Style for regular panel nodes for responsiveness (max-width can be useful)
            style: {
              width: 'clamp(280px, 30vw, 380px)', // Responsive width
              // height will be auto based on content due to ComicPanelView's flex structure
            }
          });
        }
      });

      panels.forEach(panel => {
        if (panel.parentId && panelMap.has(panel.parentId) && !panel.isComicBookPage) {
          const parentPanel = panelMap.get(panel.parentId)!;
          if (!parentPanel.isGroupNode || (parentPanel.isGroupNode && !panel.isComicBookPage)) {
             if (newNodes.find(n => n.id === panel.parentId) && newNodes.find(n => n.id === panel.id)) {
                 newEdges.push({
                    id: `e-${panel.parentId}-${panel.id}`,
                    source: panel.parentId,
                    target: panel.id,
                    markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))', width: 18, height: 18 }, // Slightly smaller marker
                    style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 }, // Thinner line
                    animated: true,
                    zIndex: 0,
                });
            }
          }
        }
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
                            type: 'smoothstep', 
                            markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--secondary))', width:12, height:12 }, // Smaller marker
                            style: { stroke: 'hsl(var(--secondary))', strokeWidth: 1.5 }, // Thinner line
                            zIndex: 0, 
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
  }, [panels, rootId, pagesPerRow]); // Added pagesPerRow as dependency

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (!rootId && panels.length === 0) {
     return null; 
  }
  
  if (rootId && nodes.length === 0 && panels.length > 0) {
    return <p className="text-center text-muted-foreground p-4 sm:p-8 text-sm sm:text-base">Loading story map...</p>;
  }

  return (
    <div className="w-full h-[calc(100vh-4rem)] sm:h-[calc(100vh-var(--header-height,4rem))] overflow-hidden" style={{ '--header-height': '4rem' } as React.CSSProperties}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1, minZoom: 0.1, maxZoom: 1 }} // Adjusted padding and zoom levels
        minZoom={0.05} // Allow more zoom out
        maxZoom={1.5} // Allow a bit more zoom in
        attributionPosition="bottom-left"
        className="bg-background"
      >
        <Controls className="fill-primary stroke-primary text-primary" />
        <MiniMap nodeStrokeWidth={2} zoomable pannable className="!bg-muted !border-border shadow-lg hidden md:block" nodeColor={(n) => {
          if (n.type === 'comicPanelNode') {
            if ((n.data as ReactFlowNodeData).panel.isGroupNode) return 'hsl(var(--primary))';
            if ((n.data as ReactFlowNodeData).panel.isComicBookPage) return 'hsl(var(--secondary))';
            return 'hsl(var(--accent))';
          }
          return '#eee';
        }}/>
        <Background color="hsl(var(--border))" gap={24} size={0.8} /> {/* Larger gap, smaller dots */}
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

