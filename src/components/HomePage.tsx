import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { FileUp, Zap, ChevronRight, ImagePlus, Sparkles } from 'lucide-react';
import Image from 'next/image';

interface HomePageProps {
  onUploadInitial: () => void;
}

const HomePage: FC<HomePageProps> = ({ onUploadInitial }) => {
  return (
    <div className="flex flex-col min-h-full bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 md:py-24 px-4 sm:px-6">
        <div className="container mx-auto grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="text-center md:text-left space-y-4 sm:space-y-6 z-10">
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
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12">
            Create Interactive Comics
          </h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Feature 1 */}
            <div className="bg-card rounded-lg p-5 sm:p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ImagePlus className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Start With Your Images</h3>
              <p className="text-sm text-muted-foreground">
                Upload your own comic panels or full comic book pages to start your interactive story.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-card rounded-lg p-5 sm:p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">AI-Powered Generation</h3>
              <p className="text-sm text-muted-foreground">
                Let our AI help generate new comic panels based on your descriptions and directions.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-card rounded-lg p-5 sm:p-6 shadow-md hover:shadow-lg transition-shadow sm:col-span-2 lg:col-span-1">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 3L16.293 6.293C16.6835 6.68353 16.6835 7.31647 16.293 7.70711L7.70711 16.2929C7.31658 16.6834 6.68342 16.6834 6.29289 16.2929L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 11L17.7071 7.70711C17.3166 7.31658 16.6834 7.31658 16.2929 7.70711L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 14L3 16L4 20L8 21L10 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Create Branching Narratives</h3>
              <p className="text-sm text-muted-foreground">
                Build non-linear stories with multiple paths, choices, and endings. Give readers control over the story.
              </p>
            </div>
          </div>
          
          <div className="text-center mt-8 sm:mt-12">
            <Button size="lg" className="group" onClick={onUploadInitial}>
              Get Started Now
              <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage; 