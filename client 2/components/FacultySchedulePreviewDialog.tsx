import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useBatchData } from '@/hooks/useBatchData';
import { FacultySuggestion } from '@/pages/Suggestion';
import { cn } from '@/lib/utils';

// Re-usable helpers from ScheduleView
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setHours(0, 0, 0, 0);
  return new Date(d.setDate(diff));
};

interface FacultySchedulePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faculty: FacultySuggestion;
  dateRange: { from: Date; to: Date };
}

export function FacultySchedulePreviewDialog({ open, onOpenChange, faculty, dateRange }: FacultySchedulePreviewDialogProps) {
  const { batches, loading } = useBatchData();
  
  const scheduleData = useMemo(() => {
    if (!faculty || loading) return null;

    const weekStart = getWeekStart(dateRange.from);

    const facultyBatches = batches.filter(b => b.faculty_id === faculty.facultyId);
    
    const allTimes = new Set<string>();
    facultyBatches.forEach(b => { allTimes.add(b.start_time); allTimes.add(b.end_time); });
    faculty.commonSlots.forEach(s => { allTimes.add(s.start); allTimes.add(s.end); });
    const sortedTimePoints = Array.from(allTimes).sort((a, b) => a.localeCompare(b));
    const timeSlots = sortedTimePoints.slice(0, -1).map((start, i) => ({ start, end: sortedTimePoints[i + 1] })).filter(slot => slot.start !== slot.end);

    const grid = daysOfWeek.reduce((acc, day) => {
        acc[day] = timeSlots.map(slot => ({
            ...slot,
            batch: facultyBatches.find(b => b.days_of_week.includes(day) && b.start_time < slot.end && b.end_time > slot.start),
            isSuggested: faculty.commonSlots.some(s => s.start < slot.end && s.end > slot.start)
        }));
        return acc;
    }, {} as { [day: string]: { start: string; end: string; batch?: any; isSuggested: boolean }[] });

    return { grid, timeSlots };
  }, [faculty, batches, loading, dateRange]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Schedule Preview for {faculty.name}</DialogTitle>
          <DialogDescription>
            This is their schedule for the week of {dateRange.from.toLocaleDateString()}. Suggested free slots are highlighted in green.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto pt-4">
          <div className="grid border rounded-lg" style={{ gridTemplateColumns: 'auto repeat(7, 1fr)' }}>
            <div className="font-semibold p-2 bg-muted/50 border-b border-r">Time</div>
            {daysOfWeek.map(day => <div key={day} className="font-semibold p-2 border-b text-center bg-muted/50">{day}</div>)}
            
            {scheduleData?.timeSlots.map(slot => (
              <React.Fragment key={slot.start}>
                <div className="font-semibold p-2 border-b border-r text-xs text-muted-foreground">{`${slot.start} - ${slot.end}`}</div>
                {daysOfWeek.map(day => {
                  const cell = scheduleData.grid[day].find(c => c.start === slot.start);
                  return (
                    <div key={day} className={cn(
                        "p-1 border-b border-r min-h-[40px] text-xs flex items-center justify-center", // Added flex for centering
                        cell?.batch ? "bg-red-100 dark:bg-red-900/40" : cell?.isSuggested ? "bg-green-100 dark:bg-green-900/40" : ""
                    )}>
                      {cell?.batch && <Badge variant="destructive" className="w-full">{cell.batch.name}</Badge>}
                      
                      {/* --- MODIFICATION START --- */}
                      {/* Display "Free" text in suggested slots that are not booked */}
                      {!cell?.batch && cell?.isSuggested && (
                        <span className="font-semibold text-green-800 dark:text-green-300">
                            Free
                        </span>
                      )}
                      {/* --- MODIFICATION END --- */}

                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}