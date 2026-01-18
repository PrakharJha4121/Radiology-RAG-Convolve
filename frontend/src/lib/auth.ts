// Mock authentication utilities

export interface User {
  patientId: string;
  name: string;
}

const VALID_CREDENTIALS: Record<string, { password: string; name: string }> = {
  PID1: { password: 'AAA', name: 'John Doe' },
  PID2: { password: 'BBB', name: 'Jane Smith' },
  PID3: { password: 'CCC', name: 'Robert Johnson' },
};

export const authenticate = (patientId: string, password: string): User | null => {
  const user = VALID_CREDENTIALS[patientId.toUpperCase()];
  if (user && user.password === password) {
    return { patientId: patientId.toUpperCase(), name: user.name };
  }
  return null;
};

export const saveUser = (user: User): void => {
  localStorage.setItem('radiology_user', JSON.stringify(user));
};

export const getUser = (): User | null => {
  const stored = localStorage.getItem('radiology_user');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};

export const logout = (): void => {
  localStorage.removeItem('radiology_user');
};
