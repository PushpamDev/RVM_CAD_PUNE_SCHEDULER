// client/types/batchManagement.ts

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
  status: "Upcoming" | "active" | "completed";
}

export const BATCH_STATUSES: Batch['status'][] = ["Upcoming", "active", "completed"];

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
  status: Batch['status'];
  studentIds: string[];
  daysOfWeek: string[];
}