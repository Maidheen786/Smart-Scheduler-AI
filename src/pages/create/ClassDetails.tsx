import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTimetableStore, ClassEntry, SubjectEntry, SubjectType } from "@/lib/timetable-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { X, Plus, Pencil, Trash2, Upload, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import BackButton from "@/components/BackButton";
import { toast } from "sonner";

export default function ClassDetails() {
  const navigate = useNavigate();
  const { institutionType, allocationMode, days, hoursPerDay, classes, addClass, updateClass, removeClass } = useTimetableStore();

  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [department, setDepartment] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectType, setSubjectType] = useState<SubjectType>("CORE");
  const [subjectHours, setSubjectHours] = useState<number>(1);
  const [subjects, setSubjects] = useState<SubjectEntry[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  
  // Validation dialog states
  const [validationDialog, setValidationDialog] = useState<{
    open: boolean;
    type: "error" | "warning" | null;
    message: string;
    totalHours: number;
    totalSlots: number;
  }>({
    open: false,
    type: null,
    message: "",
    totalHours: 0,
    totalSlots: 0,
  });
  const [pendingClassEntry, setPendingClassEntry] = useState<ClassEntry | null>(null);

  // Refs for keyboard navigation
  const classNameRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLInputElement>(null);
  const departmentRef = useRef<HTMLInputElement>(null);
  const subjectNameRef = useRef<HTMLInputElement>(null);

  const handleKeyPress = (e: React.KeyboardEvent, nextField: React.RefObject<HTMLInputElement> | null) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextField) {
        nextField.current?.focus();
      } else {
        addSubject();
      }
    } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      if (nextField) {
        nextField.current?.focus();
      }
    }
  };

  const addSubject = () => {
    if (!subjectName.trim()) return;
    
    if (allocationMode === "custom" && subjectHours < 1) {
      toast.error("Hours must be at least 1");
      return;
    }

    const newSubject: SubjectEntry = {
      name: subjectName.trim().toUpperCase(),
      type: allocationMode === "default" ? subjectType : "CORE",
      hours: allocationMode === "custom" ? subjectHours : undefined,
    };

    setSubjects([...subjects, newSubject]);
    setSubjectName("");
    setSubjectHours(1);
    subjectNameRef.current?.focus();
  };

  const removeSubject = (i: number) => setSubjects(subjects.filter((_, idx) => idx !== i));

  const confirmSaveClass = () => {
    if (!pendingClassEntry) return;

    if (editIndex !== null) {
      updateClass(editIndex, pendingClassEntry);
      setEditIndex(null);
    } else {
      addClass(pendingClassEntry);
    }

    setClassName("");
    setSection("");
    setDepartment("");
    setSubjects([]);
    setValidationDialog({ open: false, type: null, message: "", totalHours: 0, totalSlots: 0 });
    setPendingClassEntry(null);
    classNameRef.current?.focus();
    toast.success("Class saved");
  };

  const handleSaveClass = () => {
    if (!className.trim() || !section.trim()) {
      toast.error("Class name and section are required");
      return;
    }
    if (subjects.length === 0) {
      toast.error("Add at least one subject");
      return;
    }

    const entry: ClassEntry = {
      className: className.trim().toUpperCase(),
      section: section.trim().toUpperCase(),
      department: institutionType === "college" ? department.toUpperCase() : undefined,
      subjects: [...subjects],
    };

    // Validate custom allotment hours
    if (allocationMode === "custom") {
      const totalSlots = days * hoursPerDay;
      const totalHours = subjects.reduce((sum, s) => sum + (s.hours || 0), 0);

      if (totalHours > totalSlots) {
        // ERROR: More hours than slots - BLOCK
        setValidationDialog({
          open: true,
          type: "error",
          message: `Total hours (${totalHours}) exceeds available slots (${totalSlots}). Please reduce subject hours.`,
          totalHours,
          totalSlots,
        });
        setPendingClassEntry(null);
        return;
      }

      if (totalHours < totalSlots) {
        // WARNING: Less hours than slots - CONFIRM
        setValidationDialog({
          open: true,
          type: "warning",
          message: `Total hours (${totalHours}) is less than available slots (${totalSlots}). Extra ${totalSlots - totalHours} slot(s) will be free. Do you want to continue?`,
          totalHours,
          totalSlots,
        });
        setPendingClassEntry(entry);
        return;
      }

      // CORRECT: Exact match - Save immediately
      if (editIndex !== null) {
        updateClass(editIndex, entry);
        setEditIndex(null);
      } else {
        addClass(entry);
      }
      setClassName("");
      setSection("");
      setDepartment("");
      setSubjects([]);
      classNameRef.current?.focus();
      toast.success("✅ Class saved perfectly!");
      return;
    }

    // Default mode: Save immediately
    if (editIndex !== null) {
      updateClass(editIndex, entry);
      setEditIndex(null);
    } else {
      addClass(entry);
    }
    setClassName("");
    setSection("");
    setDepartment("");
    setSubjects([]);
    classNameRef.current?.focus();
    toast.success("Class saved");
  };

  const handleEdit = (i: number) => {
    const c = classes[i];
    setClassName(c.className);
    setSection(c.section);
    setDepartment(c.department || "");
    setSubjects([...c.subjects]);
    setEditIndex(i);
    classNameRef.current?.focus();
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
          if (parts.length < 3) continue;

          const classNamePart = parts[0];
          const sectionPart = parts[1];
          const departmentPart = institutionType === "college" ? parts[2] : "";
          const subjectsPart = institutionType === "college" ? parts[3] : parts[2];

          if (!classNamePart || !sectionPart) continue;

          let subjectList: SubjectEntry[] = [];

          if (allocationMode === "custom") {
            // Custom format: "MATH:4,ENGLISH:3" → extract name and hours
            subjectList = subjectsPart
              .split(",")
              .map((s) => {
                const [name, hours] = s.trim().split(":");
                return { name: name.toUpperCase(), type: "CORE" as SubjectType, hours: parseInt(hours) || 0 };
              })
              .filter((s) => s.name && s.hours > 0);
          } else {
            // Default format: "MATH:CORE,ENGLISH:ALLIED" → extract name and type
            subjectList = subjectsPart
              .split(",")
              .map((s) => {
                const [name, type] = s.trim().split(":");
                return { name: name.toUpperCase(), type: (type?.toUpperCase() || "CORE") as SubjectType };
              })
              .filter((s) => s.name);
          }

          if (subjectList.length === 0) continue;

          const entry: ClassEntry = {
            className: classNamePart.toUpperCase(),
            section: sectionPart.toUpperCase(),
            department: departmentPart ? departmentPart.toUpperCase() : undefined,
            subjects: subjectList,
          };

          addClass(entry);
          importedCount++;
        }

        toast.success(`Imported ${importedCount} classes`);
        setShowBulkImport(false);
      } catch (err) {
        toast.error("Error parsing CSV file");
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const isCollege = institutionType === "college";
    let header, example;

    if (allocationMode === "custom") {
      // Custom allotment: show subject:hours format
      header = isCollege
        ? "CLASS|SECTION|DEPARTMENT|SUBJECTS WITH HOURS (Name:Hours,Name:Hours)"
        : "CLASS|SECTION|SUBJECTS WITH HOURS (Name:Hours,Name:Hours)";
      example = isCollege
        ? "X|A|BCA|MATH:4,ENGLISH:3,CS:2"
        : "10|A|MATH:4,ENGLISH:3,SCIENCE:2";
    } else {
      // Default allotment: show subject:type format
      header = isCollege
        ? "CLASS|SECTION|DEPARTMENT|SUBJECTS (Name:Type,Name:Type)"
        : "CLASS|SECTION|SUBJECTS (Name:Type,Name:Type)";
      example = isCollege
        ? "X|A|BCA|MATH:CORE,ENGLISH:CORE,CS:ALLIED"
        : "10|A|MATH:CORE,ENGLISH:CORE,SCIENCE:ALLIED";
    }

    const csv = `${header}\n${example}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `class-template-${allocationMode}.csv`;
    a.click();
  };

  const chipColor = (type: SubjectType) =>
    type === "CORE" ? "chip-core" : type === "ALLIED" ? "chip-allied" : "chip-sec";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      {/* Validation Dialog */}
      <AlertDialog open={validationDialog.open} onOpenChange={(open) => {
        if (!open) {
          setValidationDialog({ open: false, type: null, message: "", totalHours: 0, totalSlots: 0 });
          setPendingClassEntry(null);
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              {validationDialog.type === "error" ? (
                <AlertTriangle className="h-6 w-6 text-destructive" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              )}
              <AlertDialogTitle>
                {validationDialog.type === "error" ? "❌ Error" : "⚠️ Warning"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="mt-4 text-base">
              {validationDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="bg-background/50 rounded-lg p-4 my-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Hours</p>
                <p className="text-lg font-bold">{validationDialog.totalHours}h</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Available Slots</p>
                <p className="text-lg font-bold">{validationDialog.totalSlots}h</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {validationDialog.type === "error" ? (
              <>
                <AlertDialogCancel className="flex-1">Edit Class</AlertDialogCancel>
              </>
            ) : (
              <>
                <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={confirmSaveClass}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                >
                  Continue Anyway
                </AlertDialogAction>
              </>
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <div className="max-w-5xl mx-auto">
        <BackButton to="/create" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <h1 className="font-display text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            CLASS DETAILS
          </h1>
          <p className="text-muted-foreground mt-1">Add classes and their subjects</p>
          <div className="mt-3 inline-block px-3 py-1 rounded-full bg-secondary/10 border border-secondary/30">
            <p className="text-xs font-medium text-secondary">
              Allocation Mode: <span className="uppercase font-bold">{allocationMode}</span>
            </p>
          </div>
        </motion.div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-6 mb-6">
          <Button
            onClick={() => setShowBulkImport(!showBulkImport)}
            className="gap-2 bg-gradient-to-r from-secondary to-secondary-dark hover:shadow-lg hover:shadow-teal-500/40"
          >
            <Upload className="h-4 w-4" /> BULK IMPORT CSV
          </Button>
          <Button
            onClick={downloadTemplate}
            variant="outline"
            className="gap-2 border-secondary/50 text-secondary hover:bg-secondary/10"
          >
            <Download className="h-4 w-4" /> DOWNLOAD TEMPLATE
          </Button>
        </div>

        {/* Bulk import section */}
        {showBulkImport && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6 mb-6 border-2 border-secondary/30"
          >
            <h3 className="font-display text-lg font-bold text-secondary mb-3">BULK IMPORT</h3>
            <div className="space-y-3">
              <div className="bg-secondary/5 rounded p-3 border border-secondary/20">
                <p className="text-sm font-medium text-secondary mb-2">
                  Mode: <span className="uppercase">{allocationMode} ALLOTMENT</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Format: CLASS|SECTION{institutionType === "college" ? "|DEPARTMENT" : ""}|SUBJECTS
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
                  ? 'Subjects format: MATH:4,ENGLISH:3,CS:2 (subject:hours, comma separated)'
                  : 'Subjects format: MATH:CORE,ENGLISH:CORE,CS:ALLIED (type can be CORE, ALLIED, or SEC)'}
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
              <Label>CLASS NAME</Label>
              <Input
                ref={classNameRef}
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                onKeyDown={(e) => handleKeyPress(e, sectionRef)}
                className="uppercase-input"
                placeholder={institutionType === "school" ? "10" : "III BCA"}
              />
            </div>
            <div className="space-y-2">
              <Label>SECTION</Label>
              <Input
                ref={sectionRef}
                value={section}
                onChange={(e) => setSection(e.target.value)}
                onKeyDown={(e) => handleKeyPress(e, institutionType === "college" ? departmentRef : subjectNameRef)}
                className="uppercase-input"
                placeholder="A"
              />
            </div>
            {institutionType === "college" && (
              <div className="space-y-2">
                <Label>DEPARTMENT</Label>
                <Input
                  ref={departmentRef}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, subjectNameRef)}
                  className="uppercase-input"
                  placeholder="BCA"
                />
              </div>
            )}
          </div>

          {/* Subject input */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <Label>SUBJECTS</Label>
              {allocationMode === "custom" && (
                <span className="text-xs text-muted-foreground">
                  Total: {subjects.reduce((sum, s) => sum + (s.hours || 0), 0)} / {days * hoursPerDay} slots
                </span>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                ref={subjectNameRef}
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSubject();
                  }
                }}
                className="uppercase-input flex-1"
                placeholder="Subject name"
              />
              {allocationMode === "default" ? (
                <Select value={subjectType} onValueChange={(v) => setSubjectType(v as SubjectType)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CORE">CORE</SelectItem>
                    <SelectItem value="ALLIED">ALLIED</SelectItem>
                    <SelectItem value="SEC">SEC</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="number"
                  value={subjectHours}
                  onChange={(e) => setSubjectHours(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max={days * hoursPerDay}
                  className="w-24"
                  placeholder="Hours"
                />
              )}
              <Button onClick={addSubject} size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {subjects.map((s, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`chip ${allocationMode === "default" ? chipColor(s.type) : "bg-accent/20 text-accent border border-accent/30"}`}
                >
                  {s.name} {allocationMode === "default" ? `(${s.type})` : `(${s.hours}h)`}
                  <button onClick={() => removeSubject(i)}>
                    <X className="h-3 w-3" />
                  </button>
                </motion.span>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSaveClass}
            className="mt-6 bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-purple-500/40"
          >
            {editIndex !== null ? "UPDATE CLASS" : "ADD CLASS"}
          </Button>
        </motion.div>

        {/* Classes table */}
        {classes.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card rounded-2xl mt-6 overflow-hidden"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-primary/10 to-accent/10">
                  <TableHead>CLASS</TableHead>
                  <TableHead>SECTION</TableHead>
                  {institutionType === "college" && <TableHead>DEPARTMENT</TableHead>}
                  <TableHead>SUBJECTS</TableHead>
                  <TableHead className="w-24">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((c, i) => (
                  <TableRow key={i} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{c.className}</TableCell>
                    <TableCell>{c.section}</TableCell>
                    {institutionType === "college" && <TableCell>{c.department}</TableCell>}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.subjects.map((s, j) => (
                          <span key={j} className={`chip ${allocationMode === "default" ? chipColor(s.type) : "bg-accent/20 text-accent border border-accent/30"} text-[10px]`}>
                            {s.name} {allocationMode === "default" ? "" : `(${s.hours}h)`}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(i)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => removeClass(i)}>
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
              if (classes.length === 0) {
                toast.error("Add at least one class");
                return;
              }
              navigate("/create/staff");
            }}
            className="bg-gradient-to-r from-accent to-accent-dark hover:shadow-lg hover:shadow-orange-500/40 px-8"
          >
            NEXT → STAFF DETAILS
          </Button>
        </div>
      </div>
    </div>
  );
}
