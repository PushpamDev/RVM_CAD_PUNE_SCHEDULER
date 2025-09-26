// client/types/studentManagement.ts

export interface Student {
  id: string;
  name: string;
  admission_number: string;
  phone_number: string;
  remarks: string;
}

export interface Batch {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  students: { id: string }[];
  faculty_id: string;
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