import { motion } from 'framer-motion';
import { Activity, FileImage, FlaskConical, Stethoscope, TestTube, Microscope } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getPatientHistory, type HistoryEvent } from '@/lib/patientData';
import { getUser } from '@/lib/auth';

const typeIcons = {
  CXR: FileImage,
  CT: Activity,
  MRI: Activity,
  Lab: FlaskConical,
  PCR: TestTube,
  Consult: Stethoscope,
};

const statusColors = {
  normal: 'bg-success/10 text-success border-success/20',
  abnormal: 'bg-warning/10 text-warning border-warning/20',
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusDots = {
  normal: 'bg-success',
  abnormal: 'bg-warning',
  critical: 'bg-destructive',
};

interface TimelineItemProps {
  event: HistoryEvent;
  index: number;
  isLast: boolean;
}

const TimelineItem = ({ event, index, isLast }: TimelineItemProps) => {
  const { toast } = useToast();
  const Icon = typeIcons[event.type] || Microscope;

  const handleClick = () => {
    toast({
      title: 'Retrieving historical context...',
      description: `Loading ${event.title} from ${event.date}`,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative"
    >
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-4 top-10 w-0.5 h-full bg-border" />
      )}
      
      {/* Timeline item */}
      <button
        onClick={handleClick}
        className="w-full text-left group"
      >
        <div className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
          {/* Icon */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${statusColors[event.status]} border`}>
            <Icon className="h-4 w-4" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-medium text-muted-foreground">{event.date}</span>
              <div className={`w-1.5 h-1.5 rounded-full ${statusDots[event.status]}`} />
            </div>
            <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{event.finding}</p>
          </div>
        </div>
      </button>
    </motion.div>
  );
};

const PatientTimeline = () => {
  const user = getUser();
  const history = user ? getPatientHistory(user.patientId) : [];

  return (
    <Card className="h-full flex flex-col border-border shadow-sm">
      <CardHeader className="py-3 px-4 border-b border-border">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <Activity className="h-4 w-4 text-primary" />
          Patient History
          {user && (
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {user.patientId}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-3 overflow-auto">
        {history.length > 0 ? (
          <div className="space-y-1">
            {history.map((event, index) => (
              <TimelineItem
                key={event.id}
                event={event}
                index={index}
                isLast={index === history.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No patient history available
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientTimeline;
