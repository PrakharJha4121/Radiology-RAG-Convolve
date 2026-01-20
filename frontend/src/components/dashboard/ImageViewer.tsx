import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ZoomIn, ZoomOut, RotateCcw, Contrast, Image as ImageIcon, ScanSearch, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import sampleXray from '@/assets/sample-xray.jpg';

interface ImageViewerProps {
  onImageUpload?: (file: File) => Promise<void>;
}

const ImageViewer = ({ onImageUpload }: ImageViewerProps) => {
  const [image, setImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // Store file before uploading
  const [isUploading, setIsUploading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [highContrast, setHighContrast] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Helper to read file and show preview
  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        setSelectedFile(file); // Save file but DO NOT upload yet
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, []);

  const loadSampleImage = async () => {
    // For sample, we fetch it as a blob so we can "upload" it like a real file
    try {
      const response = await fetch(sampleXray);
      const blob = await response.blob();
      const file = new File([blob], "sample_xray.jpg", { type: "image/jpeg" });
      setImage(sampleXray);
      setSelectedFile(file);
    } catch (e) {
      console.error("Could not load sample", e);
    }
  };

  // The new manual upload trigger
  const handleAnalyze = async () => {
    if (!selectedFile || !onImageUpload) return;
    
    setIsUploading(true);
    try {
      await onImageUpload(selectedFile);
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleReset = () => {
    setImage(null);
    setSelectedFile(null);
    setZoom(1);
    setHighContrast(false);
  };

  return (
    <Card className="h-full flex flex-col border-border shadow-sm overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Upload className="h-4 w-4 text-primary" />
            Scan Upload
          </CardTitle>
          {image && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleReset}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-col bg-zinc-950/5 relative">
        <AnimatePresence mode="wait">
          {!image ? (
            // --- STATE 1: UPLOAD AREA ---
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`flex-1 flex flex-col items-center justify-center gap-4 p-6 m-4 border-2 border-dashed rounded-xl transition-colors ${
                isDragging 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50 hover:bg-background'
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
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-background border shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">Upload Scan</h3>
                <p className="text-sm text-muted-foreground mt-1">DICOM, JPEG, or PNG</p>
              </label>

              <div className="flex items-center gap-3 w-full max-w-xs my-2">
                <div className="h-px bg-border flex-1" />
                <span className="text-xs text-muted-foreground font-medium uppercase">Or</span>
                <div className="h-px bg-border flex-1" />
              </div>

              <Button variant="secondary" size="sm" onClick={loadSampleImage} className="w-full max-w-xs">
                <ImageIcon className="h-4 w-4 mr-2" />
                Load Sample X-Ray
              </Button>
            </motion.div>
          ) : (
            // --- STATE 2: PREVIEW & ANALYZE ---
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col h-full"
            >
              {/* Image Area */}
              <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-zinc-950/90 p-4">
                <motion.img
                  src={image}
                  alt="Medical scan"
                  className="max-w-full max-h-full object-contain shadow-2xl"
                  style={{
                    transform: `scale(${zoom})`,
                    filter: highContrast ? 'contrast(1.5) brightness(1.1) grayscale(100%)' : 'none',
                  }}
                  drag
                  dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                />
                
                {/* Floating Zoom Controls */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background/90 backdrop-blur border rounded-full p-1 shadow-lg">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleZoomOut} disabled={zoom <= 0.5}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-[10px] font-mono w-8 text-center">{Math.round(zoom * 100)}%</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleZoomIn} disabled={zoom >= 3}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-4 bg-border mx-1" />
                  <Button 
                    variant={highContrast ? "secondary" : "ghost"} 
                    size="icon" 
                    className="h-8 w-8 rounded-full" 
                    onClick={() => setHighContrast(!highContrast)}
                    title="Toggle High Contrast"
                  >
                    <Contrast className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-4 bg-card border-t border-border">
                <Button 
                  size="lg" 
                  className="w-full font-semibold shadow-lg hover:shadow-primary/25 transition-all" 
                  onClick={handleAnalyze}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <ScanSearch className="h-5 w-5 mr-2" />
                      Save & Analyze Scan
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  HIPAA Compliant • Encrypted Upload
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default ImageViewer;