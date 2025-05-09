import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUp } from 'lucide-react';
import Image from 'next/image';

interface WelcomeMessageProps {
  onUploadInitial: () => void;
}

const WelcomeMessage: FC<WelcomeMessageProps> = ({ onUploadInitial }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="items-center text-center">
          <Image 
            src="https://picsum.photos/seed/comicbook/300/200" 
            alt="Comic book illustration" 
            width={300} 
            height={200} 
            className="rounded-lg mb-4"
            data-ai-hint="comic book"
          />
          <CardTitle className="text-3xl font-bold text-primary">Welcome to Branching Tales!</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Unleash your creativity and craft unique comic narratives.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-foreground">
            Start your adventure by uploading the first panel of your comic. From there, you can generate new panels, create branching storylines, and explore endless possibilities with AI.
          </p>
        </CardContent>
        <CardFooter>
          <Button size="lg" className="w-full" onClick={onUploadInitial}>
            <FileUp className="mr-2 h-5 w-5" />
            Upload Your First Comic Panel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default WelcomeMessage;
