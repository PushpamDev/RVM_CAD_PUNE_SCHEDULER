    // client/components/faculty/ScheduleEditor.tsx

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, PlusCircle } from 'lucide-react';
import type { WeeklySchedule, DaySchedule, TimeSlot } from '../../types/facultyManagement';

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

interface ScheduleEditorProps {
  schedule: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
}

export function ScheduleEditor({ schedule, onChange }: ScheduleEditorProps) {
  
  const updateDaySchedule = (day: string, daySchedule: DaySchedule) => {
    onChange({ ...schedule, [day]: daySchedule });
  };

  const updateTimeSlot = (day: string, slotIndex: number, field: keyof TimeSlot, value: string) => {
    const newTimeSlots = schedule[day].timeSlots.map((slot, i) => 
      i === slotIndex ? { ...slot, [field]: value } : slot
    );
    updateDaySchedule(day, { ...schedule[day], timeSlots: newTimeSlots });
  };
  
  const addTimeSlot = (day: string) => {
    const newTimeSlots = [...schedule[day].timeSlots, { startTime: '09:00', endTime: '17:00' }];
    updateDaySchedule(day, { ...schedule[day], timeSlots: newTimeSlots });
  };

  const removeTimeSlot = (day: string, slotIndex: number) => {
    const newTimeSlots = schedule[day].timeSlots.filter((_, i) => i !== slotIndex);
    updateDaySchedule(day, { ...schedule[day], timeSlots: newTimeSlots });
  };
  
  return (
    <div className="space-y-4 w-full rounded-lg border p-4">
      <Label className="text-base font-medium">Weekly Availability</Label>
      <Tabs defaultValue="monday" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          {DAYS_OF_WEEK.map((day) => (
            <TabsTrigger key={day} value={day}>{day.charAt(0).toUpperCase() + day.slice(1, 3)}</TabsTrigger>
          ))}
        </TabsList>
        {DAYS_OF_WEEK.map((day) => (
          <TabsContent key={day} value={day} className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-md bg-muted p-3">
              <Label className="font-semibold capitalize">{day}</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor={`${day}-available`} className="text-sm">Available</Label>
                <Switch
                  id={`${day}-available`}
                  checked={schedule[day].isAvailable}
                  onCheckedChange={(checked) => {
                    const newDaySchedule = { ...schedule[day], isAvailable: checked };
                    if (checked && newDaySchedule.timeSlots.length === 0) {
                      newDaySchedule.timeSlots = [{ startTime: "10:00", endTime: "20:00" }];
                    }
                    updateDaySchedule(day, newDaySchedule);
                  }}
                />
              </div>
            </div>
            {schedule[day].isAvailable && (
              <div className="space-y-3 pl-2 border-l-2">
                {schedule[day].timeSlots.map((slot, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input type="time" value={slot.startTime} onChange={(e) => updateTimeSlot(day, index, "startTime", e.target.value)} className="w-32" />
                    <span>-</span>
                    <Input type="time" value={slot.endTime} onChange={(e) => updateTimeSlot(day, index, "endTime", e.target.value)} className="w-32" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTimeSlot(day, index)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => addTimeSlot(day)}>
                  <PlusCircle className="h-4 w-4 mr-2" /> Add Time Slot
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}