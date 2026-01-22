import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ZoomIn, ZoomOut, RotateCcw, Contrast, Image as ImageIcon, ScanSearch, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import sampleXray from '@/assets/sample-xray.jpg';

interface ImageViewerProps {
  onImageUpload?: (file: File, scanType: string) => Promise<{ scan_id: string } | void>;
  historicalImage?: string | null;
  historicalScanId?: string | null;
  onClearHistorical?: () => void;
}

const API_BASE = 'http://localhost:8000';

const scanTypes = [
  { value: 'CXR', label: 'Chest X-Ray' },
  { value: 'CT', label: 'CT Scan' },
  { value: 'MRI', label: 'MRI' },
  { value: 'Ultrasound', label: 'Ultrasound' },
  { value: 'Other', label: 'Other' },
];

const ImageViewer = ({ onImageUpload, historicalImage, historicalScanId, onClearHistorical }: ImageViewerProps) => {
  const [image, setImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [highContrast, setHighContrast] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [scanType, setScanType] = useState('CXR');
  const [viewMode, setViewMode] = useState<'upload' | 'historical'>('upload');

  // Handle historical image display
  useEffect(() => {
    if (historicalImage) {
      setViewMode('historical');
    }
  }, [historicalImage]);

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        setSelectedFile(file);
        setUploadSuccess(false);
        setViewMode('upload');
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
    try {
      const response = await fetch(sampleXray);
      const blob = await response.blob();
      const file = new File([blob], "sample_xray.jpg", { type: "image/jpeg" });
      setImage(sampleXray);
      setSelectedFile(file);
      setUploadSuccess(false);
      setViewMode('upload');
    } catch (e) {
      console.error("Could not load sample", e);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile || !onImageUpload) return;
    
    setIsUploading(true);
    try {
      const result = await onImageUpload(selectedFile, scanType);
      setUploadSuccess(true);
      // Don't reset the image - keep it visible for analysis
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
    setUploadSuccess(false);
    setViewMode('upload');
    if (onClearHistorical) onClearHistorical();
  };

  const handleBackToUpload = () => {
    setViewMode('upload');
    if (onClearHistorical) onClearHistorical();
  };

  // Determine which image to display
  const displayImage = viewMode === 'historical' && historicalImage 
    ? `${API_BASE}/uploads/${historicalImage}`
    : image;

  return (
    <Card className="h-full flex flex-col border-border shadow-sm overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Upload className="h-4 w-4 text-primary" />
            {viewMode === 'historical' ? 'Historical Scan' : 'Radiology Expert'}
          </CardTitle>
          <div className="flex items-center gap-1">
            {viewMode === 'historical' && (
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleBackToUpload}>
                Back to Upload
              </Button>
            )}
            {(displayImage || image) && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleReset}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-col bg-zinc-950/5 relative">
        <AnimatePresence mode="wait">
          {!displayImage ? (
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
                  src={displayImage}
                  alt="Medical scan"
                  className="max-w-full max-h-full object-contain shadow-2xl"
                  style={{
                    transform: `scale(${zoom})`,
                    filter: highContrast ? 'contrast(1.5) brightness(1.1) grayscale(100%)' : 'none',
                  }}
                  drag
                  dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                />
                
                {/* Status Badge */}
                {viewMode === 'upload' && uploadSuccess && (
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-emerald-500/90 text-white">
                      <Check className="h-3 w-3 mr-1" />
                      Uploaded & Indexed
                    </Badge>
                  </div>
                )}

                {viewMode === 'historical' && (
                  <div className="absolute top-4 left-4">
                    <Badge variant="secondary">
                      Historical Scan
                    </Badge>
                  </div>
                )}
                
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

              {/* Action Bar - Only for upload mode */}
              {viewMode === 'upload' && (
                <div className="p-4 bg-card border-t border-border space-y-3">
                  {/* Scan Type Selector */}
                  {!uploadSuccess && (
                    <Select value={scanType} onValueChange={setScanType}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select scan type" />
                      </SelectTrigger>
                      <SelectContent>
                        {scanTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Button 
                    size="lg" 
                    className={`w-full font-semibold shadow-lg transition-all ${
                      uploadSuccess 
                        ? 'bg-emerald-600 hover:bg-emerald-700' 
                        : 'hover:shadow-primary/25'
                    }`}
                    onClick={handleAnalyze}
                    disabled={isUploading || uploadSuccess}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : uploadSuccess ? (
                      <>
                        <Check className="h-5 w-5 mr-2" />
                        Scan Saved
                      </>
                    ) : (
                      <>
                        <ScanSearch className="h-5 w-5 mr-2" />
                        Save & Analyze Scan
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    End-to-End Encrypted
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default ImageViewer;