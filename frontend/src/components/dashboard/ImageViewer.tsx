import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ZoomIn, ZoomOut, RotateCcw, Contrast, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import sampleXray from '@/assets/sample-xray.jpg';

interface ImageViewerProps {
  onImageUpload?: (file: File) => void;
}

const ImageViewer = ({ onImageUpload }: ImageViewerProps) => {
  const [image, setImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [highContrast, setHighContrast] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        onImageUpload?.(file);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        onImageUpload?.(file);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUpload]);

  const loadSampleImage = () => {
    setImage(sampleXray);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleReset = () => {
    setZoom(1);
    setHighContrast(false);
  };

  return (
    <Card className="h-full flex flex-col border-border shadow-sm">
      <CardHeader className="py-3 px-4 border-b border-border">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <Upload className="h-4 w-4 text-primary" />
          Upload Scan
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-3 flex flex-col gap-3">
        <AnimatePresence mode="wait">
          {!image ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
                isDragging 
                  ? 'border-primary bg-accent' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer text-center">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mx-auto mb-2">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">Upload DICOM / X-Ray</p>
                <p className="text-xs text-muted-foreground mt-1">Drag & drop or click to browse</p>
              </label>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>or</span>
              </div>
              <Button variant="outline" size="sm" onClick={loadSampleImage}>
                <ImageIcon className="h-3 w-3 mr-1" />
                Load Sample X-Ray
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col gap-3"
            >
              <div className="flex-1 bg-secondary/30 rounded-lg overflow-hidden flex items-center justify-center relative">
                <motion.img
                  src={image}
                  alt="Medical scan"
                  className="max-w-full max-h-full object-contain"
                  style={{
                    transform: `scale(${zoom})`,
                    filter: highContrast ? 'contrast(1.5) brightness(1.1)' : 'none',
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button
                  variant={highContrast ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHighContrast(!highContrast)}
                >
                  <Contrast className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default ImageViewer;
