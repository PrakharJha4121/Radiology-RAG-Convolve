import { v4 as uuidv4 } from 'uuid';

// ✅ FIX 1: Interface updated so TypeScript stops complaining
interface ConsultationState {
  consultationId: string;
  patientId: string;
  messages: any[];
  notes?: string;
  image?: File | null;
  status: 'pending' | 'completed';
  diagnosis?: string;    // <--- This was missing
  ai_analysis?: string;  // <--- This was missing
}

class AutoSaveManager {
  private timer: NodeJS.Timeout | null = null;
  private pendingState: ConsultationState | null = null;
  private lastSavedState: string = '';
  private DEBOUNCE_MS = 2000; 

  public scheduleSave(state: ConsultationState) {
    this.pendingState = state;
    
    // Check if data actually changed
    const currentStateString = JSON.stringify({ 
      m: state.messages, 
      pid: state.patientId,
      d: state.diagnosis 
    });

    if (currentStateString === this.lastSavedState && !state.image) return;

    if (this.timer) clearTimeout(this.timer);

    this.timer = setTimeout(() => {
      this.triggerSave();
    }, this.DEBOUNCE_MS);
  }

  public async forceSave() {
    if (this.timer) clearTimeout(this.timer);
    return this.triggerSave();
  }

  private async triggerSave() {
    if (!this.pendingState) return;

    const formData = new FormData();
    formData.append('consultationId', this.pendingState.consultationId);
    formData.append('patientId', this.pendingState.patientId);
    formData.append('messages', JSON.stringify(this.pendingState.messages));
    formData.append('status', this.pendingState.status);
    
    // Append new fields if they exist
    if (this.pendingState.diagnosis) formData.append('diagnosis', this.pendingState.diagnosis);
    if (this.pendingState.ai_analysis) formData.append('ai_analysis', this.pendingState.ai_analysis);
    if (this.pendingState.image) formData.append('image', this.pendingState.image);

    try {
      // ✅ FIX 2: Explicitly point to Port 8000 (Backend)
      // If you use just '/api/...', it tries to hit port 8080 (Frontend) and fails.
      await fetch('http://localhost:8000/api/consultations/autosave', {
        method: 'POST',
        body: formData,
        keepalive: true 
      });
      
      this.lastSavedState = JSON.stringify({ 
        m: this.pendingState.messages, 
        pid: this.pendingState.patientId,
        d: this.pendingState.diagnosis
      });
      console.log('✅ Autosave successful');
    } catch (err) {
      console.error('❌ Autosave failed', err);
    }
  }
}

export const autoSaveManager = new AutoSaveManager();