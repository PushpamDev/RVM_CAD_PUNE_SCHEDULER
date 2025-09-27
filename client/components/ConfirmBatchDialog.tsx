import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ConfirmBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestion: any;
  formState: any;
  selectedSkill: any;
  onBatchCreated: () => void;
}

export function ConfirmBatchDialog({
  open,
  onOpenChange,
  suggestion,
  formState,
  selectedSkill,
  onBatchCreated,
}: ConfirmBatchDialogProps) {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [batchName, setBatchName] = useState('');

  useEffect(() => {
    if (suggestion && selectedSkill && formState.startDate) {
      const facultyName = suggestion.name.split(' ')[0];
      const generatedName = `${selectedSkill.name} Batch by ${facultyName} (${new Date(formState.startDate).toLocaleDateString()})`;
      setBatchName(generatedName);
    }
  }, [suggestion, selectedSkill, formState.startDate]);

  const handleConfirm = async () => {
    if (!batchName.trim()) {
      toast.error('Batch name is required.');
      return;
    }
    setIsLoading(true);

    const getStatus = (startDate: string) => {
        const today = new Date();
        const batchStartDate = new Date(startDate);
        today.setHours(0, 0, 0, 0);
        batchStartDate.setHours(0, 0, 0, 0);
        if (batchStartDate > today) {
            return 'Upcoming';
        } else {
            return 'active';
        }
    };

    const batchData = {
      name: batchName,
      description: "", // Add default empty description
      startDate: formState.startDate,
      endDate: formState.endDate,
      startTime: formState.startTime,
      endTime: formState.endTime,
      facultyId: suggestion?.id || "", // Use suggestion.id for facultyId
      skillId: formState.skillId,
      maxStudents: 15, // Add default maxStudents
      studentIds: [], // Add default empty studentIds
      daysOfWeek: formState.selectedDays, // Corrected from formState.daysOfWeek
      status: getStatus(formState.startDate),
    };
    console.log('payload',batchData)

    try {
      const response = await fetch(`${API_BASE_URL}/api/batches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(batchData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create batch.');
      }

      toast.success('Batch Created Successfully!', {
        description: `The batch "${batchName}" has been added.`,
      });
      onBatchCreated();
    } catch (error: any) {
      console.error('Error creating batch:', error);
      toast.error('Failed to Create Batch', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Batch Creation</DialogTitle>
          <DialogDescription>
            Please review the details below and provide a name for the batch.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="batchName">Batch Name</Label>
                <Input
                    id="batchName"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="Enter batch name"
                />
            </div>
          <p><strong>Faculty:</strong> {suggestion?.name}</p>
          <p><strong>Skill:</strong> {selectedSkill?.name}</p>
          <p><strong>Dates:</strong> {formState?.startDate} to {formState?.endDate}</p>
          <p><strong>Time:</strong> {formState?.startTime || 'N/A'} - {formState?.endTime || 'N/A'}</p>
          <p><strong>Days:</strong> {formState?.selectedDays?.join(', ')}</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Confirm & Create'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}