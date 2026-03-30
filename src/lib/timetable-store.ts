import { create } from "zustand";

export type SubjectType = "CORE" | "ALLIED" | "SEC";
export type Salutation = "Mr" | "Ms" | "Mrs" | "Dr" | "Prof";
export type TimetableStatus = "in_progress" | "completed";
export type AllocationMode = "default" | "custom";

export interface SubjectEntry {
  id?: string;
  name: string;
  type: SubjectType;
  hours?: number; // For custom allotment
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
  salutation: Salutation;
  name: string;
  department?: string;
  subjects: string[]; // subject names
}

export interface Timetable {
  id: string;
  name: string;
  institutionType: "school" | "college";
  institutionId: string;
  days: number;
  hoursPerDay: number;
  theme: string;
  classes: ClassEntry[];
  staff: StaffEntry[];
  status: TimetableStatus;
  createdAt: string;
  updatedAt: string;
}

interface TimetableStore {
  institutionType: "school" | "college" | null;
  institutionId: string | null;
  allocationMode: AllocationMode;
  classes: ClassEntry[];
  staff: StaffEntry[];
  timetableName: string;
  days: number;
  hoursPerDay: number;
  theme: string;
  currentTimetableId: string | null;
  allTimetables: Timetable[];

  setInstitutionType: (t: "school" | "college") => void;
  setInstitutionId: (id: string) => void;
  setAllocationMode: (mode: AllocationMode) => void;
  addClass: (c: ClassEntry) => void;
  updateClass: (index: number, c: ClassEntry) => void;
  removeClass: (index: number) => void;
  addStaff: (s: StaffEntry) => void;
  updateStaff: (index: number, s: StaffEntry) => void;
  removeStaff: (index: number) => void;
  setTimetableName: (name: string) => void;
  setDays: (d: number) => void;
  setHoursPerDay: (h: number) => void;
  setTheme: (theme: string) => void;
  saveTimetable: () => void;
  loadTimetable: (id: string) => void;
  reset: () => void;
}

export const useTimetableStore = create<TimetableStore>((set, get) => ({
  institutionType: null,
  institutionId: null,
  allocationMode: "default",
  classes: [],
  staff: [],
  timetableName: "",
  days: 5,
  hoursPerDay: 6,
  theme: "modern-neon",
  currentTimetableId: null,
  allTimetables: [],

  setInstitutionType: (t) => set({ institutionType: t }),
  setInstitutionId: (id) => set({ institutionId: id }),
  setAllocationMode: (mode) => set({ allocationMode: mode }),
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
  setTheme: (theme) => set({ theme }),
  saveTimetable: () => {
    const state = get();
    const newTimetable: Timetable = {
      id: state.currentTimetableId || `tt_${Date.now()}`,
      name: state.timetableName,
      institutionType: state.institutionType || "school",
      institutionId: state.institutionId || "",
      days: state.days,
      hoursPerDay: state.hoursPerDay,
      theme: state.theme,
      classes: state.classes,
      staff: state.staff,
      status: "completed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    set((s) => {
      const existing = s.allTimetables.findIndex((t) => t.id === newTimetable.id);
      if (existing >= 0) {
        const updated = [...s.allTimetables];
        updated[existing] = newTimetable;
        return { allTimetables: updated };
      }
      return { allTimetables: [...s.allTimetables, newTimetable] };
    });
  },
  loadTimetable: (id) => {
    const state = get();
    const timetable = state.allTimetables.find((t) => t.id === id);
    if (timetable) {
      set({
        currentTimetableId: timetable.id,
        timetableName: timetable.name,
        institutionType: timetable.institutionType,
        institutionId: timetable.institutionId,
        days: timetable.days,
        hoursPerDay: timetable.hoursPerDay,
        theme: timetable.theme,
        classes: timetable.classes,
        staff: timetable.staff,
      });
    }
  },
  reset: () =>
    set({
      institutionType: null,
      institutionId: null,
      allocationMode: "default",
      classes: [],
      staff: [],
      timetableName: "",
      days: 5,
      hoursPerDay: 6,
      theme: "modern-light",
      currentTimetableId: null,
    }),
}));
