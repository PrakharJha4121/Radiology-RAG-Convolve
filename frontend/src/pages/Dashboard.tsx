import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import ImageViewer from '@/components/dashboard/ImageViewer';
import ChatInterface from '@/components/dashboard/ChatInterface';
import PatientTimeline from '@/components/dashboard/PatientTimeline';
import { getUser, logout } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = getUser();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    toast({
      title: 'Signed out',
      description: 'You have been successfully signed out.',
    });
    navigate('/');
  };

  const handleImageUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/upload-scan', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      toast({
        title: 'Upload successful',
        description: 'Medical scan has been uploaded and indexed.',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload the medical scan. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground leading-none">Radiology-RAG</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Clinical Decision Support</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.patientId}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 overflow-hidden p-4"
      >
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg">
          {/* Left Panel - Image Viewer */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
            <ImageViewer onImageUpload={handleImageUpload} />
          </ResizablePanel>

          <ResizableHandle withHandle className="mx-2" />

          {/* Center Panel - Chat Interface */}
          <ResizablePanel defaultSize={50} minSize={35}>
            <ChatInterface />
          </ResizablePanel>

          <ResizableHandle withHandle className="mx-2" />

          {/* Right Panel - Patient Timeline */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
            <PatientTimeline />
          </ResizablePanel>
        </ResizablePanelGroup>
      </motion.main>
    </div>
  );
};

export default Dashboard;
