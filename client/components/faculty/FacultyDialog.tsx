// client/components/faculty/FacultyDialog.tsx

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from '@/lib/api';
import { useAuth } from '../../hooks/AuthContext';
import { ScheduleEditor } from './ScheduleEditor';
import type { Faculty, Skill, User, FacultyFormData, WeeklySchedule, DaySchedule } from '../../types/facultyManagement';

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const createEmptyWeeklySchedule = (): WeeklySchedule => {
  return DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day] = { isAvailable: false, timeSlots: [] };
    return acc;
  }, {} as WeeklySchedule);
};

interface FacultyDialogProps {
  faculty?: Faculty;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: FacultyFormData, facultyId?: string) => Promise<boolean>;
  skills: Skill[];
  users: User[];
}

export function FacultyDialog({ faculty, open, onOpenChange, onSave, skills, users }: FacultyDialogProps) {
  const { token } = useAuth();
  const [formData, setFormData] = useState<FacultyFormData>({
    userId: "", name: "", email: "", phone: "",
    skillIds: [], schedule: createEmptyWeeklySchedule(),
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const initializeForm = async () => {
      if (!faculty) {
        setFormData({
          userId: "", name: "", email: "", phone: "",
          skillIds: [], schedule: createEmptyWeeklySchedule(),
        });
        return;
      }

      // Fetch fresh availability data for the specific faculty member
      try {
        const response = await fetch(`${API_BASE_URL}/api/availability/faculty/${faculty.id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to fetch availability');
        const availabilityData = await response.json();
        
        const newSchedule = createEmptyWeeklySchedule();
        availabilityData.forEach((slot: any) => {
          const day = slot.day_of_week.toLowerCase();
          if (newSchedule[day]) {
            newSchedule[day].isAvailable = true;
            newSchedule[day].timeSlots.push({ startTime: slot.start_time, endTime: slot.end_time });
          }
        });

        setFormData({
          userId: faculty.id, // In edit mode, userId is the faculty's own ID
          name: faculty.name, email: faculty.email, phone: faculty.phone_number || "",
          skillIds: faculty.skills.map(s => s.id),
          schedule: newSchedule,
        });

      } catch (error) {
        // Fallback if availability fetch fails
        setFormData({
          userId: faculty.id, name: faculty.name, email: faculty.email, phone: faculty.phone_number || "",
          skillIds: faculty.skills.map(s => s.id),
          schedule: createEmptyWeeklySchedule(),
        });
      }
    };
    if (open) initializeForm();
  }, [open, faculty, token]);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSave(formData, faculty?.id);
    setIsSaving(false);
    if (success) onOpenChange(false);
  };
  
  const handleUserChange = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setFormData(prev => ({ ...prev, userId: user.id, name: user.username }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader><DialogTitle>{faculty ? "Edit Faculty" : "Add New Faculty"}</DialogTitle><DialogDescription>{faculty ? "Update details, skills, and availability." : "Select a user to make them a faculty member."}</DialogDescription></DialogHeader>
        <div className="grid md:grid-cols-2 gap-8 py-4 overflow-y-auto pr-6">
          {/* Left Column: Details */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="user-select">Faculty User</Label>
              <Select onValueChange={handleUserChange} value={formData.userId} disabled={!!faculty}>
                <SelectTrigger id="user-select"><SelectValue placeholder="Select a user" /></SelectTrigger>
                <SelectContent>{users.map(user => (<SelectItem key={user.id} value={user.id}>{user.username}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Skills</Label>
              <Select onValueChange={(value) => { if (!formData.skillIds.includes(value)) { setFormData({ ...formData, skillIds: [...formData.skillIds, value] }); } }}>
                <SelectTrigger><SelectValue placeholder="Add skills..." /></SelectTrigger>
                <SelectContent>{skills.map(skill => (<SelectItem key={skill.id} value={skill.id}>{skill.name}</SelectItem>))}</SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2 pt-2">
                {formData.skillIds.map(skillId => {
                  const skill = skills.find(s => s.id === skillId);
                  return (
                    <Badge key={skillId} variant="secondary">{skill?.name}
                      <button type="button" className="ml-2" onClick={() => setFormData({ ...formData, skillIds: formData.skillIds.filter(id => id !== skillId) })}>&times;</button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Right Column: Schedule */}
          <ScheduleEditor schedule={formData.schedule} onChange={(schedule) => setFormData({ ...formData, schedule })} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}