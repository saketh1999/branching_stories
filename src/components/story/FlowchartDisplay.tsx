
import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

  const BASE_HORIZONTAL_SPACING = 320; 
  const BASE_VERTICAL_SPACING = 360;  

  const HORIZONTAL_SPACING_SIBLING = panel.isGroupNode ? BASE_HORIZONTAL_SPACING * 1.25 : BASE_HORIZONTAL_SPACING; 
  const VERTICAL_SPACING_LEVEL = panel.isGroupNode ? BASE_VERTICAL_SPACING * 1.25 : BASE_VERTICAL_SPACING; 

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


const PAGE_NODE_BASE_WIDTH = 160; // for xs screens
const PAGE_NODE_SM_WIDTH = 180; // for sm screens
const PAGE_NODE_MD_WIDTH = 200; // for md+ screens

const PAGE_NODE_BASE_HEIGHT = 240; // for xs screens
const PAGE_NODE_SM_HEIGHT = 260; // for sm screens
const PAGE_NODE_MD_HEIGHT = 280; // for md+ screens


const PAGE_SPACING_XS = 8;
const PAGE_SPACING_SM_MD = 10;

const GROUP_NODE_CONTENT_PADDING_XS = 10;
const GROUP_NODE_CONTENT_PADDING_SM_MD = 15;

const PAGES_PER_ROW_XS = 1; 
const PAGES_PER_ROW_SM = 2; 
const PAGES_PER_ROW_MD_PLUS = 3; 

const SM_BREAKPOINT = 640;
const MD_BREAKPOINT = 768; // Keep for reference, but LG might be more relevant for 3 columns
const LG_BREAKPOINT = 1024;


const GROUP_NODE_HEADER_ACTUAL_HEIGHT = 50; 
const GROUP_NODE_FOOTER_ACTUAL_HEIGHT = 68; 

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
  const [pagesPerRow, setPagesPerRow] = useState(PAGES_PER_ROW_MD_PLUS);
  const [pageNodeDimensions, setPageNodeDimensions] = useState({ width: PAGE_NODE_MD_WIDTH, height: PAGE_NODE_MD_HEIGHT });
  const [pageSpacing, setPageSpacing] = useState(PAGE_SPACING_SM_MD);
  const [groupNodePadding, setGroupNodePadding] = useState(GROUP_NODE_CONTENT_PADDING_SM_MD);


  useEffect(() => {
    const updateLayoutParameters = () => {
      const width = window.innerWidth;
      if (width < SM_BREAKPOINT) { // < 640px (Tailwind sm)
        setPagesPerRow(PAGES_PER_ROW_XS);
        setPageNodeDimensions({ width: PAGE_NODE_BASE_WIDTH, height: PAGE_NODE_BASE_HEIGHT });
        setPageSpacing(PAGE_SPACING_XS);
        setGroupNodePadding(GROUP_NODE_CONTENT_PADDING_XS);
      } else if (width < LG_BREAKPOINT) { // 640px to < 1024px (Tailwind sm to lg)
        setPagesPerRow(PAGES_PER_ROW_SM);
        setPageNodeDimensions({ width: PAGE_NODE_SM_WIDTH, height: PAGE_NODE_SM_HEIGHT });
        setPageSpacing(PAGE_SPACING_SM_MD);
        setGroupNodePadding(GROUP_NODE_CONTENT_PADDING_SM_MD);
      } else { // >= 1024px (Tailwind lg+)
        setPagesPerRow(PAGES_PER_ROW_MD_PLUS);
        setPageNodeDimensions({ width: PAGE_NODE_MD_WIDTH, height: PAGE_NODE_MD_HEIGHT });
        setPageSpacing(PAGE_SPACING_SM_MD);
        setGroupNodePadding(GROUP_NODE_CONTENT_PADDING_SM_MD);
      }
    };
    updateLayoutParameters();
    window.addEventListener('resize', updateLayoutParameters);
    return () => window.removeEventListener('resize', updateLayoutParameters);
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

          const groupContentAreaWidth = (maxPagesInAnyRow * (pageNodeDimensions.width + pageSpacing)) - (maxPagesInAnyRow > 0 ? pageSpacing : 0);
          const groupContentAreaHeight = (numRows * (pageNodeDimensions.height + pageSpacing)) - (numRows > 0 ? pageSpacing : 0);
          
          let baseGroupWidth;
          let baseGroupHeight;
          if (pagesPerRow === PAGES_PER_ROW_XS) {
            baseGroupWidth = 260; // Slightly smaller for single column
            baseGroupHeight = 160;
          } else if (pagesPerRow === PAGES_PER_ROW_SM) {
            baseGroupWidth = 300;
            baseGroupHeight = 200;
          } else { // PAGES_PER_ROW_MD_PLUS
            baseGroupWidth = 320;
            baseGroupHeight = 220;
          }

          const groupWidth = Math.max(baseGroupWidth, groupContentAreaWidth + groupNodePadding * 2); 
          const groupHeight = Math.max(baseGroupHeight, 
            GROUP_NODE_HEADER_ACTUAL_HEIGHT + 
            (pageChildren.length > 0 ? groupContentAreaHeight : pageNodeDimensions.height / 2 ) + 
            GROUP_NODE_FOOTER_ACTUAL_HEIGHT + 
            (groupNodePadding * 2)
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
                x: groupNodePadding + colIndex * (pageNodeDimensions.width + pageSpacing), 
                y: GROUP_NODE_HEADER_ACTUAL_HEIGHT + groupNodePadding + rowIndex * (pageNodeDimensions.height + pageSpacing)
              },
              parentNode: panel.id,
              extent: 'parent',
              draggable: true, 
              zIndex: 1, 
              style: { // Pass dimensions to ReactFlowNode for comic book pages
                width: `${pageNodeDimensions.width}px`,
                height: `${pageNodeDimensions.height}px`,
              }
            });
          });

        } else if (!panel.isComicBookPage) { 
          newNodes.push({
            id: panel.id,
            type: 'comicPanelNode',
            data: { panel, allPanels: panels, onGenerateNext, onBranch, onUpdateTitle, onRegenerateImage, onEditPanel },
            position: position,
            draggable: true,
            style: {
              width: 'clamp(260px, 30vw, 380px)', // Adjusted min width slightly
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
                    markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))', width: 15, height: 15 }, 
                    style: { stroke: 'hsl(var(--primary))', strokeWidth: 1.5 }, 
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
                            markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--secondary))', width:10, height:10 }, 
                            style: { stroke: 'hsl(var(--secondary))', strokeWidth: 1 }, 
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
  }, [panels, rootId, pagesPerRow, pageNodeDimensions, pageSpacing, groupNodePadding]); 

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
        fitViewOptions={{ padding: 0.15, minZoom: 0.05, maxZoom: 1.2 }} // Adjusted padding & zoom
        minZoom={0.02} 
        maxZoom={1.5} 
        attributionPosition="bottom-left"
        className="bg-background"
      >
        <Controls className="fill-primary stroke-primary text-primary" />
        <MiniMap nodeStrokeWidth={2} zoomable pannable className="!bg-muted !border-border shadow-lg hidden md:block" nodeColor={(n) => {
          if (n.type === 'comicPanelNode') {
            const panelData = (n.data as ReactFlowNodeData).panel;
            if (panelData.isGroupNode) return 'hsl(var(--primary))';
            if (panelData.isComicBookPage) return 'hsl(var(--secondary))';
            return 'hsl(var(--accent))';
          }
          return '#eee';
        }}/>
        <Background color="hsl(var(--border))" gap={20} size={0.6} /> 
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

