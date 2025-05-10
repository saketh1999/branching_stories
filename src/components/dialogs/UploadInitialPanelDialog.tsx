
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
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, Image as ImageIcon } from 'lucide-react'; // ImageIcon for previews
import Image from 'next/image';

interface UploadInitialPanelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[], description: string) => void; // Changed to File[]
}

const MAX_FILES = 4;

const UploadInitialPanelDialog: FC<UploadInitialPanelDialogProps> = ({ isOpen, onClose, onUpload }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError('');
    const files = event.target.files ? Array.from(event.target.files) : [];
    
    if (files.length === 0) {
      setSelectedFiles([]);
      setPreviewUrls([]);
      return;
    }

    if (files.length > MAX_FILES) {
      setError(`You can upload a maximum of ${MAX_FILES} images.`);
      setSelectedFiles([]);
      setPreviewUrls([]);
      event.target.value = ''; // Clear the input
      return;
    }

    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      setError('Please select only image files (PNG, JPG, GIF, etc.).');
      setSelectedFiles([]);
      setPreviewUrls([]);
      event.target.value = ''; // Clear the input
      return;
    }

    setSelectedFiles(imageFiles);
    
    const newPreviewUrls: string[] = [];
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviewUrls.push(reader.result as string);
        // Update previews once all files are read
        if (newPreviewUrls.length === imageFiles.length) {
          setPreviewUrls(newPreviewUrls);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file to upload.');
      return;
    }
    if (!description.trim()) {
        setError('Please provide a brief description for your panel images.');
        return;
    }
    onUpload(selectedFiles, description);
    handleClose();
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setPreviewUrls([]);
    setDescription('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">Upload Your First Comic Panel</DialogTitle>
          <DialogDescription>
            Choose 1 to {MAX_FILES} image files for the starting panel and add a short description for them.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="picture" className="text-foreground">Comic Panel Images (1-{MAX_FILES})</Label>
            <Input 
              id="picture" 
              type="file" 
              accept="image/*" 
              multiple // Allow multiple file selection
              onChange={handleFileChange} 
              className="text-foreground file:text-primary" 
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          {previewUrls.length > 0 && (
            <div className="mt-2 border border-border rounded-md p-2">
              <Label className="text-sm text-muted-foreground mb-1 block">Previews ({previewUrls.length} selected):</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {previewUrls.map((url, index) => (
                  <div key={index} className="aspect-square relative bg-muted rounded overflow-hidden">
                    <Image src={url} alt={`Preview ${index + 1}`} layout="fill" objectFit="contain" data-ai-hint="comic preview small"/>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid w-full gap-1.5">
            <Label htmlFor="description" className="text-foreground">Panel Images Description</Label>
            <Textarea
              placeholder="E.g., A brave knight encounters a mysterious forest..."
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-foreground"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit} disabled={selectedFiles.length === 0 || !description.trim()}>
            <UploadCloud className="mr-2 h-4 w-4" /> Upload Panel Images
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadInitialPanelDialog;
