// client/hooks/useBatchData.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '@/lib/api';
import { toast } from 'sonner';
// --- RESTORED Student type ---
import type { Batch, Faculty, Student, Skill } from '../types/batchManagement';

// --- NEW Helper to fetch all pages ---
async function fetchAllPaginatedStudents(token: string | null): Promise<Student[]> {
    if (!token) return [];
    let allStudents: Student[] = [];
    let page = 1;
    const limit = 200; // Fetch in batches of 200 (adjust if needed)
    let hasMore = true;

    console.log("Starting to fetch all students..."); // Add log

    while (hasMore) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/students?page=${page}&limit=${limit}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                console.error(`Failed to fetch page ${page} of students`);
                throw new Error(`Failed to fetch page ${page}`);
            }
            const data = await response.json();
            const studentsOnPage = data.students || [];
            const totalCount = data.count || 0;

            console.log(`Fetched page ${page}: ${studentsOnPage.length} students. Total expected: ${totalCount}`); // Add log

            if (studentsOnPage.length > 0) {
                allStudents = allStudents.concat(studentsOnPage);
            }

            // Check if we've fetched all students
            if (allStudents.length >= totalCount || studentsOnPage.length < limit) {
                hasMore = false;
            } else {
                page++;
            }
        } catch (error) {
            console.error("Error during paginated student fetch:", error);
            toast.error("Error Fetching Students", { description: "Could not load the complete student list." });
            hasMore = false; // Stop fetching on error
            // Optionally return partial data or empty array
            // return allStudents; // Return what we have so far
            return []; // Return empty on error
        }
    }
    console.log(`Finished fetching. Total students loaded: ${allStudents.length}`); // Add log
    return allStudents;
}
// ------------------------------------

export function useBatchData() {
  const { token } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  // --- RESTORED allStudents state ---
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    console.log("useBatchData: Starting initial data fetch..."); // Add log
    try {
      // Fetch non-student data first
      const [batchesRes, facultiesRes, skillsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/batches`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/faculty`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/skills`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!batchesRes.ok) throw new Error('Failed to fetch batches');
      const batchesData = await batchesRes.json();
      setBatches(Array.isArray(batchesData) ? batchesData : []);
      console.log("useBatchData: Fetched batches."); // Add log

      if (!facultiesRes.ok) throw new Error('Failed to fetch faculties');
      const facultiesData = await facultiesRes.json();
      setFaculties(facultiesData);
      console.log("useBatchData: Fetched faculties."); // Add log

      if (!skillsRes.ok) throw new Error('Failed to fetch skills');
      const skillsData = await skillsRes.json();
      setSkills(skillsData);
      console.log("useBatchData: Fetched skills."); // Add log

      // --- MODIFIED: Fetch ALL students using the helper ---
      const studentsData = await fetchAllPaginatedStudents(token);
      setAllStudents(studentsData);
      console.log(`useBatchData: Fetched ${studentsData.length} students.`); // Add log


    } catch (error: any) {
      toast.error('Failed to load page data', { description: error.message });
      setBatches([]);
      setFaculties([]);
      setAllStudents([]); // <-- Restore
      setSkills([]);
    } finally {
      setLoading(false);
      console.log("useBatchData: Initial data fetch complete."); // Add log
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- RESTORED refetchStudents function ---
  const refetchStudents = useCallback(async () => {
     console.log("useBatchData: Refetching students..."); // Add log
     toast.info("Refreshing student list...");
     try {
        // Use the same helper to ensure all students are fetched on refresh
        const studentsData = await fetchAllPaginatedStudents(token);
        setAllStudents(studentsData);
        toast.success(`Student list refreshed (${studentsData.length} loaded)!`);
     } catch (error: any) {
        toast.error('Failed to refresh students', { description: error.message });
     }
  }, [token]);

  // --- RESTORED allStudents and refetchStudents in return value ---
  return { batches, faculties, allStudents, skills, loading, refetchData: fetchData, refetchStudents };
}