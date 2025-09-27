// client/pages/BatchManagement.tsx

import React, { useState, useMemo, useEffect } from "react";
import { MoreVertical, Plus, Trash2, UserCheck, Users, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Toaster, toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL } from "@/lib/api";
import { useAuth } from "../hooks/AuthContext";
import { useBatchData } from '../hooks/useBatchData';
import { BatchDialog } from '../components/BatchDialog';
import { StudentListDialog } from '../components/StudentListDialog.tsx';
import { AttendanceDialog } from "../components/AttendanceDialog";
import { BatchTable } from "../components/BatchTable";
import type { Batch, BatchFormData, Student } from '../types/batchManagement';

// --- Helper Functions ---

const formatDisplayDate = (dateString: string): string => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC', 
    };
    return new Intl.DateTimeFormat('en-GB', options).format(date).replace(/ /g, '/');
  } catch (error) {
    return "Invalid Date";
  }
};

const isFeePending = (remark: string): boolean => {
  if (!remark) return false;
  const lowerCaseRemark = remark.toLowerCase().trim().replace(/\s/g, "");
  if (lowerCaseRemark.includes("fullpaid")) return false;
  const dateRegex = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/;
  const match = remark.match(dateRegex);
  let parsedDate;
  if (match) {
    const [_, day, month, year] = match;
    parsedDate = new Date(`${year}-${month}-${day}`);
  } else {
    let dateString = remark.toLowerCase().trim().replace(/(st|nd|rd|th)/, "");
    if (!/\d{4}/.test(dateString)) dateString += ` ${new Date().getFullYear()}`;
    parsedDate = new Date(dateString);
  }
  if (isNaN(parsedDate.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsedDate.setHours(0, 0, 0, 0);
  return parsedDate <= today;
};

// --- Main Component ---

export default function BatchManagement() {
  const { user, token } = useAuth();
  const { batches, faculties, allStudents, skills, loading, refetchData, refetchStudents } = useBatchData();
  
  // Dialog States
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [isStudentListOpen, setIsStudentListOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  
  // Data State for Dialogs
  const [selectedBatch, setSelectedBatch] = useState<Batch | undefined>(undefined);
  const [studentsOfSelectedBatch, setStudentsOfSelectedBatch] = useState<Student[]>([]);
  const [selectedBatchForAttendance, setSelectedBatchForAttendance] = useState<Batch | null>(null);

  // Filter & Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const BATCHES_PER_PAGE = 10;

  // --- Filter Logic ---
  const filteredBatches = useMemo(() => {
    if (!user) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let processedBatches = [...batches];
  
    if (user.role === 'faculty') {
      processedBatches = processedBatches.filter(batch => {
        const startDate = new Date(batch.start_date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(batch.end_date);
        endDate.setHours(0, 0, 0, 0);
        return batch.faculty_id === user.id && today >= startDate && today <= endDate;
      });
      if (selectedDate) {
        processedBatches = processedBatches.filter(batch => {
          const filterDate = new Date(selectedDate);
          filterDate.setHours(0, 0, 0, 0);
          const batchStartDate = new Date(batch.start_date);
          batchStartDate.setHours(0, 0, 0, 0);
          const batchEndDate = new Date(batch.end_date);
          batchEndDate.setHours(0, 0, 0, 0);
          const dayOfWeek = filterDate.toLocaleDateString('en-US', { weekday: 'long' });
          return filterDate >= batchStartDate && filterDate <= batchEndDate && batch.days_of_week.includes(dayOfWeek);
        });
      }
      if (searchTerm) {
        processedBatches = processedBatches.filter(batch => batch.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      return processedBatches.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
  
    if (user.role === 'admin') {
      if (statusFilter !== 'all') {
        processedBatches = processedBatches.filter(batch => {
          const startDate = new Date(batch.start_date);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(batch.end_date);
          endDate.setHours(0, 0, 0, 0);
          if (statusFilter === 'active') return today >= startDate && today <= endDate;
          if (statusFilter === 'upcoming') return today < startDate;
          if (statusFilter === 'completed') return today > endDate;
          return false;
        });
      }
      if (selectedFaculty !== 'all') {
        processedBatches = processedBatches.filter(batch => batch.faculty_id === selectedFaculty);
      }
      if (selectedDate) {
        processedBatches = processedBatches.filter(batch => new Date(batch.start_date) <= new Date(selectedDate) && new Date(batch.end_date) >= new Date(selectedDate));
      }
      if (searchTerm) {
        processedBatches = processedBatches.filter(batch => batch.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      return processedBatches;
    }
    return [];
  }, [batches, user, searchTerm, selectedDate, selectedFaculty, statusFilter]);

  const totalPages = Math.ceil(filteredBatches.length / BATCHES_PER_PAGE);
  const paginatedBatches = filteredBatches.slice((currentPage - 1) * BATCHES_PER_PAGE, currentPage * BATCHES_PER_PAGE);

  // --- Action Handlers ---

  const handleOpenEditDialog = (batch: Batch) => {
    setSelectedBatch(batch);
    setIsBatchDialogOpen(true);
  };
  
  const handleOpenCreateDialog = () => {
    setSelectedBatch(undefined);
    setIsBatchDialogOpen(true);
  };

  const handleSaveBatch = async (data: BatchFormData) => {
    const url = selectedBatch ? `${API_BASE_URL}/api/batches/${selectedBatch.id}` : `${API_BASE_URL}/api/batches`;
    const method = selectedBatch ? 'PUT' : 'POST';
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to save batch.');
      }
      toast.success(`Batch ${selectedBatch ? 'updated' : 'created'} successfully!`);
      refetchData();
      setIsBatchDialogOpen(false);
    } catch (error: any) {
      toast.error('Save Failed', { description: error.message });
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm("Are you sure you want to delete this batch? This action cannot be undone.")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/batches/${batchId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete batch");
      toast.success("Batch deleted successfully!");
      refetchData();
    } catch (error: any) {
      toast.error("Delete Failed", { description: error.message });
    }
  };
  
  const handleViewStudents = async (batch: Batch) => {
    setSelectedBatch(batch);
    try {
      const response = await fetch(`${API_BASE_URL}/api/batches/${batch.id}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const studentsInBatch = await response.json();
      const studentsWithFullDetails = studentsInBatch.map((student: Student) => {
        const fullDetails = allStudents.find(s => s.id === student.id);
        return { ...student, ...fullDetails };
      });
      setStudentsOfSelectedBatch(studentsWithFullDetails);
      setIsStudentListOpen(true);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const handleUpdateRemarks = async (studentId: string, remarks: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/students/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ remarks }),
      });
      if (!response.ok) throw new Error("Failed to update remarks");
      toast.success("Remarks updated successfully");
      // Optimistically update UI
      setStudentsOfSelectedBatch(prev => prev.map(s => s.id === studentId ? { ...s, remarks } : s));
      refetchStudents();
    } catch (error: any) {
      toast.error("Update Failed", { description: error.message });
    }
  };
  
  const handleMarkAttendance = async (batch: Batch) => {
    setSelectedBatchForAttendance(batch);
    // Logic to fetch students for this batch and open attendance dialog
    setIsAttendanceDialogOpen(true);
  };

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getStatusVariant = (status: Batch['status']): "default" | "secondary" | "outline" => {
    if (status === 'active') return 'default';
    if (status === 'upcoming') return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      <Toaster richColors />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Batch Management</h1>
          <p className="text-muted-foreground">Search, filter, and manage all institute batches.</p>
        </div>
        {user?.role === "admin" && (
          <Button onClick={handleOpenCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />Add New Batch
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>All Batches</CardTitle>
              <CardDescription>Use the filters to narrow down your search.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <Input placeholder="Search batch..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-auto flex-grow"/>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full sm:w-auto"/>
              {user?.role === "admin" && (
              <>
                <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
                  <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by Faculty" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Faculties</SelectItem>
                    {faculties.map((f) => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <BatchTable
                batches={paginatedBatches}
                loading={loading}
                filters={{ searchTerm, selectedDate, selectedFaculty, statusFilter }}
                allStudents={allStudents}
                onEditBatch={handleOpenEditDialog}
                onDeleteBatch={handleDeleteBatch}
                onUpdateRemarks={handleUpdateRemarks}
                onAttendanceMarked={refetchData}
            />
            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }} aria-disabled={currentPage === 1} tabIndex={currentPage === 1 ? -1 : undefined} className={currentPage === 1 ? "pointer-events-none opacity-50" : ""} /></PaginationItem>
                    {[...Array(totalPages)].map((_, i) => (<PaginationItem key={i}><PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(i + 1); }} isActive={currentPage === i + 1}>{i + 1}</PaginationLink></PaginationItem>))}
                    <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }} aria-disabled={currentPage === totalPages} tabIndex={currentPage === totalPages ? -1 : undefined} className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""} /></PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
        </CardContent>
      </Card>
      
      {isBatchDialogOpen && (
        <BatchDialog
            open={isBatchDialogOpen}
            onOpenChange={setIsBatchDialogOpen}
            onSave={handleSaveBatch}
            batch={selectedBatch}
            faculties={faculties}
            allStudents={allStudents}
            onStudentAdded={refetchStudents}
        />
      )}

      {isStudentListOpen && selectedBatch && (
        <StudentListDialog
          open={isStudentListOpen}
          onOpenChange={setIsStudentListOpen}
          batchName={selectedBatch.name}
          students={studentsOfSelectedBatch}
          onUpdateRemarks={handleUpdateRemarks}
        />
      )}

      {isAttendanceDialogOpen && selectedBatchForAttendance && (
        <AttendanceDialog
          open={isAttendanceDialogOpen}
          onOpenChange={setIsAttendanceDialogOpen}
          batch={selectedBatchForAttendance}
          students={studentsOfSelectedBatch} // Assuming you fetch the right students
          onAttendanceMarked={() => {
            setIsAttendanceDialogOpen(false);
            refetchData();
          }}
          isFeePending={isFeePending}
        />
      )}
    </div>
  );
}