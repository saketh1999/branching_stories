
import type { FC, ChangeEvent } from 'react';
import { useState, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ComicPanelData } from '@/types/story';
import Image from 'next/image';
import { UploadCloud } from 'lucide-react';

interface SetContextImageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  allPanels: ComicPanelData[];
  parentPanelId: string;
  onContextImageSelected: (imageData: { 
    dataUrl: string; 
    previewUrl: string;
    sourcePanelId?: string; 
    sourceImageIndex?: number;
  }) => void;
}

const SetContextImageDialog: FC<SetContextImageDialogProps> = ({ 
  isOpen, 
  onClose, 
  allPanels, 
  parentPanelId, 
  onContextImageSelected 
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  const sortedPanels = useMemo(() => {
    return [...allPanels].reverse().filter(p => p.imageUrls && p.imageUrls.length > 0);
  }, [allPanels]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file.');
        setSelectedFile(null);
        setPreviewUrl(null);
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleUploadAndSelect = () => {
    if (selectedFile && previewUrl) {
      onContextImageSelected({ dataUrl: previewUrl, previewUrl: previewUrl });
      handleClose();
    } else {
      setError('Please select a file to upload.');
    }
  };

  const handleSelectFromPrevious = (panelId: string, imageUrl: string, imageIndex: number) => {
    onContextImageSelected({ 
        dataUrl: imageUrl, 
        previewUrl: imageUrl, 
        sourcePanelId: panelId, 
        sourceImageIndex: imageIndex 
    });
    handleClose();
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-full max-w-sm sm:max-w-2xl md:max-w-3xl bg-card">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl text-primary">Set Context Image</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Choose an image from a previous panel or upload a new one to provide visual context.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="previous" className="w-full mt-2 sm:mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="previous" className="text-xs sm:text-sm">From Previous Panels</TabsTrigger>
            <TabsTrigger value="upload" className="text-xs sm:text-sm">Upload New Image</TabsTrigger>
          </TabsList>
          
          <TabsContent value="previous">
            <ScrollArea className="h-[300px] sm:h-[400px] p-1 border rounded-md mt-2">
              {sortedPanels.length === 0 && (
                <p className="text-muted-foreground text-center p-4 text-xs sm:text-sm">No previous panels with images available.</p>
              )}
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 p-2 sm:p-3">
                {sortedPanels.map(panel => (
                  panel.imageUrls.map((imgUrl, imgIndex) => (
                    <div key={`${panel.id}-${imgIndex}`} className="group relative aspect-video border rounded-md overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary"
                         onClick={() => handleSelectFromPrevious(panel.id, imgUrl, imgIndex)}>
                      <Image 
                        src={imgUrl} 
                        alt={`Image ${imgIndex + 1} from panel ${panel.title || panel.id.substring(0,4)}`} 
                        layout="fill" 
                        objectFit="contain" 
                        data-ai-hint="panel image small"
                        sizes="(max-width: 400px) 80vw, (max-width: 640px) 40vw, (max-width: 768px) 30vw, 200px"
                        />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] sm:text-xs p-0.5 sm:p-1 truncate group-hover:bg-primary/80">
                        {panel.title || `Panel ${panel.id.substring(0,4)}...`} (Img {imgIndex+1})
                      </div>
                    </div>
                  ))
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="upload">
            <div className="p-3 sm:p-4 border rounded-md mt-2 space-y-3 sm:space-y-4">
              <div className="grid w-full items-center gap-1 sm:gap-1.5">
                <Label htmlFor="context-upload" className="text-foreground text-sm">Upload Image File</Label>
                <Input 
                  id="context-upload" 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="text-foreground file:text-primary text-xs sm:text-sm"
                />
                {error && <p className="text-xs sm:text-sm text-destructive">{error}</p>}
              </div>
              {previewUrl && (
                <div className="space-y-2">
                   <Label className="text-xs sm:text-sm text-muted-foreground">Preview:</Label>
                  <div className="w-full aspect-video relative bg-muted rounded border overflow-hidden">
                     <Image 
                        src={previewUrl} 
                        alt="Uploaded context preview" 
                        layout="fill" 
                        objectFit="contain" 
                        data-ai-hint="upload preview"
                        sizes="(max-width: 640px) 90vw, 500px"
                        />
                  </div>
                  <Button onClick={handleUploadAndSelect} className="w-full text-xs sm:text-sm" disabled={!selectedFile}>
                    <UploadCloud className="mr-2 h-4 w-4" /> Use This Uploaded Image
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 sm:mt-6">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={handleClose} className="text-xs sm:text-sm">Cancel</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SetContextImageDialog;
