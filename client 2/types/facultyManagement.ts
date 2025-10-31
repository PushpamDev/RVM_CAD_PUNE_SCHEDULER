// client/types/facultyManagement.ts

export interface Skill {
  id: string;
  name: string;
}

export interface AvailabilitySlot {
  day_of_week: string;
  start_time: string;
  end_time: string;
}

export interface Faculty {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  skills: Skill[];
  availability: AvailabilitySlot[];
}

export interface User {
  id: string;
  username: string;
  role: string | null;
}

// Types for the form editor state
export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface DaySchedule {
  isAvailable: boolean;
  timeSlots: TimeSlot[];
}

export type WeeklySchedule = Record<string, DaySchedule>;

export interface FacultyFormData {
  userId: string;
  name: string;
  email: string;
  phone: string;
  skillIds: string[];
  schedule: WeeklySchedule;
}