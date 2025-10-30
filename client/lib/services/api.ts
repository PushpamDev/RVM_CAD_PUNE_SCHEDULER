import { API_BASE_URL } from '@/lib/api';

// --- REMOVED Placeholder Types ---

// --- ADDED Imports from Central Type File ---
import type {
    Faculty,
    Batch, // This Batch type now includes student_count
    Student, // Ensure this matches your full Student type
    FacultyActiveStudents // Added this import
} from '@/types/batchManagement'; // Assuming this is the correct path

// --- Import Ticket Management Types (Assuming path is correct) ---
import type { Ticket, PaginatedTickets, Admin, ChatMessage } from '@/types/ticketManagement';


// --- Specific Types for API Responses (Keep these here as they structure the API output) ---

// For GET /reports/batch/:batchId
export interface StudentAttendanceDetail {
  students: Student[]; // Use imported Student type
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
    student: Student; // Use imported Student type
}

// For POST /
export interface AttendancePayload {
    batchId: string;
    date: string; // "YYYY-MM-DD"
    attendance: { student_id: string; is_present: boolean }[];
}
// --- END Specific Types ---


// --- Helper Functions (Unchanged) ---
function getAuthHeaders(token: string | null): HeadersInit {
  if (!token) {
    throw new Error("Authentication token not found. Please log in again.");
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}


// --- Ticket Management API Functions (Unchanged) ---
export async function fetchTickets( /* ... */ ): Promise<PaginatedTickets> {
  const params = new URLSearchParams({ /* ... */ });
  const response = await fetch(`${API_BASE_URL}/api/tickets?${params.toString()}`, { headers: getAuthHeaders(token) });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch tickets');
  return response.json();
}
export async function getAdmins(token: string | null): Promise<Admin[]> {
  const response = await fetch(`${API_BASE_URL}/api/users/admins`, { headers: getAuthHeaders(token) });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch admins');
  return response.json();
}
export async function fetchChatMessages(token: string | null, ticketId: string): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE_URL}/api/chat/${ticketId}`, { headers: getAuthHeaders(token) });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch chat messages');
  return response.json();
}
export async function sendChatMessage( /* ... */ ): Promise<ChatMessage> {
  const response = await fetch(`${API_BASE_URL}/api/chat/${ticketId}`, { method: 'POST', headers: getAuthHeaders(token), body: JSON.stringify(payload) });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to send message');
  return response.json();
}
export async function updateTicket( /* ... */ ): Promise<Ticket> {
  const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}`, { method: 'PATCH', headers: getAuthHeaders(token), body: JSON.stringify(data) });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to update ticket');
  return response.json();
}
export async function fetchTicketCategories(token: string | null): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/tickets/categories`, { headers: getAuthHeaders(token) });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch ticket categories');
  return response.json();
}


// --- Attendance & Core Management API Functions (Using Imported Types) ---

export async function fetchFaculties(token: string | null): Promise<Faculty[]> {
  const response = await fetch(`${API_BASE_URL}/api/faculty`, { headers: getAuthHeaders(token) });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch faculties');
  return response.json();
}

// Assuming the API returns { total_students: number } based on previous code
export async function fetchFacultyStudentCount(token: string | null, facultyId: string): Promise<{ total_students: number }> {
  const response = await fetch(`${API_BASE_URL}/api/faculty/total-students/${facultyId}`, { headers: getAuthHeaders(token) });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch faculty student count');
  // Need to adjust the return type based on actual API response if different
  const data = await response.json();
  // Ensure the return matches the Promise type annotation
  return { total_students: data.total_students || 0 };
}

export async function fetchBatchesForFaculty(token: string | null, facultyId: string): Promise<Batch[]> {
  const response = await fetch(`${API_BASE_URL}/api/batches?facultyId=${facultyId}`, { headers: getAuthHeaders(token) });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch batches for faculty');
  return response.json();
}

export async function fetchOverallAttendanceReport(token: string | null): Promise<OverallReport> {
    const url = `${API_BASE_URL}/api/attendance/reports/overall`;
    const response = await fetch(url, { headers: getAuthHeaders(token) });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch overall report');
    return response.json();
}

export async function fetchFacultyAttendanceReport(token: string | null, facultyId: string): Promise<FacultyReport> {
    const url = `${API_BASE_URL}/api/attendance/reports/faculty/${facultyId}`;
    const response = await fetch(url, { headers: getAuthHeaders(token) });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch faculty report');
    return response.json();
}

export async function fetchBatchAttendanceReport( /* ... */ ): Promise<StudentAttendanceDetail> {
  const url = `${API_BASE_URL}/api/attendance/reports/batch/${batchId}?startDate=${params.startDate}&endDate=${params.endDate}`;
  const response = await fetch(url, { headers: getAuthHeaders(token) });
  if (!response.ok) throw new Error((await response.json()).error || 'No attendance data found for this batch');
  return response.json();
}

export async function fetchDailyAttendance( /* ... */ ): Promise<DailyAttendanceRecord[]> {
    const url = `${API_BASE_URL}/api/attendance/batch/${batchId}/daily?date=${date}`;
    const response = await fetch(url, { headers: getAuthHeaders(token) });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch daily attendance');
    return response.json();
}

export async function saveAttendance(token: string | null, payload: AttendancePayload): Promise<any> {
    const url = `${API_BASE_URL}/api/attendance`;
    const response = await fetch(url, { method: 'POST', headers: getAuthHeaders(token), body: JSON.stringify(payload) });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to save attendance');
    return response.json();
}

export async function fetchAllBatches(token: string | null): Promise<Batch[]> {
  const response = await fetch(`${API_BASE_URL}/api/batches`, { headers: getAuthHeaders(token) });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch batches');
  return response.json();
}

// Ensure the return type matches the backend response structure { students: Student[], count: number }
export async function fetchAllStudents(token: string | null): Promise<{ students: Student[], count: number }> {
  const response = await fetch(`${API_BASE_URL}/api/students`, { headers: getAuthHeaders(token) });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch students');
  // Assuming backend returns { students: [], count: 0 }
  return response.json();
}


export async function fetchAdminActiveStudentsCount(token: string | null): Promise<{ total_active_students: number }> {
    const response = await fetch(`${API_BASE_URL}/api/batches/active-students-count`, { headers: getAuthHeaders(token) });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch active students count');
    return response.json();
}

export async function fetchFacultyActiveStudents(token: string | null): Promise<FacultyActiveStudents[]> {
    const response = await fetch(`${API_BASE_URL}/api/faculty/active-students`, { headers: getAuthHeaders(token) });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch faculty active students');
    return response.json();
}