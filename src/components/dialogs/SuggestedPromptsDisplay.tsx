import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

interface SuggestedPromptsDisplayProps {
  prompts: string[];
  onSelectPrompt: (prompt: string) => void;
  isLoading: boolean;
}

const SuggestedPromptsDisplay: FC<SuggestedPromptsDisplayProps> = ({ prompts, onSelectPrompt, isLoading }) => {
  if (isLoading) {
    return (
      <div className="mt-4 text-center">
        <p className="text-muted-foreground animate-pulse">Generating suggestions...</p>
      </div>
    );
  }

  if (prompts.length === 0) {
    return null; // Don't show if no prompts and not loading
  }

  return (
    <Card className="mt-4 bg-secondary/30">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-base font-medium flex items-center text-secondary-foreground">
          <Lightbulb className="mr-2 h-5 w-5 text-accent" />
          AI Prompt Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 p-4 pt-0">
        {prompts.map((prompt, index) => (
          <Button
            key={index}
            variant="ghost"
            size="sm"
            onClick={() => onSelectPrompt(prompt)}
            className="text-left justify-start p-2 h-auto whitespace-normal hover:bg-accent/20 text-foreground"
          >
            {prompt}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};

export default SuggestedPromptsDisplay;
