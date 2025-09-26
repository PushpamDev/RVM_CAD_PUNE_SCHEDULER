// client/components/BatchTable.tsx

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { MoreVertical, Users, UserCheck, Edit, Trash2, SearchX } from "lucide-react";
import { useAuth } from '../hooks/AuthContext';
import { StudentListDialog } from './StudentListDialog';
import { AttendanceDialog } from './AttendanceDialog';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';
import type { Batch, Student } from '../types/batchManagement';

// --- Helper Functions ---
const formatDisplayDate = (dateString: string): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
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

const getDynamicBatchStatus = (startDateStr: string, endDateStr: string): "active" | "upcoming" | "completed" => {
  if (!startDateStr || !endDateStr) return "upcoming";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  try {
    const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    if (today < startDate) return "upcoming";
    if (today > endDate) return "completed";
    return "active";
  } catch (error) {
    return "upcoming";
  }
};

// --- Props Interface ---
interface BatchTableProps {
  batches: Batch[];
  loading: boolean;
  filters: { searchTerm: string; selectedDate: string; selectedFaculty: string; statusFilter: string };
  allStudents: Student[];
  onEditBatch: (batch: Batch) => void;
  onDeleteBatch: (batchId: string) => void;
  onUpdateRemarks: (studentId: string, remarks: string) => void;
  onAttendanceMarked: () => void;
}

export function BatchTable({ batches, loading, filters, allStudents, onEditBatch, onDeleteBatch, onUpdateRemarks, onAttendanceMarked }: BatchTableProps) {
    const { user, token } = useAuth();
    const [currentPage, setCurrentPage] = useState(1);
    
    const [studentListBatch, setStudentListBatch] = useState<Batch | null>(null);
    const [attendanceBatch, setAttendanceBatch] = useState<Batch | null>(null);
    const [studentsForAttendance, setStudentsForAttendance] = useState<Student[]>([]);

    const BATCHES_PER_PAGE = 10;

    const getStatusVariant = (status: "active" | "upcoming" | "completed"): "default" | "secondary" | "outline" => {
        if (status === 'active') return 'default';
        if (status === 'upcoming') return 'secondary';
        return 'outline';
    };
    
    const filteredBatches = useMemo(() => {
        if (!user) return [];
        let processedBatches = [...batches];
        if (user.role === 'admin') {
            if (filters.statusFilter !== 'all') {
                processedBatches = processedBatches.filter(batch => getDynamicBatchStatus(batch.start_date, batch.end_date) === filters.statusFilter);
            }
            if (filters.selectedFaculty !== 'all') {
                processedBatches = processedBatches.filter(batch => batch.faculty_id === filters.selectedFaculty);
            }
        }
        if (filters.selectedDate) {
            processedBatches = processedBatches.filter(batch => new Date(batch.start_date) <= new Date(filters.selectedDate) && new Date(batch.end_date) >= new Date(filters.selectedDate));
        }
        if (filters.searchTerm) {
            processedBatches = processedBatches.filter(batch => batch.name.toLowerCase().includes(filters.searchTerm.toLowerCase()));
        }
        return processedBatches;
    }, [batches, filters, user]);
    
    const totalPages = Math.ceil(filteredBatches.length / BATCHES_PER_PAGE);
    const paginatedBatches = filteredBatches.slice((currentPage - 1) * BATCHES_PER_PAGE, currentPage * BATCHES_PER_PAGE);

    const handlePageChange = (page: number) => {
        if (page > 0 && page <= totalPages) setCurrentPage(page);
    };
    
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
    }, [filters, currentPage, totalPages]);

    const getStudentsForListView = (batch: Batch): Student[] => {
        return batch.students.map(studentInBatch => {
            const fullDetails = allStudents.find(s => s.id === studentInBatch.id);
            return { ...studentInBatch, ...fullDetails };
        }).filter(Boolean) as Student[];
    };

    const handleMarkAttendanceClick = (batch: Batch) => {
        const students = getStudentsForListView(batch);
        setStudentsForAttendance(students);
        setAttendanceBatch(batch);
    };

    if (loading) {
        return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
    }

    return (
        <>
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Batch & Students</TableHead><TableHead>Skill</TableHead><TableHead>Status</TableHead><TableHead>Faculty</TableHead><TableHead>Schedule & Duration</TableHead><TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedBatches.length > 0 ? paginatedBatches.map((batch) => {
                        const dynamicStatus = getDynamicBatchStatus(batch.start_date, batch.end_date);
                        return (
                            <TableRow key={batch.id}>
                                <TableCell><div className="font-medium">{batch.name}</div><div className="text-sm text-muted-foreground">{batch.students.length} / {batch.max_students} Students</div></TableCell>
                                <TableCell>{batch.skill?.name || 'N/A'}</TableCell>
                                <TableCell><Badge variant={getStatusVariant(dynamicStatus)} className="capitalize">{dynamicStatus}</Badge></TableCell>
                                <TableCell>{batch.faculty?.name || 'N/A'}</TableCell>
                                <TableCell><div className="font-medium">{`${batch.start_time} - ${batch.end_time}`}</div><div className="text-sm text-muted-foreground">{`${formatDisplayDate(batch.start_date)} to ${formatDisplayDate(batch.end_date)}`}</div></TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setStudentListBatch(batch)}><Users className="mr-2 h-4 w-4" />View Students</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleMarkAttendanceClick(batch)}>
                                                <UserCheck className="mr-2 h-4 w-4" />
                                                <span>Mark Attendance</span>
                                            </DropdownMenuItem>
                                            {user?.role === 'admin' && <>
                                                <DropdownMenuItem onClick={() => onEditBatch(batch)}><Edit className="mr-2 h-4 w-4" />Edit Batch</DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-500" onClick={() => onDeleteBatch(batch.id)}><Trash2 className="mr-2 h-4 w-4" />Delete Batch</DropdownMenuItem>
                                            </>}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        );
                    }) : (
                    <TableRow><TableCell colSpan={6} className="text-center h-48"><div className="flex flex-col items-center justify-center gap-2"><SearchX className="h-12 w-12 text-muted-foreground" /><h3 className="text-lg font-semibold">No Batches Found</h3><p className="text-sm text-muted-foreground">Try adjusting your search or filter criteria.</p></div></TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
        
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

        {studentListBatch && (
            <StudentListDialog 
                open={!!studentListBatch}
                onOpenChange={() => setStudentListBatch(null)}
                batchName={studentListBatch.name}
                students={getStudentsForListView(studentListBatch)}
                onUpdateRemarks={onUpdateRemarks}
            />
        )}
        
        {attendanceBatch && (
            <AttendanceDialog
                open={!!attendanceBatch}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setAttendanceBatch(null);
                    }
                }}
                batch={attendanceBatch}
                students={studentsForAttendance}
                onAttendanceMarked={() => {
                    setAttendanceBatch(null);
                    onAttendanceMarked();
                }}
                isFeePending={isFeePending}
            />
        )}
        </>
    );
}