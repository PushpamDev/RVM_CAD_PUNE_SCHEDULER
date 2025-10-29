import React, { useState, useMemo, useEffect } from "react";
import { Plus, GitMerge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster, toast } from "sonner";
import { API_BASE_URL } from "@/lib/api";
import { useAuth } from "../hooks/AuthContext";
import { useBatchData } from '../hooks/useBatchData';
import { BatchDialog } from '../components/BatchDialog';
import { BatchTable } from "../components/BatchTable";
import type { Batch, BatchFormData, MergeBatchesPayload } from '../types/batchManagement';

// --- New Merge Batches Dialog Component ---
interface MergeBatchesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batches: Batch[];
  onMerge: (payload: MergeBatchesPayload) => Promise<void>;
}

function MergeBatchesDialog({ open, onOpenChange, batches, onMerge }: MergeBatchesDialogProps) {
  const [sourceBatchId, setSourceBatchId] = useState<string>('');
  const [targetBatchId, setTargetBatchId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSourceBatchId('');
      setTargetBatchId('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!sourceBatchId || !targetBatchId) {
      toast.error("Please select both a source and a target batch.");
      return;
    }
    if (sourceBatchId === targetBatchId) {
      toast.error("Source and target batches cannot be the same.");
      return;
    }
    
    setIsSaving(true);
    // Use the updated payload structure
    await onMerge({ sourceBatchId, targetBatchId });
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge Batches</DialogTitle>
          <DialogDescription>
            Select a source batch to merge its students into a target batch. The source batch will be deleted after the merge.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="source-batch">Source Batch (will be deleted)</Label>
            <Select onValueChange={setSourceBatchId} value={sourceBatchId}>
              <SelectTrigger id="source-batch"><SelectValue placeholder="Select a batch to merge from..." /></SelectTrigger>
              <SelectContent>
                {batches.map(b => (<SelectItem key={b.id} value={b.id}>{b.name} ({b.students.length} students)</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-batch">Target Batch (will receive students)</Label>
            <Select onValueChange={setTargetBatchId} value={targetBatchId}>
              <SelectTrigger id="target-batch"><SelectValue placeholder="Select a batch to merge into..." /></SelectTrigger>
              <SelectContent>
                {batches.map(b => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving || !sourceBatchId || !targetBatchId}>
            {isSaving ? "Merging..." : "Confirm Merge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Component ---
export default function BatchManagement() {
  const { user, token } = useAuth();
  // The useBatchData hook now returns processed batches that are "substitution-aware"
  const { batches, faculties, allStudents, skills, loading, refetchData, refetchStudents } = useBatchData();
  
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | undefined>(undefined);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
      throw error; // Re-throw to prevent dialog from closing on failure
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

  const handleUpdateRemarks = async (studentId: string, remarks: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/students/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ remarks }),
      });
      if (!response.ok) throw new Error("Failed to update remarks");
      toast.success("Remarks updated successfully");
      refetchData();
    } catch (error: any) {
      toast.error("Update Failed", { description: error.message });
    }
  };

  const handleMergeBatches = async (payload: MergeBatchesPayload) => {
    try {
      // **FIX**: Corrected the API endpoint URL to match the routes file
      const response = await fetch(`${API_BASE_URL}/api/substitution/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to merge batches.');
      
      toast.success("Batches merged successfully!");
      setIsMergeDialogOpen(false);
      refetchData();
    } catch (error: any) {
      toast.error('Merge Failed', { description: error.message });
    }
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsMergeDialogOpen(true)}>
              <GitMerge className="h-4 w-4 mr-2" />Merge Batches
            </Button>
            <Button onClick={handleOpenCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />Add New Batch
            </Button>
          </div>
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
                batches={batches}
                loading={loading}
                filters={{ searchTerm, selectedDate, selectedFaculty, statusFilter }}
                allFaculties={faculties}
                onEditBatch={handleOpenEditDialog}
                onDeleteBatch={handleDeleteBatch}
                onUpdateRemarks={handleUpdateRemarks}
                onAttendanceMarked={refetchData}
                refetchData={refetchData}
            />
        </CardContent>
      </Card>
      
      {/* The BatchDialog is now always mounted, and its 'open' prop controls visibility. */}
      {/* This prevents the infinite loop caused by conditional rendering. */}
      <BatchDialog
          open={isBatchDialogOpen}
          onOpenChange={setIsBatchDialogOpen}
          onSave={handleSaveBatch}
          batch={selectedBatch}
          faculties={faculties}
          allStudents={allStudents}
          skills={skills}
          onStudentAdded={refetchStudents}
      />

      <MergeBatchesDialog
        open={isMergeDialogOpen}
        onOpenChange={setIsMergeDialogOpen}
        batches={batches}
        onMerge={handleMergeBatches}
      />
    </div>
  );
}