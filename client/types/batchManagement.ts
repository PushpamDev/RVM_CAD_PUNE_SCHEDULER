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

export interface Batch {
  id: string;
  name: string;
  description?: string;
  students: Student[];
  faculty_id: string;
  faculty: { id: string; name: string };
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  days_of_week: string[];
  skill: Skill;
  max_students: number;
  status: BatchStatus;

  // **NEW**: Optional fields to hold substitution data processed by useBatchData
  isSubstituted?: boolean;
  original_faculty?: { id: string; name: string };
  substitutionDetails?: FacultySubstitution;
}

export const BATCH_STATUSES: BatchStatus[] = ["upcoming", "active", "completed"];

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

// Payload for PERMANENT faculty reassignment
export interface AssignSubstitutePayload {
  batchId: string;
  facultyId: string;
}

// Payload for PERMANENTLY merging two batches
export interface MergeBatchesPayload {
  targetBatchId: string;
  sourceBatchId: string;
}

// Represents a temporary substitution record from the database
export interface FacultySubstitution {
  id: string;
  batch_id: string;
  original_faculty_id: string;
  substitute_faculty_id: string;
  start_date: string;
  end_date: string;
  notes?: string;
}

// Payload for creating a TEMPORARY substitution for a leave period
export interface CreateSubstitutionPayload {
  batchId: string;
  substituteFacultyId: string;
  startDate: string;
  endDate: string;
  notes?: string;
}