import { API_BASE_URL } from '@/lib/api';
// Import or define your types. I've added placeholders for the new report structures.
import type { Ticket, PaginatedTickets, Admin, ChatMessage } from '@/types/ticketManagement';

// --- Placeholder types for Attendance. You should replace these with your actual types. ---
export interface Faculty {
  id: string;
  name: string;
}

export interface Batch {
  id: string;
  name: string;
}

// For GET /reports/batch/:batchId
export interface StudentAttendanceDetail {
  students: { id: string; name: string; /* ...other student details */ }[];
  attendance_by_date: Record<string, { student_id: string; is_present: boolean }[]>;
}

// For GET /reports/overall and GET /reports/faculty/:facultyId
export interface BatchReportItem {
  batch_id: string;
  batch_name: string;
  attendance_percentage: number;
  student_count: number;
  total_sessions: number;
}

export interface FacultyReport {
  faculty_id: string;
  faculty_name: string;
  faculty_attendance_percentage: number;
  batches: BatchReportItem[];
}

export interface OverallReport {
  overall_attendance_percentage: number;
  faculty_reports: FacultyReport[];
}

// For GET /batch/:batchId/daily
export interface DailyAttendanceRecord {
    student_id: string;
    is_present: boolean;
    student: {
        id: string;
        name: string;
    };
}

// For POST /
export interface AttendancePayload {
    batchId: string;
    date: string; // "YYYY-MM-DD"
    attendance: { student_id: string; is_present: boolean }[];
}


// --- Helper Functions ---

function getAuthHeaders(token: string | null): HeadersInit {
  if (!token) {
    throw new Error("Authentication token not found. Please log in again.");
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}


// --- Ticket Management API Functions (Unchanged, with one typo fix) ---

export async function fetchTickets(
  token: string | null, 
  filters: { status: string; search: string; category: string; page?: number; limit?: number }
): Promise<PaginatedTickets> {
  const params = new URLSearchParams({
    status: filters.status,
    search: filters.search,
    category: filters.category,
    page: String(filters.page || 1),
    limit: String(filters.limit || 15),
  });
  const response = await fetch(`${API_BASE_URL}/api/tickets?${params.toString()}`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch tickets');
  return response.json();
}

export async function getAdmins(token: string | null): Promise<Admin[]> {
  const response = await fetch(`${API_BASE_URL}/api/users/admins`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch admins');
  return response.json();
}

export async function fetchChatMessages(token: string | null, ticketId: string): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE_URL}/api/chat/${ticketId}`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch chat messages');
  return response.json();
}

export async function sendChatMessage(
  token: string | null,
  ticketId: string,
  payload: { message: string; sender_user_id?: string; sender_student_id?: string }
): Promise<ChatMessage> {
  const response = await fetch(`${API_BASE_URL}/api/chat/${ticketId}`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to send message');
  return response.json();
}

export async function updateTicket(
  token: string | null,
  ticketId: string,
  data: { status?: string; assignee_id?: string | null }
): Promise<Ticket> {
  const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to update ticket');
  return response.json();
}

export async function fetchTicketCategories(token: string | null): Promise<string[]> {
  // FIXED: Corrected typo from API_P_BASE_URL to API_BASE_URL
  const response = await fetch(`${API_BASE_URL}/api/tickets/categories`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch ticket categories');
  return response.json();
}


// --- Attendance Management API Functions (Updated & Expanded) ---

/**
 * Fetches all faculty members. (Unchanged)
 */
export async function fetchFaculties(token: string | null): Promise<Faculty[]> {
  const response = await fetch(`${API_BASE_URL}/api/faculty`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch faculties');
  return response.json();
}

export async function fetchFacultyStudentCount(token: string | null, facultyId: string): Promise<{ student_count: number; students: any[] }> {
  const response = await fetch(`${API_BASE_URL}/api/faculty/total-students/${facultyId}`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch faculty student count');
  return response.json();
}

/**
 * Fetches batches, optionally filtered by faculty. (Unchanged)
 */
export async function fetchBatchesForFaculty(token: string | null, facultyId: string): Promise<Batch[]> {
  const response = await fetch(`${API_BASE_URL}/api/batches?facultyId=${facultyId}`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch batches for faculty');
  return response.json();
}

/**
 * NEW: Fetches the overall attendance report for all faculties.
 * Corresponds to GET /api/attendance/reports/overall
 */
export async function fetchOverallAttendanceReport(token: string | null): Promise<OverallReport> {
    const url = `${API_BASE_URL}/api/attendance/reports/overall`;
    const response = await fetch(url, { headers: getAuthHeaders(token) });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch overall report');
    return response.json();
}

/**
 * NEW: Fetches a detailed attendance report for a single faculty.
 * Corresponds to GET /api/attendance/reports/faculty/:facultyId
 */
export async function fetchFacultyAttendanceReport(token: string | null, facultyId: string): Promise<FacultyReport> {
    const url = `${API_BASE_URL}/api/attendance/reports/faculty/${facultyId}`;
    const response = await fetch(url, { headers: getAuthHeaders(token) });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch faculty report');
    return response.json();
}

/**
 * UPDATED: Fetches the student-by-student attendance report for a batch.
 * Corresponds to GET /api/attendance/reports/batch/:batchId
 */
export async function fetchBatchAttendanceReport(
  token: string | null,
  batchId: string,
  params: { startDate: string; endDate: string }
): Promise<StudentAttendanceDetail> {
  const url = `${API_BASE_URL}/api/attendance/reports/batch/${batchId}?startDate=${params.startDate}&endDate=${params.endDate}`;
  const response = await fetch(url, { headers: getAuthHeaders(token) });
  if (!response.ok) throw new Error((await response.json()).error || 'No attendance data found for this batch');
  return response.json();
}

/**
 * NEW: Fetches the attendance for a single batch on a single day.
 * Corresponds to GET /api/attendance/batch/:batchId/daily
 */
export async function fetchDailyAttendance(
    token: string | null,
    batchId: string,
    date: string // "YYYY-MM-DD"
): Promise<DailyAttendanceRecord[]> {
    const url = `${API_BASE_URL}/api/attendance/batch/${batchId}/daily?date=${date}`;
    const response = await fetch(url, { headers: getAuthHeaders(token) });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch daily attendance');
    return response.json();
}

/**
 * NEW: Saves (upserts) attendance data for a batch on a specific day.
 * Corresponds to POST /api/attendance
 */
export async function saveAttendance(token: string | null, payload: AttendancePayload): Promise<any> {
    const url = `${API_BASE_URL}/api/attendance`;
    const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to save attendance');
    return response.json();
}

// Add these functions to your existing apiService.ts file

/**
 * Fetches a list of all batches.
 */
export async function fetchAllBatches(token: string | null): Promise<Batch[]> {
  const response = await fetch(`${API_BASE_URL}/api/batches`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch batches');
  return response.json();
}

/**
 * Fetches a list of all students.
 * The backend might return a paginated or structured object.
 */
export async function fetchAllStudents(token: string | null): Promise<{ students: Student[], total: number }> {
  const response = await fetch(`${API_BASE_URL}/api/students`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch students');
  return response.json();
}

/**
 * Fetches the total count of active students for the admin dashboard.
 */
export async function fetchAdminActiveStudentsCount(token: string | null): Promise<{ total_active_students: number }> {
    const response = await fetch(`${API_BASE_URL}/api/batches/active-students-count`, {
        headers: getAuthHeaders(token),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch active students count');
    return response.json();
}

/**
 * Fetches the active student counts per faculty for the faculty dashboard.
 */
export async function fetchFacultyActiveStudents(token: string | null): Promise<FacultyActiveStudents[]> {
    const response = await fetch(`${API_BASE_URL}/api/faculty/active-students`, {
        headers: getAuthHeaders(token),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch faculty active students');
    return response.json();
}