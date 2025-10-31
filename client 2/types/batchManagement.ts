// types/batchManagement.ts

// --- Other Interfaces (Skill, Availability, Faculty, Student - Unchanged) ---
export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface Availability {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

export interface Faculty {
  id: string;
  name: string;
  type: "full-time" | "part-time";
  skills: Skill[];
  isActive: boolean;
  availability: Availability[];
}

export interface Student {
  id: string;
  name: string;
  admission_number: string;
  phone_number: string;
  remarks: string;
}

export type BatchStatus = 'upcoming' | 'active' | 'completed';

// --- UPDATED Batch Interface ---
export interface Batch {
  id: string;
  name: string;
  description?: string;
  // REMOVED: students: Student[]; // Backend now sends student_count instead
  student_count: number; // ADDED: Directly from the backend API
  faculty_id: string;
  faculty: { id: string; name: string }; // Keep this for display
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  days_of_week: string[];
  skill: Skill; // Assuming skill object is included
  max_students: number;
  status: BatchStatus; // The status stored in the DB

  // Optional fields for substitution data (processed by useBatchData or similar)
  isSubstituted?: boolean;
  original_faculty?: { id: string; name: string };
  substitutionDetails?: FacultySubstitution;

  // ADDED: Optional field for status calculated on the frontend
  derivedStatus?: 'upcoming' | 'active' | 'completed';
}
// --- END UPDATED Batch Interface ---

export const BATCH_STATUSES: BatchStatus[] = ["upcoming", "active", "completed"];

// --- Other Interfaces (BatchFormData, Payloads, Substitution - Unchanged) ---
export interface BatchFormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  facultyId: string;
  skillId: string;
  maxStudents: number;
  status: BatchStatus;
  studentIds: string[];
  daysOfWeek: string[];
}

export interface AssignSubstitutePayload {
  batchId: string;
  facultyId: string;
}

export interface MergeBatchesPayload {
  targetBatchId: string;
  sourceBatchId: string;
}

export interface FacultySubstitution {
  id: string;
  batch_id: string;
  original_faculty_id: string;
  substitute_faculty_id: string;
  start_date: string;
  end_date: string;
  notes?: string;
}

export interface CreateSubstitutionPayload {
  batchId: string;
  substituteFacultyId: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

// --- Interface used in Dashboard (Added here for completeness) ---
// This was previously defined locally in index.tsx, adding it here centralizes types
export interface FacultyActiveStudents {
  faculty_id: string;
  faculty_name: string;
  active_students: number;
}