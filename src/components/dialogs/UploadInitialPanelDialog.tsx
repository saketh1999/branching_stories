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
import { UploadCloud } from 'lucide-react';
import Image from 'next/image';

interface UploadInitialPanelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, description: string) => void;
}

const UploadInitialPanelDialog: FC<UploadInitialPanelDialogProps> = ({ isOpen, onClose, onUpload }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file (PNG, JPG, GIF, etc.).');
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
    }
  };

  const handleSubmit = () => {
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }
    if (!description.trim()) {
        setError('Please provide a brief description for your panel.');
        return;
    }
    onUpload(selectedFile, description);
    handleClose();
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setDescription('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[480px] bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">Upload Your First Comic Panel</DialogTitle>
          <DialogDescription>
            Choose an image file for the starting panel of your story and add a short description.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="picture" className="text-foreground">Comic Panel Image</Label>
            <Input id="picture" type="file" accept="image/*" onChange={handleFileChange} className="text-foreground file:text-primary" />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          {previewUrl && (
            <div className="mt-2 border border-border rounded-md p-2 flex justify-center">
              <Image src={previewUrl} alt="Preview" width={200} height={150} className="object-contain rounded" data-ai-hint="comic preview"/>
            </div>
          )}
          <div className="grid w-full gap-1.5">
            <Label htmlFor="description" className="text-foreground">Panel Description</Label>
            <Textarea
              placeholder="E.g., A brave knight faces a dragon..."
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-foreground"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit} disabled={!selectedFile || !description.trim()}>
            <UploadCloud className="mr-2 h-4 w-4" /> Upload Panel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadInitialPanelDialog;
