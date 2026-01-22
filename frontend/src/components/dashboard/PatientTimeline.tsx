import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, FileImage, FlaskConical, Stethoscope, TestTube, Microscope, MessageSquare, Eye, RefreshCw, Loader2, ChevronRight, Clock, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { getUser } from '@/lib/auth';

// Types
export interface ScanHistoryItem {
  id: string;
  date: string;
  date_full?: string;
  type: 'CXR' | 'CT' | 'MRI' | 'Lab' | 'PCR' | 'Consult';
  title: string;
  finding: string;
  status: 'normal' | 'abnormal' | 'critical';
  filename?: string;
  has_chat_history?: boolean;
  upload_timestamp?: string;
}

interface PatientTimelineProps {
  onOpenChat?: (scanId: string, scanData: ScanHistoryItem) => void;
  onViewScan?: (scanId: string, filename: string) => void;
  refreshTrigger?: number;
}

const typeIcons = {
  CXR: FileImage,
  CT: Activity,
  MRI: Activity,
  Lab: FlaskConical,
  PCR: TestTube,
  Consult: Stethoscope,
};

const statusColors = {
  normal: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  abnormal: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  critical: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const statusDots = {
  normal: 'bg-emerald-500',
  abnormal: 'bg-amber-500',
  critical: 'bg-red-500',
};

interface TimelineItemProps {
  scan: ScanHistoryItem;
  index: number;
  isLast: boolean;
  isSelected: boolean;
  onOpenChat: () => void;
  onViewScan: () => void;
}

const TimelineItem = ({ scan, index, isLast, isSelected, onOpenChat, onViewScan }: TimelineItemProps) => {
  const Icon = typeIcons[scan.type] || Microscope;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative"
    >
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-4 top-12 w-0.5 h-[calc(100%-2rem)] bg-border" />
      )}
      
      {/* Timeline item */}
      <div 
        className={`rounded-lg transition-all duration-200 ${
          isSelected 
            ? 'bg-primary/5 ring-1 ring-primary/20' 
            : 'hover:bg-muted/50'
        }`}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left"
        >
          <div className="flex gap-3 p-2">
            {/* Icon */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${statusColors[scan.status]} border`}>
              <Icon className="h-4 w-4" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-muted-foreground">{scan.date}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${statusDots[scan.status]}`} />
                {scan.has_chat_history && (
                  <Badge variant="outline" className="h-4 px-1 text-[10px] bg-primary/5 border-primary/20">
                    <MessageSquare className="h-2.5 w-2.5 mr-0.5" />
                    Chat
                  </Badge>
                )}
              </div>
              <p className="text-sm font-medium text-foreground truncate">{scan.title}</p>

              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{scan.finding.substring(0, 50)}{scan.finding.length > 50 ? '...' : ''}</p>
            </div>
            
            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 mt-2 ${isExpanded ? 'rotate-90' : ''}`} />
          </div>
        </button>
        
        {/* Expanded Actions */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-2 pb-2 ml-11 space-y-2">
                <p className="text-xs text-muted-foreground">{scan.finding}</p>
                
                <div className="flex gap-2">
                  {scan.filename && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 text-xs flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewScan();
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Scan
                    </Button>
                  )}
                  
                  <Button 
                    size="sm" 
                    variant={scan.has_chat_history ? "default" : "secondary"}
                    className="h-7 text-xs flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenChat();
                    }}
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    {scan.has_chat_history ? 'Open Chat' : 'Start Chat'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const PatientTimeline = ({ onOpenChat, onViewScan, refreshTrigger }: PatientTimelineProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const user = getUser();
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);

  // Fetch patient history from backend
  const fetchHistory = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/patient-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: user.patientId })
      });
      
      if (response.ok) {
        const data = await response.json();
        setHistory(data.scans || []);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user?.patientId, refreshTrigger]);

  const handleOpenChat = (scan: ScanHistoryItem) => {
    setSelectedScanId(scan.id);
    if (onOpenChat) {
      onOpenChat(scan.id, scan);
    }
    toast({
      title: scan.has_chat_history ? 'Loading chat history...' : 'Starting new chat',
      description: `${scan.title} from ${scan.date}`,
    });
  };

  const handleViewScan = (scan: ScanHistoryItem) => {
    if (scan.filename && onViewScan) {
      onViewScan(scan.id, scan.filename);
    }
    toast({
      title: 'Loading scan...',
      description: `${scan.title} from ${scan.date}`,
    });
  };

  const handleViewMedicalHistory = () => {
    if (user?.patientId) {
      navigate(`/medical-history/${user.patientId}`);
    }
  };

  return (
    <Card className="h-full flex flex-col border-border shadow-sm">
      {/* View Complete Medical History Button */}
      <div className="p-3 border-b border-border">
        <Button 
          onClick={handleViewMedicalHistory}
          variant="outline" 
          className="w-full gap-2 bg-primary/5 hover:bg-primary/10 border-primary/20 text-foreground"
        >
          <FolderOpen className="h-4 w-4 text-primary" />
          View Complete Medical History
        </Button>
      </div>
      
      <CardHeader className="py-3 px-4 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Activity className="h-4 w-4 text-primary" />
            Scan History
          </CardTitle>
          <div className="flex items-center gap-2">
            {user && (
              <span className="text-xs text-muted-foreground">
                {user.patientId}
              </span>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={fetchHistory}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-1">
            {isLoading && history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mb-2" />
                <p className="text-sm">Loading history...</p>
              </div>
            ) : history.length > 0 ? (
              history.map((scan, index) => (
                <TimelineItem
                  key={scan.id}
                  scan={scan}
                  index={index}
                  isLast={index === history.length - 1}
                  isSelected={selectedScanId === scan.id}
                  onOpenChat={() => handleOpenChat(scan)}
                  onViewScan={() => handleViewScan(scan)}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">No scan history</p>
                <p className="text-xs text-center mt-1">
                  Upload a scan to start building your medical history
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default PatientTimeline;
