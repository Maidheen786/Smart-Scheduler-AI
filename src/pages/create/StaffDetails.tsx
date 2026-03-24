import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTimetableStore, StaffEntry } from "@/lib/timetable-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, Plus, Pencil, Trash2 } from "lucide-react";
import BackButton from "@/components/BackButton";
import { toast } from "sonner";

export default function StaffDetails() {
  const navigate = useNavigate();
  const { institutionType, classes, staff, addStaff, updateStaff, removeStaff } = useTimetableStore();

  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [subjectInput, setSubjectInput] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  // Get all unique subjects from classes
  const allSubjects = Array.from(new Set(classes.flatMap((c) => c.subjects.map((s) => s.name))));

  const addSubjectChip = () => {
    const val = subjectInput.trim().toUpperCase();
    if (!val || selectedSubjects.includes(val)) return;
    setSelectedSubjects([...selectedSubjects, val]);
    setSubjectInput("");
  };

  const toggleSubject = (sub: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Staff name is required");
      return;
    }
    if (selectedSubjects.length === 0) {
      toast.error("Select at least one subject");
      return;
    }
    const entry: StaffEntry = {
      name: name.trim().toUpperCase(),
      department: institutionType === "college" ? department.toUpperCase() : undefined,
      subjects: [...selectedSubjects],
    };
    if (editIndex !== null) {
      updateStaff(editIndex, entry);
      setEditIndex(null);
    } else {
      addStaff(entry);
    }
    setName("");
    setDepartment("");
    setSelectedSubjects([]);
    toast.success("Staff saved");
  };

  const handleEdit = (i: number) => {
    const s = staff[i];
    setName(s.name);
    setDepartment(s.department || "");
    setSelectedSubjects([...s.subjects]);
    setEditIndex(i);
  };

  return (
    <div className="min-h-screen bg-background hero-grid p-6">
      <div className="max-w-5xl mx-auto">
        <BackButton to="/create/classes" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <h1 className="font-display text-3xl font-bold text-primary">STAFF DETAILS</h1>
          <p className="text-muted-foreground mt-1">Add staff members and their subjects</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-6 mt-6"
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>STAFF NAME</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="uppercase-input"
                placeholder="Staff name"
              />
            </div>
            {institutionType === "college" && (
              <div className="space-y-2">
                <Label>DEPARTMENT</Label>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="uppercase-input"
                  placeholder="BCA"
                />
              </div>
            )}
          </div>

          <div className="mt-4">
            <Label>SUBJECTS HANDLED</Label>
            <p className="text-xs text-muted-foreground mb-2">Click to select from available subjects or type to add</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {allSubjects.map((sub) => (
                <button
                  key={sub}
                  onClick={() => toggleSubject(sub)}
                  className={`chip transition-all ${
                    selectedSubjects.includes(sub)
                      ? "bg-accent text-accent-foreground ring-2 ring-accent/30"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubjectChip()}
                className="uppercase-input"
                placeholder="Or type a subject name"
              />
              <Button onClick={addSubjectChip} size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {selectedSubjects.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedSubjects.map((s) => (
                  <span key={s} className="chip bg-accent/10 text-accent">
                    {s}
                    <button onClick={() => toggleSubject(s)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Button onClick={handleSave} className="mt-6 btn-glow">
            {editIndex !== null ? "UPDATE STAFF" : "ADD STAFF"}
          </Button>
        </motion.div>

        {staff.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl mt-6 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NAME</TableHead>
                  {institutionType === "college" && <TableHead>DEPARTMENT</TableHead>}
                  <TableHead>SUBJECTS</TableHead>
                  <TableHead className="w-24">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s, i) => (
                  <TableRow key={i} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{s.name}</TableCell>
                    {institutionType === "college" && <TableCell>{s.department}</TableCell>}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {s.subjects.map((sub: string) => (
                          <span key={sub} className="chip bg-accent/10 text-accent text-[10px]">{sub}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(i)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => removeStaff(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        )}

        <div className="mt-8 flex justify-end">
          <Button
            onClick={() => {
              if (staff.length === 0) {
                toast.error("Add at least one staff member");
                return;
              }
              navigate("/create/setup");
            }}
            className="btn-glow px-8"
          >
            NEXT → TIMETABLE SETUP
          </Button>
        </div>
      </div>
    </div>
  );
}
