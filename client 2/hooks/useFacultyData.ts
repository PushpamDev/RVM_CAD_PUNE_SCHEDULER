// client/hooks/useFacultyData.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '@/lib/api';
import { toast } from 'sonner';
import type { Faculty, Skill, User, FacultyFormData, AvailabilitySlot } from '../types/facultyManagement';

export function useFacultyData() {
  const { token } = useAuth();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [facultiesRes, skillsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/faculty`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/skills`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/users`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      
      const facultiesData = await facultiesRes.json();
      const skillsData = await skillsRes.json();
      const usersData = await usersRes.json();

      setFaculties(facultiesData || []);
      setSkills(skillsData || []);
      setUsers(usersData || []);

    } catch (error) {
      toast.error('Failed to fetch page data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveFaculty = async (data: FacultyFormData, facultyId?: string) => {
    const isUpdating = !!facultyId;
    
    const facultyPayload = isUpdating
      ? { name: data.name, email: data.email, phone_number: data.phone, skillIds: data.skillIds }
      : { userId: data.userId, email: data.email, phone_number: data.phone, skillIds: data.skillIds };

    const availabilityPayload = Object.entries(data.schedule)
      .filter(([, daySchedule]) => daySchedule.isAvailable && daySchedule.timeSlots.length > 0)
      .flatMap(([day, daySchedule]) =>
        daySchedule.timeSlots.map(slot => ({ day_of_week: day, start_time: slot.startTime, end_time: slot.endTime }))
      );

    try {
      const facultyUrl = isUpdating ? `${API_BASE_URL}/api/faculty/${facultyId}` : `${API_BASE_URL}/api/faculty`;
      const facultyMethod = isUpdating ? 'PUT' : 'POST';

      const facultyResponse = await fetch(facultyUrl, {
        method: facultyMethod,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(facultyPayload),
      });

      if (!facultyResponse.ok) {
        const err = await facultyResponse.json();
        throw new Error(err.message || 'Failed to save faculty details.');
      }

      const updatedOrNewFaculty = await facultyResponse.json();

      const availabilityResponse = await fetch(`${API_BASE_URL}/api/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ facultyId: updatedOrNewFaculty.id, availability: availabilityPayload }),
      });

      if (!availabilityResponse.ok) {
        throw new Error('Faculty saved, but failed to save availability.');
      }
      
      toast.success(`Faculty ${isUpdating ? 'updated' : 'added'} successfully!`);
      fetchData(); // Refresh all data
      return true; // Indicate success
    } catch (error: any) {
      toast.error('Save failed', { description: error.message });
      return false; // Indicate failure
    }
  };

  const deleteFaculty = async (facultyId: string) => {
    if (!confirm('Are you sure you want to delete this faculty member?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/faculty/${facultyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete faculty.');
      toast.success('Faculty deleted successfully!');
      fetchData(); // Refresh list
    } catch (error: any) {
      toast.error('Delete failed', { description: error.message });
    }
  };

  return { faculties, skills, users, loading, fetchData, saveFaculty, deleteFaculty };
}