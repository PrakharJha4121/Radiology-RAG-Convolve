// Mock patient history data

export interface HistoryEvent {
  id: string;
  date: string;
  type: 'CXR' | 'CT' | 'MRI' | 'Lab' | 'PCR' | 'Consult';
  title: string;
  finding: string;
  status: 'normal' | 'abnormal' | 'critical';
}

export const patientHistory: Record<string, HistoryEvent[]> = {
  PID1: [
    {
      id: '1',
      date: 'Oct 2023',
      type: 'CXR',
      title: 'Chest X-Ray',
      finding: 'Normal cardiac silhouette, clear lung fields',
      status: 'normal',
    },
    {
      id: '2',
      date: 'Jan 2022',
      type: 'CT',
      title: 'CT Chest',
      finding: 'Bilateral ground-glass opacities consistent with viral pneumonia',
      status: 'abnormal',
    },
    {
      id: '3',
      date: 'Mar 2020',
      type: 'PCR',
      title: 'COVID-19 PCR',
      finding: 'Positive',
      status: 'critical',
    },
    {
      id: '4',
      date: 'Feb 2019',
      type: 'CXR',
      title: 'Chest X-Ray',
      finding: 'No acute cardiopulmonary abnormality',
      status: 'normal',
    },
  ],
  PID2: [
    {
      id: '1',
      date: 'Nov 2023',
      type: 'MRI',
      title: 'Brain MRI',
      finding: 'No intracranial abnormality detected',
      status: 'normal',
    },
    {
      id: '2',
      date: 'Aug 2023',
      type: 'Lab',
      title: 'Blood Panel',
      finding: 'Elevated CRP levels (12 mg/L)',
      status: 'abnormal',
    },
    {
      id: '3',
      date: 'May 2022',
      type: 'CT',
      title: 'CT Abdomen',
      finding: 'Small hepatic cyst, benign appearance',
      status: 'normal',
    },
    {
      id: '4',
      date: 'Jan 2021',
      type: 'Consult',
      title: 'Cardiology Consult',
      finding: 'Mild mitral regurgitation, no intervention needed',
      status: 'normal',
    },
  ],
  PID3: [
    {
      id: '1',
      date: 'Dec 2023',
      type: 'CXR',
      title: 'Chest X-Ray',
      finding: 'Right lower lobe consolidation suggestive of pneumonia',
      status: 'critical',
    },
    {
      id: '2',
      date: 'Sep 2023',
      type: 'Lab',
      title: 'CBC with Differential',
      finding: 'Leukocytosis (WBC 14,500/µL)',
      status: 'abnormal',
    },
    {
      id: '3',
      date: 'Jun 2022',
      type: 'CT',
      title: 'CT Chest with Contrast',
      finding: 'No pulmonary embolism. Incidental 4mm lung nodule.',
      status: 'abnormal',
    },
    {
      id: '4',
      date: 'Mar 2020',
      type: 'CXR',
      title: 'Chest X-Ray',
      finding: 'Clear lungs bilaterally',
      status: 'normal',
    },
  ],
};

export const getPatientHistory = (patientId: string): HistoryEvent[] => {
  return patientHistory[patientId.toUpperCase()] || [];
};
