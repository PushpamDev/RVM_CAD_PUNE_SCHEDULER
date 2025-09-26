// client/components/BatchFormWizard.tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { API_BASE_URL } from '@/lib/api';
import { 
  type Batch, 
  type BatchFormData, 
  type Faculty, 
  type Skill, 
  type Student,
  BATCH_STATUSES
} from '../types/batchManagement.ts';

interface BatchWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch?: Batch;
  faculties: Faculty[];
  allStudents: Student[];
  onSave: (data: BatchFormData) => void;
  onStudentAdded: () => void;
}

export function BatchFormWizard({ open, onOpenChange, onSave, batch, faculties, allStudents, onStudentAdded }: BatchWizardProps) {
  const [step, setStep] = useState(1);
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
        name: batch.name, description: batch.description || "",
        startDate: batch.start_date ? new Date(batch.start_date).toISOString().split('T')[0] : "",
        endDate: batch.end_date ? new Date(batch.end_date).toISOString().split('T')[0] : "",
        startTime: batch.start_time || "", endTime: batch.end_time || "",
        facultyId: batch.faculty?.id || "", skillId: batch.skill?.id || "",
        maxStudents: batch.max_students || 15, status: batch.status,
        studentIds: batch.students?.map(s => s.id) || [], daysOfWeek: batch.days_of_week || [],
      });
    } else {
      setFormData({
        name: "", description: "", startDate: "", endDate: "", startTime: "", endTime: "",
        facultyId: "", skillId: "", maxStudents: 15, status: "Upcoming",
        studentIds: [], daysOfWeek: [],
      });
    }
  }, [batch, open]);

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

  const handleAddStudent = async () => {
    if (!newStudentName.trim() || !newStudentAdmissionNumber.trim()) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/students`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStudentName, admission_number: newStudentAdmissionNumber,
          phone_number: newStudentPhoneNumber, remarks: newStudentRemarks,
        }),
      });
      if (response.ok) {
        onStudentAdded();
        setNewStudentName(""); setNewStudentAdmissionNumber("");
        setNewStudentPhoneNumber(""); setNewStudentRemarks("");
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

  const selectedFaculty = faculties.find(f => f.id === formData.facultyId);
  const availableSkills = selectedFaculty ? selectedFaculty.skills : skills;

  const filteredStudents = allStudents.filter(student =>
    student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.admission_number.toLowerCase().includes(studentSearch.toLowerCase())
  );
  
  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{batch ? "Edit Batch" : "Create New Batch"} (Step {step} of 3)</DialogTitle>
          <DialogDescription>
            {step === 1 && "Start with the basic details for the new batch."}
            {step === 2 && "Set the schedule, timing, and assign a faculty member."}
            {step === 3 && "Finally, enroll students in the batch."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4 overflow-y-auto flex-1 pr-6">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in-50">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="name">Batch Name</Label><Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
                <div className="space-y-2"><Label htmlFor="maxStudents">Max Students</Label><Input id="maxStudents" type="number" min="1" value={formData.maxStudents} onChange={e => setFormData({ ...formData, maxStudents: parseInt(e.target.value) || 15 })} required /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Enter batch description..." /></div>
              <div className="space-y-2"><Label htmlFor="status">Status</Label><Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{BATCH_STATUSES.map((status) => (<SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>))}</SelectContent></Select></div>
            </div>
          )}
          
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in-50">
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="startDate">Start Date</Label><Input id="startDate" type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} required /></div><div className="space-y-2"><Label htmlFor="endDate">End Date</Label><Input id="endDate" type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} required /></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="startTime">Start Time</Label><Input id="startTime" type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} required /></div><div className="space-y-2"><Label htmlFor="endTime">End Time</Label><Input id="endTime" type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} required /></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="faculty">Faculty</Label><Select value={formData.facultyId} onValueChange={(value) => setFormData({ ...formData, facultyId: value, skillId: "" })} disabled={isLoading || faculties.length === 0}><SelectTrigger><SelectValue placeholder={isLoading ? "Loading..." : "Select faculty"} /></SelectTrigger><SelectContent>{faculties.filter(f => f.isActive).map((faculty) => (<SelectItem key={faculty.id} value={faculty.id}>{faculty.name}</SelectItem>))}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="skill">Skill/Subject</Label><Select value={formData.skillId} onValueChange={(value) => setFormData({ ...formData, skillId: value })} disabled={!formData.facultyId || availableSkills.length === 0}><SelectTrigger><SelectValue placeholder={!formData.facultyId ? "Select faculty first" : "Select skill"} /></SelectTrigger><SelectContent>{availableSkills.map((skill) => (<SelectItem key={skill.id} value={skill.id}>{skill.name}</SelectItem>))}</SelectContent></Select></div></div>
              <div className="space-y-2"><Label>Days of Week</Label><div className="flex flex-wrap gap-4 pt-2">{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (<div key={day} className="flex items-center space-x-2"><Checkbox id={`day-${day}`} checked={formData.daysOfWeek.includes(day)} onCheckedChange={() => handleDayToggle(day)} /><Label htmlFor={`day-${day}`} className="font-normal">{day}</Label></div>))}</div></div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in-50">
              <div className="space-y-2"><Label>Students</Label><Input placeholder="Search students by name or admission number..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="mb-2" />
                <div className="max-h-64 overflow-y-auto rounded-md border p-2">
                  {filteredStudents.map((student) => (
                    <div key={student.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md">
                      <Checkbox id={`student-${student.id}`} checked={formData.studentIds.includes(student.id)} onCheckedChange={() => handleStudentToggle(student.id)} />
                      <Label htmlFor={`student-${student.id}`} className="font-normal w-full">{student.name} ({student.admission_number})</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 p-4 border rounded-md grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 items-end">
                <div className="space-y-1 lg:col-span-1"><Label className="text-xs">New Student Name</Label><Input placeholder="Name" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} /></div>
                <div className="space-y-1 lg:col-span-1"><Label className="text-xs">Admission No.</Label><Input placeholder="Admission No." value={newStudentAdmissionNumber} onChange={(e) => setNewStudentAdmissionNumber(e.target.value)} /></div>
                <div className="space-y-1 lg:col-span-1"><Label className="text-xs">Phone No.</Label><Input placeholder="Phone No." value={newStudentPhoneNumber} onChange={(e) => setNewStudentPhoneNumber(e.target.value)} /></div>
                <div className="space-y-1 lg:col-span-1"><Label className="text-xs">Remarks</Label><Input placeholder="Remarks" value={newStudentRemarks} onChange={(e) => setNewStudentRemarks(e.target.value)} /></div>
                <Button type="button" className="lg:col-span-1" onClick={handleAddStudent} disabled={!newStudentName || !newStudentAdmissionNumber}>Add Student</Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-auto border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <div className="flex gap-2">
              {step > 1 && <Button type="button" variant="outline" onClick={handleBack}>Back</Button>}
              {step < 3 ? <Button type="button" onClick={handleNext}>Next</Button> : <Button type="button" onClick={handleSubmit}>Save Batch</Button>}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}