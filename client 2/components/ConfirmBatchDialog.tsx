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

// Assuming API_BASE_URL is correctly imported or defined elsewhere
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ConfirmBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestion: any; // Consider defining a more specific type if possible
  formState: any; // Consider defining a more specific type
  selectedSkill: any; // Consider defining a more specific type (e.g., Skill)
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

  // Effect to generate the default batch name
  useEffect(() => {
    // Check if all necessary data exists
    if (suggestion?.name && selectedSkill?.name && formState?.startDate) {
      const facultyName = suggestion.name.split(' ')[0]; // Get first name
      let dateString = 'Invalid Date';
      try {
        // Format the date safely
        dateString = new Date(formState.startDate).toLocaleDateString('en-GB', { timeZone: 'UTC' }); // Use UTC to avoid timezone issues if dates are stored as YYYY-MM-DD
      } catch (e) {
        console.error("Invalid start date for batch name generation:", formState.startDate);
      }

      const generatedName = `${selectedSkill.name} Batch by ${facultyName} (${dateString})`;

      // SAFEGUARD: Only update state if the generated name is different
      setBatchName(currentName => {
        if (currentName !== generatedName) {
          return generatedName;
        }
        return currentName; // Prevent unnecessary update causing loops
      });
    } else if (open) {
        // If dialog is open but data is missing, reset name (optional)
        setBatchName('');
    }
  }, [suggestion, selectedSkill, formState?.startDate, open]); // Added 'open' dependency to reset if needed


  const handleConfirm = async () => {
    if (!batchName.trim()) {
      toast.error('Batch name is required.');
      return;
    }
    // Basic validation for other required fields from formState
    if (!formState?.startDate || !formState?.endDate || !formState?.startTime || !formState?.endTime || !formState?.skillId || !suggestion?.id || !formState?.selectedDays?.length) {
        toast.error('Missing required batch details from previous step.');
        console.error("Missing formState data:", { formState, suggestion, selectedSkill });
        return;
    }

    setIsLoading(true);

    // Function to determine initial status based on start date
    const getStatus = (startDate: string): 'upcoming' | 'active' => {
        try {
            const today = new Date();
            const batchStartDate = new Date(startDate);
            today.setHours(0, 0, 0, 0);
            batchStartDate.setHours(0, 0, 0, 0);
            return batchStartDate > today ? 'upcoming' : 'active';
        } catch (e) {
            console.error("Error determining status from date:", startDate);
            return 'upcoming'; // Default to upcoming on error
        }
    };

    // Construct the payload for the API
    const batchData = {
      name: batchName.trim(), // Trim whitespace
      description: "", // Default empty description
      startDate: formState.startDate,
      endDate: formState.endDate,
      startTime: formState.startTime,
      endTime: formState.endTime,
      facultyId: suggestion.id, // Use suggestion.id
      skillId: formState.skillId,
      maxStudents: 15, // Default maxStudents
      studentIds: [], // Default empty studentIds for new batch
      daysOfWeek: formState.selectedDays, // Use selectedDays
      status: getStatus(formState.startDate), // Calculate status
    };
    console.log('Creating batch with payload:', batchData);

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
        let errorData;
        try {
            errorData = await response.json();
        } catch(e) {
            // Handle cases where response might not be JSON
            errorData = { message: `Server responded with status: ${response.status}` };
        }
        console.error('API Error Response:', errorData);
        throw new Error(errorData.message || errorData.error || 'Failed to create batch.');
      }

      toast.success('Batch Created Successfully!', {
        description: `The batch "${batchName.trim()}" has been added.`,
      });
      onBatchCreated(); // Notify parent component
      onOpenChange(false); // Close the dialog
    } catch (error: any) {
      console.error('Error creating batch:', error);
      toast.error('Failed to Create Batch', {
        description: error.message,
      });
      // Keep dialog open on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Ensure Dialog is controlled correctly
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Batch Creation</DialogTitle>
          <DialogDescription>
            Please review the details below and provide a name for the batch.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            {/* Batch Name Input */}
            <div className="space-y-2">
                <Label htmlFor="batchName">Batch Name</Label>
                <Input
                    id="batchName"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="Enter batch name"
                    disabled={isLoading}
                />
            </div>
            {/* Displaying Confirmation Details */}
          <p><strong>Faculty:</strong> {suggestion?.name || 'N/A'}</p>
          <p><strong>Skill:</strong> {selectedSkill?.name || 'N/A'}</p>
          <p><strong>Dates:</strong> {formState?.startDate || 'N/A'} to {formState?.endDate || 'N/A'}</p>
          <p><strong>Time:</strong> {formState?.startTime || 'N/A'} - {formState?.endTime || 'N/A'}</p>
          <p><strong>Days:</strong> {formState?.selectedDays?.join(', ') || 'N/A'}</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || !batchName.trim()}>
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