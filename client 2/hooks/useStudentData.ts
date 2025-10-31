// client/hooks/useStudentData.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '@/lib/api';
import { toast } from 'sonner';
// Ensure 'FacultyStudentCount' is in your types file
import type { Student, Faculty, StudentFormData, Batch, FacultyStudentCount } from '../types/studentManagement';

/**
 * Fetches the batches for a *single* student.
 * This is used for the "View Batches" dialog.
 */
export function useStudentBatches(studentId: string) {
  const { token } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudentBatches = useCallback(async () => {
    if (!token || !studentId) {
      setBatches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/students/${studentId}/batches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch student's batches.");
      const batchesData = await response.json();
      setBatches(batchesData.batches || []);
    } catch (error: any) {
      toast.error("Failed to fetch student's batches.", { description: error.message });
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [studentId, token]);

  useEffect(() => {
    if (studentId) {
      fetchStudentBatches();
    }
  }, [studentId, fetchStudentBatches]);

  return { batches, loading, refetch: fetchStudentBatches };
}


/**
 * **UPDATED HOOK**
 * Manages the main student list, including server-side filtering,
 * pagination, and faculty data for the dropdowns.
 */
export function useStudentData() {
  const { token } = useAuth();

  // --- State for Student List & Pagination ---
  const [students, setStudents] = useState<Student[]>([]);
  const [totalCount, setTotalCount] = useState(0); // For pagination
  const [loading, setLoading] = useState(true);

  // --- State for Filters (now managed by the hook) ---
  const [searchTerm, setSearchTerm] = useState("");
  const [facultyFilter, setFacultyFilter] = useState<string>("all");
  const [feePendingFilter, setFeePendingFilter] = useState<boolean>(false);
  const [unassignedFilter, setUnassignedFilter] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const STUDENTS_PER_PAGE = 200; // You can adjust this

  // --- State for Dropdown Data ---
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [facultyCounts, setFacultyCounts] = useState<FacultyStudentCount[]>([]);

  // --- Data Fetching for Students (runs when filters change) ---
  const fetchStudents = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    // Build query parameters from the filter state
    const params = new URLSearchParams();
    params.set('page', String(currentPage));
    params.set('limit', String(STUDENTS_PER_PAGE));

    if (searchTerm) {
      params.set('search', searchTerm);
    }
    if (facultyFilter !== 'all') {
      params.set('faculty_id', facultyFilter);
    }
    if (feePendingFilter) {
      params.set('fee_pending', 'true');
    }
    if (unassignedFilter) {
      params.set('unassigned', 'true');
    }

    try {
      // Fetch students using the built query string
      const response = await fetch(`${API_BASE_URL}/api/students?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch students.");
      
      const data = await response.json();
      
      setStudents(data.students || []);
      setTotalCount(data.count || 0); // Set total count for pagination

    } catch (error: any) {
      toast.error("Failed to fetch students.", { description: error.message });
    } finally {
      setLoading(false);
    }
    // This hook re-runs whenever any filter value changes
  }, [token, currentPage, searchTerm, facultyFilter, feePendingFilter, unassignedFilter, STUDENTS_PER_PAGE]);

  // --- Data Fetching for Dropdowns (runs only once on mount) ---
  const fetchFacultyData = useCallback(async () => {
    if (!token) return;
    try {
      const [facultiesRes, countsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/faculty`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/faculty/student-counts`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!facultiesRes.ok) throw new Error('Failed to fetch faculties');
      if (!countsRes.ok) throw new Error('Failed to fetch faculty counts');

      const facultiesData = await facultiesRes.json();
      const countsData = await countsRes.json();
      
      setFaculties(facultiesData || []);
      setFacultyCounts(countsData || []);
    } catch (error: any) {
      toast.error("Failed to fetch faculty data.", { description: error.message });
    }
  }, [token]);

  // --- Effects to trigger fetches ---
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]); // Runs when filters change

  useEffect(() => {
    fetchFacultyData();
  }, [fetchFacultyData]); // Runs once on mount

  
  // --- CRUD Operations ---
  const saveStudent = async (data: StudentFormData, studentId?: string): Promise<boolean> => {
    const isUpdating = !!studentId;
    try {
      const url = isUpdating ? `${API_BASE_URL}/api/students/${studentId}` : `${API_BASE_URL}/api/students`;
      const method = isUpdating ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Failed to save student`);
      
      toast.success(`Student ${isUpdating ? "updated" : "created"} successfully`);
      fetchStudents(); // Refetch current student list
      fetchFacultyData(); // Also refetch counts (in case a student was added/removed)
      return true;
    } catch (error: any) {
      toast.error('Save failed', { description: error.message });
      return false;
    }
  };

  const deleteStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/students/${studentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete student");
      toast.success("Student deleted successfully");
      fetchStudents(); // Refetch current student list
      fetchFacultyData(); // Also refetch counts
    } catch (error: any) {
      toast.error('Delete failed', { description: error.message });
    }
  };

  // --- Return all state and setters ---
  return { 
    // Data
    students,
    totalCount,
    loading,
    faculties, 
    facultyCounts,

    // CRUD Actions
    saveStudent,
    deleteStudent,

    // Filter values
    searchTerm,
    facultyFilter,
    feePendingFilter,
    unassignedFilter,
    
    // Filter setters (Component will call these)
    setSearchTerm,
    setFacultyFilter,
    setFeePendingFilter,
    setUnassignedFilter,

    // Pagination
    currentPage,
    setCurrentPage,
    STUDENTS_PER_PAGE,
  };
}