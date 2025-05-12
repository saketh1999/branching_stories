"use client";

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { ComicPanelData } from '@/types/story';

// Dynamic import with no SSR
const FlowchartDisplay = dynamic(
  () => import('./FlowchartDisplay'),
  { 
    loading: () => (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
    ssr: false // This is the key - disable SSR for this component
  }
);

interface DynamicFlowchartProps {
  panels: ComicPanelData[];
  rootId: string | null;
  onGenerateNext: (panelId: string) => void;
  onBranch: (panelId: string) => void;
  onUpdateTitle: (panelId: string, newTitle: string) => void;
  onRegenerateImage: (panelId: string, imageIndex: number, imageUrl: string, originalPrompt?: string) => void;
  onEditPanel: (panelId: string) => void;
}

export default function DynamicFlowchart(props: DynamicFlowchartProps) {
  return <FlowchartDisplay {...props} />;
} 