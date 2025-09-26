// client/hooks/useStudentData.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '@/lib/api';
import { toast } from 'sonner';
import type { Student, Batch, Faculty, StudentFormData } from '../types/studentManagement';

export function useStudentData() {
  const { token } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [studentsRes, batchesRes, facultiesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/students`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/batches`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/faculty`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const studentsData = await studentsRes.json();
      const batchesData = await batchesRes.json();
      const facultiesData = await facultiesRes.json();

      setStudents(studentsData.students || []);
      setBatches(Array.isArray(batchesData) ? batchesData : []);
      setFaculties(facultiesData || []);
    } catch (error) {
      toast.error("Failed to fetch page data.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const saveStudent = async (data: StudentFormData, studentId?: string) => {
    const isUpdating = !!studentId;
    try {
      const url = isUpdating ? `${API_BASE_URL}/api/students/${studentId}` : `${API_BASE_URL}/api/students`;
      const method = isUpdating ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error(`Failed to save student`);
      
      toast.success(`Student ${isUpdating ? "updated" : "created"} successfully`);
      fetchData(); // Refresh all data
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
      fetchData();
    } catch (error: any) {
      toast.error('Delete failed', { description: error.message });
    }
  };

  return { students, batches, faculties, loading, fetchData, saveStudent, deleteStudent };
}