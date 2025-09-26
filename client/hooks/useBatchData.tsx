// client/hooks/useBatchData.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '@/lib/api';
import { toast } from 'sonner';
import type { Batch, Faculty, Student } from '../types/batchManagement';

export function useBatchData() {
  const { token } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [batchesRes, facultiesRes, studentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/batches`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/faculty`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/students`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!batchesRes.ok) throw new Error('Failed to fetch batches');
      const batchesData = await batchesRes.json();
      setBatches(Array.isArray(batchesData) ? batchesData : []);

      if (!facultiesRes.ok) throw new Error('Failed to fetch faculties');
      const facultiesData = await facultiesRes.json();
      setFaculties(facultiesData);

      if (!studentsRes.ok) throw new Error('Failed to fetch students');
      const studentsData = await studentsRes.json();
      setAllStudents(studentsData.students || []);

    } catch (error: any) {
      toast.error('Failed to load page data', { description: error.message });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetchStudents = useCallback(async () => {
     try {
        const studentsRes = await fetch(`${API_BASE_URL}/api/students`, { headers: { Authorization: `Bearer ${token}` } });
        if (!studentsRes.ok) throw new Error('Failed to refresh students list');
        const studentsData = await studentsRes.json();
        setAllStudents(studentsData.students || []);
        toast.success("Student list refreshed!");
     } catch (error: any) {
        toast.error('Failed to refresh students', { description: error.message });
     }
  }, [token]);

  return { batches, faculties, allStudents, loading, refetchData: fetchData, refetchStudents };
}