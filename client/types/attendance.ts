// src/types/attendance.ts

/**
 * Represents a single faculty member.
 */
export interface Faculty {
  id: string;
  name: string;
}

/**
 * Represents a single batch, including its duration and assigned faculty.
 */
export interface Batch {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  faculty_id: string;
}

/**
 * Represents a single student.
 */
export interface Student {
  id: string;
  name: string;
}

/**
 * Represents a single student's attendance record for one day.
 */
export interface AttendanceRecord {
  student_id: string;
  is_present: boolean;
}

/**
 * Defines the shape of the raw data returned from the attendance report API endpoint.
 */
export interface ReportApiResponse {
  students: Student[];
  // A record where the key is a date string (e.g., "2025-09-30")
  // and the value is an array of attendance records for that day.
  attendance_by_date: Record<string, AttendanceRecord[]>;
}