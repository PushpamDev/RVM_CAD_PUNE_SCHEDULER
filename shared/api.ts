/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * Core domain types for the Faculty/Batch Scheduler
 */

export interface Skill {
  id: string;
  name: string;
  description?: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeSlot {
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

export interface DaySchedule {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  isAvailable: boolean;
  timeSlots: TimeSlot[];
}

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface Faculty {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type: 'full-time' | 'part-time' | 'contract';
  skills: Skill[];
  schedule: WeeklySchedule;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Batch {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  faculty: Faculty;
  skill: Skill;
  schedule: WeeklySchedule;
  maxStudents?: number;
  currentStudents?: number;
  status: 'Upcoming' | 'active' | 'completed' ;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * API Request/Response types
 */

// Faculty API types
export interface CreateFacultyRequest {
  name: string;
  email: string;
  phone?: string;
  type: 'full-time' | 'part-time' | 'contract';
  skillIds: string[];
  schedule: WeeklySchedule;
}

export interface UpdateFacultyRequest extends Partial<CreateFacultyRequest> {
  id: string;
  isActive?: boolean;
}

export interface FacultyResponse {
  faculty: Faculty;
}

export interface FacultiesResponse {
  faculties: Faculty[];
  total: number;
}

// Batch API types
export interface CreateBatchRequest {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  facultyId: string;
  skillId: string;
  schedule: WeeklySchedule;
  maxStudents?: number;
}

export interface UpdateBatchRequest extends Partial<CreateBatchRequest> {
  id: string;
  status?: 'Upcoming' | 'active' | 'completed';
  currentStudents?: number;
}

export interface BatchResponse {
  batch: Batch;
}

export interface BatchesResponse {
  batches: Batch[];
  total: number;
}

// Skill API types
export interface CreateSkillRequest {
  name: string;
  description?: string;
  category?: string;
}

export interface UpdateSkillRequest extends Partial<CreateSkillRequest> {
  id: string;
}

export interface SkillResponse {
  skill: Skill;
}

export interface SkillsResponse {
  skills: Skill[];
  total: number;
}

/**
 * Utility types and functions
 */

export const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
] as const;

export const FACULTY_TYPES = ['full-time', 'part-time', 'contract'] as const;
export const BATCH_STATUSES = ['Upcoming', 'active', 'completed'] as const;

export function createEmptyWeeklySchedule(): WeeklySchedule {
  const emptyDaySchedule: DaySchedule = {
    day: 'monday',
    isAvailable: false,
    timeSlots: []
  };

  return {
    monday: { ...emptyDaySchedule, day: 'monday' },
    tuesday: { ...emptyDaySchedule, day: 'tuesday' },
    wednesday: { ...emptyDaySchedule, day: 'wednesday' },
    thursday: { ...emptyDaySchedule, day: 'thursday' },
    friday: { ...emptyDaySchedule, day: 'friday' },
    saturday: { ...emptyDaySchedule, day: 'saturday' },
    sunday: { ...emptyDaySchedule, day: 'sunday' }
  };
}
