import type { FC } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  FileUp, 
  Zap, 
  ChevronRight, 
  ImagePlus, 
  Sparkles,
  GitFork,
  ArrowRight,
  Lightbulb,
  Menu,
  X
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface HomePageProps {
  onUploadInitial: () => void;
}

const HomePage: FC<HomePageProps> = ({ onUploadInitial }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative flex flex-col min-h-full bg-gray-50 dark:bg-[#1E1E2F] text-gray-900 dark:text-white overflow-hidden">
 

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[5%] right-[10%] w-64 h-64 rounded-full bg-purple-500/5 dark:bg-[#FFD700]/5 blur-3xl"></div>
        <div className="absolute bottom-[15%] left-[5%] w-96 h-96 rounded-full bg-cyan-500/5 dark:bg-[#FFD700]/5 blur-3xl"></div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-16 md:pt-20 lg:pt-24 pb-16 md:pb-20 px-4 sm:px-6 z-10">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="flex flex-col space-y-8 md:pr-8">
              <div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 dark:bg-[#FFD700]/10 text-amber-600 dark:text-[#FFD700] text-xs font-medium mb-4">
                  <Zap className="mr-1 h-3 w-3" />
                  AI-POWERED STORYTELLING
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tighter">
                  Craft <span className="text-purple-600 dark:text-[#FFD700]">Interactive</span> Comics
                </h1>
                <p className="mt-4 text-lg sm:text-xl text-gray-600 dark:text-white/70 max-w-lg">
                  Unleash your imagination with branching narratives where every choice creates a new path. 
                  Start with your own images or let AI spark your story.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-amber-400 hover:bg-amber-500 dark:bg-[#FFD700] dark:hover:bg-[#FFA500] text-gray-900 dark:text-[#1E1E2F] font-medium rounded-md transition-all group"
                  onClick={onUploadInitial}
                >
                  <FileUp className="mr-2 h-5 w-5 group-hover:-translate-y-1 transition-transform" />
                  Upload Images (Up to 50)
                </Button>
                
              </div>
              
              <div className="flex items-center gap-4 text-gray-500 dark:text-white/60 text-sm">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-gray-100 dark:border-[#1E1E2F] bg-gray-200 dark:bg-white/10 flex items-center justify-center text-xs">
                      {i}
                    </div>
                  ))}
                </div>
                <p>Join thousands of storytellers</p>
              </div>
            </div>
            
            <div className="relative h-full">
              <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-purple-500/20 to-cyan-500/20 dark:from-[#FFD700]/20 dark:to-[#FFA500]/20 blur"></div>
              <div className="relative rounded-lg overflow-hidden aspect-[4/3] shadow-2xl border border-gray-200 dark:border-white/10">
                <Image 
                  src="/main_page.png" 
                  alt="Dynamic comic book panels illustration" 
                  layout="fill"
                  objectFit="cover"
                  className="transform hover:scale-105 transition-transform duration-700 ease-in-out"
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-gray-900/30 dark:from-[#1E1E2F]/90 dark:via-transparent dark:to-[#1E1E2F]/40"></div>
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-1 w-10 bg-purple-500 dark:bg-[#FFD700] rounded-full"></div>
                    <div className="text-xs font-medium uppercase tracking-wider text-white/80">Featured Story</div>
                  </div>
                  <h3 className="text-xl font-bold">The Paws of Justice</h3>
                  <p className="text-sm text-white/70">The Gotham Tails</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 md:py-28 px-4 sm:px-6 bg-gray-100 dark:bg-[#1a1a29] z-10">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Create <span className="text-purple-600 dark:text-[#FFD700]">Interactive</span> Comics
            </h2>
            <p className="text-gray-600 dark:text-white/70 text-lg">
              Our platform offers everything you need to bring your stories to life with branching narratives.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 dark:from-[#FFD700]/20 dark:to-[#FFA500]/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
              <div className="relative bg-white dark:bg-[#252542] rounded-xl p-8 h-full border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-colors">
                <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-[#FFD700]/10 flex items-center justify-center mb-6">
                  <ImagePlus className="h-6 w-6 text-purple-600 dark:text-[#FFD700]" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Start With Your Images</h3>
                <p className="text-gray-600 dark:text-white/70">
                  Upload your own comic panels or full comic book pages to start your interactive story. Import from various sources or create from scratch.
                </p>
              </div>
            </div>
            
            {/* Feature 2 */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 dark:from-[#FFD700]/20 dark:to-[#FFA500]/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
              <div className="relative bg-white dark:bg-[#252542] rounded-xl p-8 h-full border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-colors">
                <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-[#FFD700]/10 flex items-center justify-center mb-6">
                  <Sparkles className="h-6 w-6 text-purple-600 dark:text-[#FFD700]" />
                </div>
                <h3 className="text-xl font-semibold mb-3">AI-Powered Generation</h3>
                <p className="text-gray-600 dark:text-white/70">
                  Let our AI help generate new comic panels based on your descriptions. Transform your ideas into stunning visuals with minimal effort.
                </p>
              </div>
            </div>
            
            {/* Feature 3 */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 dark:from-[#FFD700]/20 dark:to-[#FFA500]/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
              <div className="relative bg-white dark:bg-[#252542] rounded-xl p-8 h-full border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-colors">
                <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-[#FFD700]/10 flex items-center justify-center mb-6">
                  <GitFork className="h-6 w-6 text-purple-600 dark:text-[#FFD700]" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Branching Narratives</h3>
                <p className="text-gray-600 dark:text-white/70">
                  Create non-linear stories with multiple paths, choices, and endings. Give readers control and create endless possibilities.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <Button 
              size="lg" 
              className="bg-amber-400 hover:bg-amber-500 dark:bg-[#FFD700] dark:hover:bg-[#FFA500] text-gray-900 dark:text-[#1E1E2F] font-medium rounded-md group"
              onClick={onUploadInitial}
            >
              <span>Get Started Now</span>
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="relative py-10 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1a1a29] z-10">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="relative h-6 w-6 rounded-md overflow-hidden">
                <Image 
                  src="/logo.svg" 
                  alt="Branching Tales Logo" 
                  width={24} 
                  height={24}
                  className="w-full h-full"
                />
              </div>
              <span className="font-bold text-base">Branching Tales</span>
            </div>
            
            <div className="flex gap-8 text-sm text-gray-500 dark:text-white/60">
              <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Contact</a>
            </div>
            
            <div className="mt-4 md:mt-0 text-xs text-gray-400 dark:text-white/40 flex items-center">
              <Zap className="mr-1 h-3 w-3 text-purple-500 dark:text-[#FFD700]" />
              Powered by AI
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage; 