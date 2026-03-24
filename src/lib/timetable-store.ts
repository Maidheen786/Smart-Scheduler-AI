import { create } from "zustand";

export type SubjectType = "CORE" | "ALLIED" | "SEC";

export interface SubjectEntry {
  id?: string;
  name: string;
  type: SubjectType;
}

export interface ClassEntry {
  id?: string;
  className: string;
  section: string;
  department?: string;
  subjects: SubjectEntry[];
}

export interface StaffEntry {
  id?: string;
  name: string;
  department?: string;
  subjects: string[]; // subject names
}

interface TimetableStore {
  institutionType: "school" | "college" | null;
  institutionId: string | null;
  classes: ClassEntry[];
  staff: StaffEntry[];
  timetableName: string;
  days: number;
  hoursPerDay: number;

  setInstitutionType: (t: "school" | "college") => void;
  setInstitutionId: (id: string) => void;
  addClass: (c: ClassEntry) => void;
  updateClass: (index: number, c: ClassEntry) => void;
  removeClass: (index: number) => void;
  addStaff: (s: StaffEntry) => void;
  updateStaff: (index: number, s: StaffEntry) => void;
  removeStaff: (index: number) => void;
  setTimetableName: (name: string) => void;
  setDays: (d: number) => void;
  setHoursPerDay: (h: number) => void;
  reset: () => void;
}

export const useTimetableStore = create<TimetableStore>((set) => ({
  institutionType: null,
  institutionId: null,
  classes: [],
  staff: [],
  timetableName: "",
  days: 5,
  hoursPerDay: 6,

  setInstitutionType: (t) => set({ institutionType: t }),
  setInstitutionId: (id) => set({ institutionId: id }),
  addClass: (c) => set((s) => ({ classes: [...s.classes, c] })),
  updateClass: (index, c) =>
    set((s) => ({ classes: s.classes.map((cl, i) => (i === index ? c : cl)) })),
  removeClass: (index) =>
    set((s) => ({ classes: s.classes.filter((_, i) => i !== index) })),
  addStaff: (st) => set((s) => ({ staff: [...s.staff, st] })),
  updateStaff: (index, st) =>
    set((s) => ({ staff: s.staff.map((stf, i) => (i === index ? st : stf)) })),
  removeStaff: (index) =>
    set((s) => ({ staff: s.staff.filter((_, i) => i !== index) })),
  setTimetableName: (name) => set({ timetableName: name }),
  setDays: (d) => set({ days: d }),
  setHoursPerDay: (h) => set({ hoursPerDay: h }),
  reset: () =>
    set({
      institutionType: null,
      institutionId: null,
      classes: [],
      staff: [],
      timetableName: "",
      days: 5,
      hoursPerDay: 6,
    }),
}));
