import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  useReactFlow,
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
  onSelectPage?: (pageId: string) => void; // Optional callback when a page is selected
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

  // Increase spacing between nodes to accommodate larger group nodes
  const BASE_HORIZONTAL_SPACING = 400; // Increased from 320 
  const BASE_VERTICAL_SPACING = 480;  // Increased from 360

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

// Constants for group node sizing - Significantly increased dimensions
const GROUP_NODE_BASE_WIDTH = 380;  // Was 280 - For xs screens
const GROUP_NODE_SM_WIDTH = 480;    // Was 350 - For sm screens
const GROUP_NODE_MD_WIDTH = 580;    // Was 420 - For md screens
const GROUP_NODE_LG_WIDTH = 680;    // Was 500 - For lg+ screens

const GROUP_NODE_BASE_HEIGHT = 380; // Was 280 - For xs screens
const GROUP_NODE_SM_HEIGHT = 460;   // Was 340 - For sm screens
const GROUP_NODE_MD_HEIGHT = 540;   // Was 400 - For md screens
const GROUP_NODE_LG_HEIGHT = 620;   // Was 450 - For lg+ screens

const SM_BREAKPOINT = 640;
const MD_BREAKPOINT = 768;
const LG_BREAKPOINT = 1024;

const FlowchartDisplayComponent: FC<FlowchartDisplayProps> = ({
  panels,
  rootId,
  onGenerateNext,
  onBranch,
  onUpdateTitle,
  onRegenerateImage,
  onEditPanel,
  onSelectPage,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<ReactFlowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [groupNodeSize, setGroupNodeSize] = useState({ width: GROUP_NODE_MD_WIDTH, height: GROUP_NODE_MD_HEIGHT });
  
  const reactFlowInstance = useReactFlow();
  
  // Handle page selection by finding the node and centering it
  const handlePageSelect = useCallback((pageId: string) => {
    // First call the external callback if provided
    if (onSelectPage) {
      onSelectPage(pageId);
    }
    
    // Find the parent group node of this page
    const page = panels.find(p => p.id === pageId);
    if (page?.parentId) {
      const parentNodeId = page.parentId;
      const parentNode = reactFlowInstance.getNode(parentNodeId);
      
      if (parentNode) {
        // Focus on the parent node (group node)
        reactFlowInstance.setCenter(
          parentNode.position.x, 
          parentNode.position.y,
          { zoom: 1, duration: 800 }
        );
        
        // Highlight the parent node
        const updatedNodes = nodes.map(node => ({
          ...node,
          selected: node.id === parentNodeId,
        }));
        
        setNodes(updatedNodes);
      }
    }
  }, [reactFlowInstance, nodes, setNodes, onSelectPage, panels]);

  // Update group node size based on screen size
  useEffect(() => {
    const updateNodeSizes = () => {
      const width = window.innerWidth;
      if (width < SM_BREAKPOINT) {
        setGroupNodeSize({ width: GROUP_NODE_BASE_WIDTH, height: GROUP_NODE_BASE_HEIGHT });
      } else if (width < MD_BREAKPOINT) {
        setGroupNodeSize({ width: GROUP_NODE_SM_WIDTH, height: GROUP_NODE_SM_HEIGHT });
      } else if (width < LG_BREAKPOINT) {
        setGroupNodeSize({ width: GROUP_NODE_MD_WIDTH, height: GROUP_NODE_MD_HEIGHT });
      } else {
        setGroupNodeSize({ width: GROUP_NODE_LG_WIDTH, height: GROUP_NODE_LG_HEIGHT });
      }
    };
    updateNodeSizes();
    window.addEventListener('resize', updateNodeSizes);
    return () => window.removeEventListener('resize', updateNodeSizes);
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
          // Get all comic book page children for this group, but don't create nodes for them
          const pageChildren = panel.childrenIds
            .map(cid => panelMap.get(cid)!)
            .filter(p => p?.isComicBookPage)
            .sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0));
          
          // Create only the group node, with all its pages as data
          newNodes.push({
            id: panel.id,
            type: 'comicPanelNode', 
            data: { 
              panel, 
              allPanels: panels, 
              onGenerateNext, 
              onBranch, 
              onUpdateTitle, 
              onRegenerateImage, 
              onEditPanel, 
              onSelectPage: handlePageSelect 
            },
            position: position,
            draggable: true,
            style: { 
              width: `${groupNodeSize.width}px`, 
              height: `${groupNodeSize.height}px`, 
              backgroundColor: 'transparent', 
              border: 'none',
              boxShadow: 'none',
            },
            zIndex: 0,
          });
          
          // Note: We're no longer creating child nodes for pages
          // The GroupNodeView component will handle displaying the pages internally

        } else if (!panel.isComicBookPage) { 
          // Create nodes for regular panels (non-group, non-page)
          newNodes.push({
            id: panel.id,
            type: 'comicPanelNode',
            data: { 
              panel, 
              allPanels: panels, 
              onGenerateNext, 
              onBranch, 
              onUpdateTitle, 
              onRegenerateImage, 
              onEditPanel, 
              onSelectPage: handlePageSelect 
            },
            position: position,
            draggable: true,
            style: {
              width: 'clamp(260px, 30vw, 380px)', // Adjusted min width slightly
            }
          });
        }
      });

      panels.forEach(panel => {
        // Only create edges between non-page panels
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
        
        // We no longer need to create page-to-page edges since they're not in the flow anymore
      });
    }
    setNodes(newNodes);
    setEdges(newEdges);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panels, rootId, groupNodeSize]); 

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
        fitViewOptions={{ padding: 0.2, minZoom: 0.05, maxZoom: 1.2 }} // Increased padding for larger nodes
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

