import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Patient {
  id: number;
  name: string;
  age: number;
  gender: string;
  history: string;
}

export interface Journal {
  id: number;
  title: string;
  content: string;
  type: 'text' | 'image' | 'pdf';
  timestamp: string;
}

export interface Appointment {
  id: number;
  title: string;
  date: string;
  patientId?: number;
}

export interface Document {
  id: number;
  name: string;
  type: string;
  content: string;
  patientId?: number;
  journalId?: number;
  timestamp: string;
}
