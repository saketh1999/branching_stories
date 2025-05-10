
import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { FileUp, BookOpenCheck, Zap } from 'lucide-react';
import Image from 'next/image';

interface WelcomeMessageProps {
  onUploadInitial: () => void;
  onUploadComicBook: () => void;
}

const WelcomeMessage: FC<WelcomeMessageProps> = ({ onUploadInitial, onUploadComicBook }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 md:p-8 bg-background text-foreground">
      <div className="container mx-auto grid md:grid-cols-2 gap-8 md:gap-12 items-center">
        <div className="text-center md:text-left space-y-6">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter">
            Branching
            <span className="block relative">
              Tales
              <span className="absolute left-0 bottom-0 h-1.5 md:h-2 w-2/5 bg-primary transform translate-y-2 md:translate-y-3"></span>
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-md mx-auto md:mx-0">
            Unleash your imagination. Craft interactive comic narratives where every choice carves a new path.
            Start with your own images or let AI spark your story.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <Button size="lg" className="w-full sm:w-auto" onClick={onUploadInitial}>
              <FileUp className="mr-2 h-5 w-5" />
              Upload First Panel
            </Button>
            <Button size="lg" variant="secondary" className="w-full sm:w-auto" onClick={onUploadComicBook}>
              <BookOpenCheck className="mr-2 h-5 w-5" />
              Upload Comic Book
            </Button>
          </div>
           <p className="text-sm text-muted-foreground flex items-center justify-center md:justify-start">
            <Zap size={16} className="text-primary mr-2" />
            Powered by AI to bring your wildest comic ideas to life!
          </p>
        </div>
        <div className="relative aspect-[4/3] md:aspect-square rounded-xl overflow-hidden shadow-2xl group">
          <Image 
            src="https://picsum.photos/seed/comicstory/800/600" 
            alt="Dynamic comic book panels illustration" 
            layout="fill"
            objectFit="cover"
            className="transform group-hover:scale-105 transition-transform duration-500 ease-in-out"
            data-ai-hint="comic storytelling"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10"></div>
          <div className="absolute bottom-4 left-4 p-2 bg-black/30 backdrop-blur-sm rounded-md">
            <p className="text-sm font-semibold text-white">Create. Branch. Explore.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeMessage;
