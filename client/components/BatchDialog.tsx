// client/components/BatchDialog.tsx

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import { 
  type Batch, 
  type BatchFormData, 
  type Faculty, 
  type Skill, 
  type Student, 
  BATCH_STATUSES // --- FIX: The missing constant is now imported ---
} from '../types/batchManagement';

interface BatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch?: Batch;
  faculties: Faculty[];
  allStudents: Student[];
  onSave: (data: BatchFormData) => void;
  onStudentAdded: () => void;
}

export function BatchDialog({ open, onOpenChange, batch, faculties, allStudents, onSave, onStudentAdded }: BatchDialogProps) {
  const [formData, setFormData] = useState<BatchFormData>({
    name: "", description: "", startDate: "", endDate: "", startTime: "", endTime: "",
    facultyId: "", skillId: "", maxStudents: 15, status: "Upcoming",
    studentIds: [], daysOfWeek: [],
  });
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentAdmissionNumber, setNewStudentAdmissionNumber] = useState("");
  const [newStudentPhoneNumber, setNewStudentPhoneNumber] = useState("");
  const [newStudentRemarks, setNewStudentRemarks] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  useEffect(() => {
    if (batch) {
      setFormData({
        name: batch.name,
        description: batch.description || "",
        startDate: batch.start_date ? new Date(batch.start_date).toISOString().split('T')[0] : "",
        endDate: batch.end_date ? new Date(batch.end_date).toISOString().split('T')[0] : "",
        startTime: batch.start_time || "",
        endTime: batch.end_time || "",
        facultyId: batch.faculty?.id || "",
        skillId: batch.skill?.id || "",
        maxStudents: batch.max_students || 15,
        status: batch.status,
        studentIds: batch.students?.map(s => s.id) || [],
        daysOfWeek: batch.days_of_week || [],
      });
    } else {
      setFormData({
        name: "", description: "", startDate: "", endDate: "", startTime: "", endTime: "",
        facultyId: "", skillId: "", maxStudents: 15, status: "Upcoming",
        studentIds: [], daysOfWeek: [],
      });
    }
  }, [batch]);

  useEffect(() => {
    const fetchSkillsData = async () => {
      setIsLoading(true);
      try {
        const skillsRes = await fetch(`${API_BASE_URL}/api/skills`);
        const skillsData = await skillsRes.json();
        setSkills(Array.isArray(skillsData) ? skillsData : []);
      } catch (error) {
        setSkills([]);
      } finally {
        setIsLoading(false);
      }
    };
    if (open) fetchSkillsData();
  }, [open]);

  useEffect(() => {
    if (batch && skills.length > 0) {
      const batchSkill = skills.find((skill) => skill.id === batch.skill?.id);
      if (batchSkill) {
        setFormData((prev) => ({ ...prev, skillId: batchSkill.id }));
      }
    }
  }, [batch, skills]);

  const handleAddStudent = async () => {
    if (!newStudentName.trim() || !newStudentAdmissionNumber.trim()) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStudentName,
          admission_number: newStudentAdmissionNumber,
          phone_number: newStudentPhoneNumber,
          remarks: newStudentRemarks,
        }),
      });
      if (response.ok) {
        onStudentAdded();
        setNewStudentName("");
        setNewStudentAdmissionNumber("");
        setNewStudentPhoneNumber("");
        setNewStudentRemarks("");
      } else {
        console.error("Failed to add student");
      }
    } catch (error) {
      console.error("Error adding student:", error);
    }
  };

  const handleStudentToggle = (studentId: string) => {
    setFormData(prev => ({ ...prev, studentIds: prev.studentIds.includes(studentId) ? prev.studentIds.filter(id => id !== studentId) : [...prev.studentIds, studentId] }));
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({ ...prev, daysOfWeek: prev.daysOfWeek.includes(day) ? prev.daysOfWeek.filter(d => d !== day) : [...prev.daysOfWeek, day] }));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'startTime' | 'endTime') => {
    const val = e.target.value;
    let digits = val.replace(/[^0-9]/g, '');

    if (digits.length > 4) {
      digits = digits.substring(0, 4);
    }

    let formattedValue = digits;
    if (digits.length > 2) {
      formattedValue = `${digits.substring(0, 2)}:${digits.substring(2)}`;
    }
    
    setFormData({ ...formData, [field]: formattedValue });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.skillId) {
      toast.error("Please select a skill before saving.");
      return;
    }
    onSave(formData);
  };
  
  const selectedFaculty = faculties.find(f => f.id === formData.facultyId);
  const availableSkills = selectedFaculty ? selectedFaculty.skills : skills;

  const filteredStudents = allStudents.filter(student =>
    student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.admission_number.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{batch ? "Edit Batch" : "Create New Batch"}</DialogTitle>
          <DialogDescription>{batch ? "Update batch information." : "Create a new batch."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Batch Name</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxStudents">Max Students</Label>
              <Input id="maxStudents" type="number" min="1" value={formData.maxStudents} onChange={(e) => setFormData({ ...formData, maxStudents: parseInt(e.target.value) || 15 })} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Enter batch description..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input id="startTime" type="text" placeholder="HH:MM" value={formData.startTime} onChange={(e) => handleTimeChange(e, 'startTime')} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input id="endTime" type="text" placeholder="HH:MM" value={formData.endTime} onChange={(e) => handleTimeChange(e, 'endTime')} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="faculty">Faculty</Label>
              <Select value={formData.facultyId} onValueChange={(value) => setFormData({ ...formData, facultyId: value, skillId: "" })} disabled={isLoading || faculties.length === 0}>
                <SelectTrigger><SelectValue placeholder={isLoading ? "Loading faculties..." : "Select faculty"} /></SelectTrigger>
                <SelectContent>{faculties.filter(f => f.isActive).map((faculty) => (<SelectItem key={faculty.id} value={faculty.id}>{faculty.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill">Skill/Subject</Label>
              <Select
                value={formData.skillId}
                onValueChange={(value) => setFormData({ ...formData, skillId: value })}
                disabled={isLoading || !formData.facultyId || availableSkills.length === 0}
                required
              >
                <SelectTrigger><SelectValue placeholder={isLoading ? "Loading skills..." : "Select skill"} /></SelectTrigger>
                <SelectContent>{availableSkills.map((skill) => (<SelectItem key={skill.id} value={skill.id}>{skill.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BATCH_STATUSES.map((status) => (<SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Days of Week</Label>
            <div className="flex flex-wrap gap-4 pt-2">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox id={`day-${day}`} checked={formData.daysOfWeek.includes(day)} onCheckedChange={() => handleDayToggle(day)} />
                  <Label htmlFor={`day-${day}`} className="font-normal">{day}</Label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Students</Label>
            <Input placeholder="Search students..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="mb-2" />
            <div className="max-h-64 overflow-y-auto rounded-md border p-2">
              {filteredStudents.map((student) => (
                <div key={student.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md">
                  <Checkbox id={`student-${student.id}`} checked={formData.studentIds.includes(student.id)} onCheckedChange={() => handleStudentToggle(student.id)} />
                  <Label htmlFor={`student-${student.id}`} className="font-normal w-full">{student.name} ({student.admission_number})</Label>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 border rounded-md grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
                <Input className="lg:col-span-1" placeholder="New Student Name" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} />
                <Input className="lg:col-span-1" placeholder="Admission No." value={newStudentAdmissionNumber} onChange={(e) => setNewStudentAdmissionNumber(e.target.value)} />
                <Input className="lg:col-span-1" placeholder="Phone No." value={newStudentPhoneNumber} onChange={(e) => setNewStudentPhoneNumber(e.target.value)} />
                <Input className="lg:col-span-1" placeholder="Remarks" value={newStudentRemarks} onChange={(e) => setNewStudentRemarks(e.target.value)} />
                <Button type="button" className="lg:col-span-1" onClick={handleAddStudent} disabled={!newStudentName || !newStudentAdmissionNumber}>Add</Button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{batch ? "Update Batch" : "Create Batch"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}