// client/types/studentManagement.ts

export interface Student {
  id: string;
  name: string;
  admission_number: string;
  phone_number: string;
  remarks: string;
}

// **FIX**: This Batch type is now more detailed to match the API response
// for when you fetch a student's specific batches.
export interface Batch {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  status: 'upcoming' | 'active' | 'completed';
  faculty_id: string;
  faculty?: { id: string; name: string; };
  // Note: The 'students' property is intentionally omitted here
  // because the specific dialogs no longer rely on it.
}

export interface Faculty {
  id: string;
  name: string;
}

export interface StudentFormData {
  name: string;
  admission_number: string;
  phone_number: string;
  remarks: string;
}
