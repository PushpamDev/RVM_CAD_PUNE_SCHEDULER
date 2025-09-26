// client/pages/FacultyManagementPage.tsx

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Edit, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "sonner";
import { useFacultyData } from '../hooks/useFacultyData';
import { FacultyDialog } from '../components/faculty/FacultyDialog';
import type { Faculty } from '../types/facultyManagement';

export default function FacultyManagementPage() {
  const { faculties, skills, users, loading, saveFaculty, deleteFaculty } = useFacultyData();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const availableUsers = useMemo(() => {
    const facultyUsernames = new Set(faculties.map(f => f.name));
    return users.filter(u => u.role !== 'admin' && !facultyUsernames.has(u.username));
  }, [users, faculties]);

  const filteredFaculty = useMemo(() => {
    if (!searchTerm) return faculties;
    const lowercasedTerm = searchTerm.toLowerCase();
    return faculties.filter(faculty =>
      faculty.name.toLowerCase().includes(lowercasedTerm) ||
      faculty.email.toLowerCase().includes(lowercasedTerm) ||
      faculty.skills.some(skill => skill.name.toLowerCase().includes(lowercasedTerm))
    );
  }, [searchTerm, faculties]);

  const handleAddFaculty = () => {
    setSelectedFaculty(undefined);
    setIsDialogOpen(true);
  };

  const handleEditFaculty = (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setIsDialogOpen(true);
  };
  
  const WeekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-6">
      <Toaster richColors />
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">Faculty Management</h1><p className="text-muted-foreground">Manage faculty members, their schedules, and teaching skills.</p></div>
        <Button onClick={handleAddFaculty}><Plus className="h-4 w-4 mr-2" />Add Faculty</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Faculty Members</CardTitle>
          <CardDescription>View, search, and manage all faculty in your institute.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, or skill..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <div className="text-sm text-muted-foreground">{filteredFaculty.length} of {faculties.length} faculty found</div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faculty</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-12 w-full" /></TableCell></TableRow>
                    ))
                ) : filteredFaculty.length > 0 ? (
                  filteredFaculty.map((faculty) => (
                    <TableRow key={faculty.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-medium">{faculty.name}</div>
                            <div className="text-sm text-muted-foreground">{faculty.phone_number}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><div className="flex flex-wrap gap-1 max-w-xs">{faculty.skills.map((skill) => (<Badge key={skill.id} variant="outline">{skill.name}</Badge>))}</div></TableCell>
                      <TableCell>
                        <TooltipProvider delayDuration={100}>
                          <div className="flex flex-wrap gap-1">
                            {WeekDays.map(day => {
                              const daySlots = faculty.availability.filter(a => a.day_of_week.toLowerCase().startsWith(day.toLowerCase()));
                              const isAvailable = daySlots.length > 0;
                              return (
                                <Tooltip key={day}>
                                  <TooltipTrigger asChild>
                                    <Badge variant={isAvailable ? "default" : "outline"} className="w-9 justify-center cursor-default">{day}</Badge>
                                  </TooltipTrigger>
                                  {isAvailable && <TooltipContent><p className="text-sm">{daySlots.map(s => `${s.start_time} - ${s.end_time}`).join(', ')}</p></TooltipContent>}
                                </Tooltip>
                              );
                            })}
                          </div>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditFaculty(faculty)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteFaculty(faculty.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No faculty members found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <FacultyDialog
        faculty={selectedFaculty}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={saveFaculty}
        skills={skills}
        users={selectedFaculty ? users : availableUsers} // Pass all users if editing, only available if creating
      />
    </div>
  );
}