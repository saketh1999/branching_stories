
import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUp, BookOpenCheck } from 'lucide-react';
import Image from 'next/image';

interface WelcomeMessageProps {
  onUploadInitial: () => void;
  onUploadComicBook: () => void;
}

const WelcomeMessage: FC<WelcomeMessageProps> = ({ onUploadInitial, onUploadComicBook }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="items-center text-center">
          <Image 
            src="https://picsum.photos/seed/comicbookart/300/200" 
            alt="Comic book art illustration" 
            width={300} 
            height={200} 
            className="rounded-lg mb-4"
            data-ai-hint="comic art"
          />
          <CardTitle className="text-3xl font-bold text-primary">Welcome to Branching Tales!</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Unleash your creativity and craft unique comic narratives.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-2">
          <p className="text-foreground">
            Start your adventure by uploading images for your comic's first panel, or upload an entire comic book page by page.
          </p>
          <p className="text-foreground">
            From there, you can generate new panels, create branching storylines, and explore endless possibilities with AI.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2">
          <Button size="lg" className="w-full" onClick={onUploadInitial}>
            <FileUp className="mr-2 h-5 w-5" />
            Upload First Panel Images
          </Button>
          <Button size="lg" className="w-full" onClick={onUploadComicBook} variant="secondary">
            <BookOpenCheck className="mr-2 h-5 w-5" />
            Upload Comic Book (Pages)
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default WelcomeMessage;
