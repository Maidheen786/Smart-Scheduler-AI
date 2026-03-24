import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Users, Loader2 } from "lucide-react";
import BackButton from "@/components/BackButton";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface TimetableData {
  id: string;
  name: string;
  days: number;
  hours_per_day: number;
}

interface SlotData {
  day: number;
  hour: number;
  class_id: string;
  subject_id: string | null;
  staff_id: string | null;
  is_free: boolean;
}

interface ClassInfo { id: string; class_name: string; section: string; department: string | null; }
interface SubjectInfo { id: string; name: string; type: string; }
interface StaffInfo { id: string; name: string; }

const DAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN", "DAY 8"];

export default function TimetableView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [staffList, setStaffList] = useState<StaffInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"class" | "staff">("class");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    loadData();
  }, [user, id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ttRes, slotRes, classRes, subRes, staffRes] = await Promise.all([
        supabase.from("timetables").select("*").eq("id", id!).single(),
        supabase.from("timetable_slots").select("*").eq("timetable_id", id!),
        supabase.from("classes").select("*").eq("user_id", user!.id),
        supabase.from("subjects").select("*").eq("user_id", user!.id),
        supabase.from("staff").select("*").eq("user_id", user!.id),
      ]);

      if (ttRes.error) throw ttRes.error;
      setTimetable(ttRes.data as TimetableData);
      setSlots((slotRes.data || []) as SlotData[]);
      setClasses((classRes.data || []) as ClassInfo[]);
      setSubjects((subRes.data || []) as SubjectInfo[]);
      setStaffList((staffRes.data || []) as StaffInfo[]);

      // Auto-select first class
      const ttClasses = [...new Set((slotRes.data || []).map((s: any) => s.class_id))];
      if (ttClasses.length > 0) setSelectedClass(ttClasses[0] as string);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSubjectName = (id: string | null) => subjects.find((s) => s.id === id)?.name || "";
  const getStaffName = (id: string | null) => staffList.find((s) => s.id === id)?.name || "";
  const getClassName = (id: string) => {
    const c = classes.find((cl) => cl.id === id);
    return c ? `${c.class_name} ${c.section}` : "";
  };

  const ttClasses = [...new Set(slots.map((s) => s.class_id))];
  const hours = Array.from({ length: timetable?.hours_per_day || 0 }, (_, i) => i + 1);
  const days = Array.from({ length: timetable?.days || 0 }, (_, i) => i);

  const getSlot = (classId: string, day: number, hour: number) =>
    slots.find((s) => s.class_id === classId && s.day === day && s.hour === hour);

  const downloadPDF = () => {
    if (!timetable) return;
    const doc = new jsPDF({ orientation: "landscape" });

    if (viewMode === "class" && selectedClass) {
      doc.setFontSize(16);
      doc.text(`${timetable.name} - ${getClassName(selectedClass)}`, 14, 15);

      const tableData = days.map((d) =>
        [DAY_NAMES[d], ...hours.map((h) => {
          const slot = getSlot(selectedClass, d, h);
          if (!slot || slot.is_free) return "FREE";
          return `${getSubjectName(slot.subject_id)}\n${getStaffName(slot.staff_id)}`;
        })]
      );

      autoTable(doc, {
        head: [["DAY", ...hours.map((h) => `HOUR ${h}`)]],
        body: tableData,
        startY: 22,
        styles: { fontSize: 8, cellPadding: 3 },
      });
    }

    doc.save(`${timetable.name}.pdf`);
    toast.success("PDF downloaded");
  };

  const downloadExcel = () => {
    if (!timetable) return;
    const wb = XLSX.utils.book_new();

    if (viewMode === "class" && selectedClass) {
      const data = [
        ["DAY", ...hours.map((h) => `HOUR ${h}`)],
        ...days.map((d) => [
          DAY_NAMES[d],
          ...hours.map((h) => {
            const slot = getSlot(selectedClass, d, h);
            if (!slot || slot.is_free) return "FREE";
            return `${getSubjectName(slot.subject_id)} (${getStaffName(slot.staff_id)})`;
          }),
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, getClassName(selectedClass));
    }

    XLSX.writeFile(wb, `${timetable.name}.xlsx`);
    toast.success("Excel downloaded");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!timetable) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Timetable not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background hero-grid p-6">
      <div className="max-w-7xl mx-auto">
        <BackButton to="/timetables" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-primary">{timetable.name}</h1>
              <p className="text-muted-foreground mt-1">{timetable.days} days × {timetable.hours_per_day} hours</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "class" ? "default" : "outline"}
                onClick={() => setViewMode("class")}
              >
                CLASS VIEW
              </Button>
              <Button
                variant={viewMode === "staff" ? "default" : "outline"}
                onClick={() => setViewMode("staff")}
                className="gap-2"
              >
                <Users className="h-4 w-4" /> STAFF VIEW
              </Button>
              <Button variant="outline" onClick={downloadPDF} className="gap-2">
                <Download className="h-4 w-4" /> PDF
              </Button>
              <Button variant="outline" onClick={downloadExcel} className="gap-2">
                <Download className="h-4 w-4" /> EXCEL
              </Button>
            </div>
          </div>
        </motion.div>

        {viewMode === "class" && (
          <>
            <div className="flex flex-wrap gap-2 mt-6">
              {ttClasses.map((cId) => (
                <Button
                  key={cId}
                  variant={selectedClass === cId ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedClass(cId)}
                >
                  {getClassName(cId)}
                </Button>
              ))}
            </div>

            {selectedClass && (
              <motion.div
                key={selectedClass}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card rounded-2xl mt-6 overflow-hidden"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>DAY</TableHead>
                      {hours.map((h) => (
                        <TableHead key={h} className="text-center">HOUR {h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {days.map((d) => (
                      <TableRow key={d} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">{DAY_NAMES[d]}</TableCell>
                        {hours.map((h) => {
                          const slot = getSlot(selectedClass, d, h);
                          return (
                            <TableCell key={h} className="text-center">
                              {slot?.is_free ? (
                                <span className="text-muted-foreground text-xs">FREE</span>
                              ) : slot ? (
                                <div>
                                  <div className="font-medium text-xs">{getSubjectName(slot.subject_id)}</div>
                                  <div className="text-[10px] text-muted-foreground">{getStaffName(slot.staff_id)}</div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </motion.div>
            )}
          </>
        )}

        {viewMode === "staff" && (
          <div className="mt-6 space-y-6">
            {staffList
              .filter((st) => slots.some((s) => s.staff_id === st.id))
              .map((st) => (
                <motion.div key={st.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl overflow-hidden">
                  <div className="p-4 border-b bg-muted/30">
                    <h3 className="font-display font-semibold text-lg">{st.name}</h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>DAY</TableHead>
                        {hours.map((h) => (
                          <TableHead key={h} className="text-center">HOUR {h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {days.map((d) => (
                        <TableRow key={d}>
                          <TableCell className="font-medium">{DAY_NAMES[d]}</TableCell>
                          {hours.map((h) => {
                            const slot = slots.find(
                              (s) => s.staff_id === st.id && s.day === d && s.hour === h
                            );
                            return (
                              <TableCell key={h} className="text-center">
                                {slot ? (
                                  <div>
                                    <div className="font-medium text-xs">{getSubjectName(slot.subject_id)}</div>
                                    <div className="text-[10px] text-muted-foreground">{getClassName(slot.class_id)}</div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs">FREE</span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </motion.div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
