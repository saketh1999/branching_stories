
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
    <div className="flex flex-col items-center justify-center min-h-full p-4 sm:p-6 md:p-8 bg-background text-foreground">
      <div className="container mx-auto grid md:grid-cols-2 gap-6 md:gap-12 items-center">
        <div className="text-center md:text-left space-y-4 sm:space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter">
            Branching
            <span className="block relative">
              Tales
              <span className="absolute left-0 bottom-0 h-1 sm:h-1.5 md:h-2 w-2/5 bg-primary transform translate-y-1 sm:translate-y-2 md:translate-y-3"></span>
            </span>
          </h1>
          <p className="text-md sm:text-lg md:text-xl text-muted-foreground max-w-md mx-auto md:mx-0">
            Unleash your imagination. Craft interactive comic narratives where every choice carves a new path.
            Start with your own images or let AI spark your story.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center md:justify-start">
            <Button size="lg" className="w-full sm:w-auto text-sm sm:text-base" onClick={onUploadInitial}>
              <FileUp className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Upload First Panel
            </Button>
            <Button size="lg" variant="secondary" className="w-full sm:w-auto text-sm sm:text-base" onClick={onUploadComicBook}>
              <BookOpenCheck className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Upload Comic Book
            </Button>
          </div>
           <p className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center md:justify-start">
            <Zap className="text-primary mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Powered by AI to bring your wildest comic ideas to life!
          </p>
        </div>
        <div className="relative aspect-[4/3] w-full max-w-md md:max-w-none mx-auto md:aspect-square rounded-lg sm:rounded-xl overflow-hidden shadow-xl sm:shadow-2xl group">
          <Image 
            src="https://picsum.photos/seed/comicstory/800/600" 
            alt="Dynamic comic book panels illustration" 
            layout="fill"
            objectFit="cover"
            className="transform group-hover:scale-105 transition-transform duration-500 ease-in-out"
            data-ai-hint="comic storytelling"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"></div>
          <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 p-1.5 sm:p-2 bg-black/40 backdrop-blur-sm rounded-sm sm:rounded-md">
            <p className="text-xs sm:text-sm font-semibold text-white">Create. Branch. Explore.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeMessage;
