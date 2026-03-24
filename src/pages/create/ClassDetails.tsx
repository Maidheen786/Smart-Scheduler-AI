import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTimetableStore, ClassEntry, SubjectEntry, SubjectType } from "@/lib/timetable-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, Plus, Pencil, Trash2 } from "lucide-react";
import BackButton from "@/components/BackButton";
import { toast } from "sonner";

export default function ClassDetails() {
  const navigate = useNavigate();
  const { institutionType, classes, addClass, updateClass, removeClass } = useTimetableStore();

  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [department, setDepartment] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectType, setSubjectType] = useState<SubjectType>("CORE");
  const [subjects, setSubjects] = useState<SubjectEntry[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const addSubject = () => {
    if (!subjectName.trim()) return;
    setSubjects([...subjects, { name: subjectName.trim().toUpperCase(), type: subjectType }]);
    setSubjectName("");
  };

  const removeSubject = (i: number) => setSubjects(subjects.filter((_, idx) => idx !== i));

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
    toast.success("Class saved");
  };

  const handleEdit = (i: number) => {
    const c = classes[i];
    setClassName(c.className);
    setSection(c.section);
    setDepartment(c.department || "");
    setSubjects([...c.subjects]);
    setEditIndex(i);
  };

  const chipColor = (type: SubjectType) =>
    type === "CORE" ? "chip-core" : type === "ALLIED" ? "chip-allied" : "chip-sec";

  return (
    <div className="min-h-screen bg-background hero-grid p-6">
      <div className="max-w-5xl mx-auto">
        <BackButton to="/create" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <h1 className="font-display text-3xl font-bold text-primary">CLASS DETAILS</h1>
          <p className="text-muted-foreground mt-1">Add classes and their subjects</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-6 mt-6"
        >
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>CLASS NAME</Label>
              <Input
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="uppercase-input"
                placeholder={institutionType === "school" ? "10" : "III BCA"}
              />
            </div>
            <div className="space-y-2">
              <Label>SECTION</Label>
              <Input
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="uppercase-input"
                placeholder="A"
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

          {/* Subject input */}
          <div className="mt-6">
            <Label>SUBJECTS</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubject()}
                className="uppercase-input flex-1"
                placeholder="Subject name"
              />
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
                  className={`chip ${chipColor(s.type)}`}
                >
                  {s.name} ({s.type})
                  <button onClick={() => removeSubject(i)}>
                    <X className="h-3 w-3" />
                  </button>
                </motion.span>
              ))}
            </div>
          </div>

          <Button onClick={handleSaveClass} className="mt-6 btn-glow">
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
                <TableRow>
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
                          <span key={j} className={`chip ${chipColor(s.type)} text-[10px]`}>
                            {s.name}
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
            className="btn-glow px-8"
          >
            NEXT → STAFF DETAILS
          </Button>
        </div>
      </div>
    </div>
  );
}
