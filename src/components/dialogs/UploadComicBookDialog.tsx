
import type { FC, ChangeEvent } from 'react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpenCheck } from 'lucide-react';
import Image from 'next/image';

interface UploadComicBookDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[], title: string) => void;
}

const MAX_PAGES = 50;

const UploadComicBookDialog: FC<UploadComicBookDialogProps> = ({ isOpen, onClose, onUpload }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [comicBookTitle, setComicBookTitle] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError('');
    const files = event.target.files ? Array.from(event.target.files) : [];
    
    if (files.length === 0) {
      setSelectedFiles([]);
      setPreviewUrls([]);
      return;
    }

    if (files.length > MAX_PAGES) {
      setError(`You can upload a maximum of ${MAX_PAGES} pages at a time.`);
      setSelectedFiles([]);
      setPreviewUrls([]);
      event.target.value = ''; 
      return;
    }

    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      setError('Please select only image files (PNG, JPG, GIF, etc.).');
      setSelectedFiles([]);
      setPreviewUrls([]);
      event.target.value = '';
      return;
    }

    imageFiles.sort((a, b) => a.name.localeCompare(b.name));
    setSelectedFiles(imageFiles);
    
    const newPreviewUrls: string[] = [];
    const fileReadPromises = imageFiles.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(fileReadPromises).then(urls => {
        setPreviewUrls(urls);
    });
  };

  const handleSubmit = () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one image file for the comic pages.');
      return;
    }
    if (!comicBookTitle.trim()) {
        setError('Please provide a title for your comic book.');
        return;
    }
    onUpload(selectedFiles, comicBookTitle.trim());
    handleClose();
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setPreviewUrls([]);
    setComicBookTitle('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-full max-w-sm sm:max-w-lg md:max-w-2xl bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl text-primary">Upload Comic Book Pages</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Select all pages for your comic book (e.g., page_01.jpg, page_02.png ...). They will be ordered by filename. Add a title for the comic book.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:gap-4 py-4">
          <div className="grid w-full items-center gap-1 sm:gap-1.5">
            <Label htmlFor="comic-title" className="text-foreground text-sm">Comic Book Title</Label>
            <Input 
              id="comic-title" 
              type="text" 
              value={comicBookTitle}
              onChange={(e) => setComicBookTitle(e.target.value)}
              placeholder="Enter the title of your comic book"
              className="text-foreground text-sm"
            />
          </div>

          <div className="grid w-full items-center gap-1 sm:gap-1.5">
            <Label htmlFor="comic-pages" className="text-foreground text-sm">Comic Pages (up to {MAX_PAGES}, sorted by filename)</Label>
            <Input 
              id="comic-pages" 
              type="file" 
              accept="image/*" 
              multiple 
              onChange={handleFileChange} 
              className="text-foreground file:text-primary text-xs sm:text-sm" 
            />
            {error && <p className="text-xs sm:text-sm text-destructive">{error}</p>}
          </div>

          {previewUrls.length > 0 && (
            <div className="mt-2 border border-border rounded-md p-1.5 sm:p-2">
              <Label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Page Previews ({previewUrls.length} selected, ordered by name):</Label>
              <ScrollArea className="h-[150px] xs:h-[200px] sm:h-[300px]">
                <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-2 p-1">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="aspect-[2/3] relative bg-muted rounded overflow-hidden border">
                      <Image 
                        src={url} 
                        alt={`Page preview ${index + 1}`} 
                        layout="fill" 
                        objectFit="contain" 
                        data-ai-hint="comic page preview"
                        sizes="(max-width: 400px) 40vw, (max-width: 640px) 30vw, (max-width: 768px) 20vw, 150px"
                        />
                       <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] sm:text-xs p-0.5 text-center">Page {index+1}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto">Cancel</Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit} disabled={selectedFiles.length === 0 || !comicBookTitle.trim()} className="w-full sm:w-auto">
            <BookOpenCheck className="mr-2 h-4 w-4" /> Upload Comic Book
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadComicBookDialog;
