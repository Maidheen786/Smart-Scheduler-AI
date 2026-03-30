import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTimetableStore, StaffEntry, Salutation } from "@/lib/timetable-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, Plus, Pencil, Trash2, Upload, Download } from "lucide-react";
import BackButton from "@/components/BackButton";
import { toast } from "sonner";

export default function StaffDetails() {
  const navigate = useNavigate();
  const { institutionType, classes, staff, addStaff, updateStaff, removeStaff, allocationMode } = useTimetableStore();

  const [salutation, setSalutation] = useState<Salutation>("Mr");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [subjectInput, setSubjectInput] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Refs for keyboard navigation
  const nameRef = useRef<HTMLInputElement>(null);
  const departmentRef = useRef<HTMLInputElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  // Get all unique subjects from classes
  const allSubjects = Array.from(new Set(classes.flatMap((c) => c.subjects.map((s) => s.name))));

  const handleKeyPress = (e: React.KeyboardEvent, nextField: React.RefObject<HTMLInputElement> | null) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextField) {
        nextField.current?.focus();
      } else {
        addSubjectChip();
      }
    } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      if (nextField) {
        nextField.current?.focus();
      }
    }
  };

  const addSubjectChip = () => {
    const val = subjectInput.trim().toUpperCase();
    if (!val || selectedSubjects.includes(val)) return;
    setSelectedSubjects([...selectedSubjects, val]);
    setSubjectInput("");
    subjectInputRef.current?.focus();
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
      salutation,
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
    setSalutation("Mr");
    setName("");
    setDepartment("");
    setSelectedSubjects([]);
    nameRef.current?.focus();
    toast.success("Staff saved");
  };

  const handleEdit = (i: number) => {
    const s = staff[i];
    setSalutation(s.salutation || "Mr");
    setName(s.name);
    setDepartment(s.department || "");
    setSelectedSubjects([...s.subjects]);
    setEditIndex(i);
    nameRef.current?.focus();
  };

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.trim().split("\n");
        if (lines.length < 2) {
          toast.error("CSV must have header and at least one data row");
          return;
        }

        let importedCount = 0;
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split("|").map((p) => p.trim());
          if (parts.length < 2) continue;

          const staffName = parts[0];
          const departmentPart = institutionType === "college" ? parts[1] : "";
          const subjectsPart = institutionType === "college" ? parts[2] : parts[1];

          if (!staffName) continue;

          // Parse subjects based on allocation mode
          let subjects: string[] = [];
          
          if (allocationMode === "custom") {
            // Custom format: "MATH:4,PYTHON:2,DATA:3" → "MATH:4,PYTHON:2,DATA:3"
            subjects = subjectsPart
              .split(",")
              .map((s) => s.trim().toUpperCase())
              .filter((s) => s);
          } else {
            // Default format: "MATH,PYTHON,DATA" → "MATH,PYTHON,DATA"
            subjects = subjectsPart
              .split(",")
              .map((s) => s.trim().toUpperCase())
              .filter((s) => s);
          }

          if (subjects.length === 0) continue;

          const entry: StaffEntry = {
            salutation: "Mr",
            name: staffName.toUpperCase(),
            department: departmentPart ? departmentPart.toUpperCase() : undefined,
            subjects,
          };

          addStaff(entry);
          importedCount++;
        }

        toast.success(`Imported ${importedCount} staff members`);
        setShowBulkImport(false);
      } catch (err) {
        toast.error("Error parsing CSV file");
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const isCollege = institutionType === "college";
    let header;
    let example;

    if (allocationMode === "custom") {
      // Custom allotment: show subject:hours format
      header = isCollege
        ? "NAME|DEPARTMENT|SUBJECTS WITH HOURS (subject:hours comma separated)"
        : "NAME|SUBJECTS WITH HOURS (subject:hours comma separated)";
      example = isCollege
        ? "DR. JOHN|BCA|MATH:4,PYTHON:2,DATA STRUCTURES:3"
        : "DR. JOHN|MATH:3,ENGLISH:2,SCIENCE:4";
    } else {
      // Default allotment: show subject types only
      header = isCollege
        ? "NAME|DEPARTMENT|SUBJECTS (comma separated)"
        : "NAME|SUBJECTS (comma separated)";
      example = isCollege
        ? "DR. JOHN|BCA|MATH,PYTHON,DATA STRUCTURES"
        : "DR. JOHN|MATH,ENGLISH,SCIENCE";
    }

    const csv = `${header}\n${example}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staff-template-${allocationMode}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-6">
      <div className="max-w-5xl mx-auto">
        <BackButton to="/create/classes" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <h1 className="font-display text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            STAFF DETAILS
          </h1>
          <p className="text-muted-foreground mt-1">Add staff members and their subjects</p>
          <div className="mt-3 inline-block px-3 py-1 rounded-full bg-accent/10 border border-accent/30">
            <p className="text-xs font-medium text-accent">
              Allocation Mode: <span className="uppercase font-bold">{allocationMode}</span>
            </p>
          </div>
        </motion.div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-6 mb-6">
          <Button
            onClick={() => setShowBulkImport(!showBulkImport)}
            className="gap-2 bg-gradient-to-r from-accent to-accent-dark hover:shadow-lg hover:shadow-orange-500/40"
          >
            <Upload className="h-4 w-4" /> BULK IMPORT CSV
          </Button>
          <Button
            onClick={downloadTemplate}
            variant="outline"
            className="gap-2 border-accent/50 text-accent hover:bg-accent/10"
          >
            <Download className="h-4 w-4" /> DOWNLOAD TEMPLATE
          </Button>
        </div>

        {/* Bulk import section */}
        {showBulkImport && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6 mb-6 border-2 border-accent/30"
          >
            <h3 className="font-display text-lg font-bold text-accent mb-3">BULK IMPORT</h3>
            <div className="space-y-3">
              <div className="bg-accent/5 rounded p-3 border border-accent/20">
                <p className="text-sm font-medium text-accent mb-2">
                  Mode: <span className="uppercase">{allocationMode} ALLOTMENT</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Format: NAME{institutionType === "college" ? "|DEPARTMENT" : ""}|SUBJECTS
                  {allocationMode === "custom" ? " (with hours)" : ""}
                </p>
              </div>
              <Input
                type="file"
                accept=".csv"
                onChange={handleBulkImport}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                {allocationMode === "custom"
                  ? 'Subjects format: MATH:4,ENGLISH:3,SCIENCE:2 (subject:hours, comma separated)'
                  : 'Subjects format: MATH,ENGLISH,SCIENCE (comma separated)'}
              </p>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-6"
        >
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>SALUTATION</Label>
              <Select value={salutation} onValueChange={(value) => {
                setSalutation(value as Salutation);
                nameRef.current?.focus();
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mr">Mr</SelectItem>
                  <SelectItem value="Ms">Ms</SelectItem>
                  <SelectItem value="Mrs">Mrs</SelectItem>
                  <SelectItem value="Dr">Dr</SelectItem>
                  <SelectItem value="Prof">Prof</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>STAFF NAME</Label>
              <Input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => handleKeyPress(e, institutionType === "college" ? departmentRef : subjectInputRef)}
                className="uppercase-input"
                placeholder="Staff name"
              />
            </div>
            {institutionType === "college" && (
              <div className="space-y-2">
                <Label>DEPARTMENT</Label>
                <Input
                  ref={departmentRef}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, subjectInputRef)}
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
                ref={subjectInputRef}
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSubjectChip();
                  }
                }}
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

          <Button
            onClick={handleSave}
            className="mt-6 bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-purple-500/40"
          >
            {editIndex !== null ? "UPDATE STAFF" : "ADD STAFF"}
          </Button>
        </motion.div>

        {staff.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl mt-6 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-primary/10 to-accent/10">
                  <TableHead className="w-20">SALUTATION</TableHead>
                  <TableHead>NAME</TableHead>
                  {institutionType === "college" && <TableHead>DEPARTMENT</TableHead>}
                  <TableHead>SUBJECTS</TableHead>
                  <TableHead className="w-24">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s, i) => (
                  <TableRow key={i} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium text-accent">{s.salutation || "Mr"}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    {institutionType === "college" && <TableCell>{s.department}</TableCell>}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {s.subjects.map((sub: string) => (
                          <span key={sub} className="chip bg-accent/10 text-accent text-[10px]">
                            {allocationMode === "custom" ? sub : sub}
                          </span>
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
              navigate("/create/theme");
            }}
            className="bg-gradient-to-r from-secondary to-secondary-dark hover:shadow-lg hover:shadow-teal-500/40 px-8"
          >
            NEXT → THEME SELECTION
          </Button>
        </div>
      </div>
    </div>
  );
}
