import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Users, Loader2, Image } from "lucide-react";
import BackButton from "@/components/BackButton";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";

interface TimetableData {
  id: string;
  name: string;
  days: number;
  hours_per_day: number;
  theme?: string;
}

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

const THEME_MAP: Record<string, ThemeColors> = {
  // Dark Themes
  "dark-midnight": { primary: "#1e293b", secondary: "#334155", accent: "#64748b" },
  "dark-noir": { primary: "#0f172a", secondary: "#1e293b", accent: "#475569" },
  "dark-ocean": { primary: "#082f49", secondary: "#0c4a6e", accent: "#0ea5e9" },
  "dark-forest": { primary: "#14532d", secondary: "#166534", accent: "#22c55e" },
  "dark-sunset": { primary: "#7c2d12", secondary: "#92400e", accent: "#f97316" },
  "dark-purple": { primary: "#3f0f5c", secondary: "#581c87", accent: "#a855f7" },
  "dark-crimson": { primary: "#450a0a", secondary: "#7f1d1d", accent: "#dc2626" },
  // Light Themes
  "light-fresh": { primary: "#e0f2fe", secondary: "#cffafe", accent: "#06b6d4" },
  "light-meadow": { primary: "#f0fdf4", secondary: "#dcfce7", accent: "#22c55e" },
  "light-blush": { primary: "#fdf2f8", secondary: "#fbecf8", accent: "#ec4899" },
  "light-lavender": { primary: "#f3e8ff", secondary: "#ede9fe", accent: "#a78bfa" },
  "light-cream": { primary: "#fffbeb", secondary: "#fef3c7", accent: "#f59e0b" },
  "light-mint": { primary: "#f0fdfa", secondary: "#ccfbf1", accent: "#14b8a6" },
  "light-rose": { primary: "#ffe4e6", secondary: "#ffd6db", accent: "#f43f5e" },
  // Modern Themes
  "modern-gradient": { primary: "#6366f1", secondary: "#06b6d4", accent: "#8b5cf6" },
  "modern-neon": { primary: "#00ff00", secondary: "#00ffff", accent: "#ff00ff" },
  "modern-cyber": { primary: "#0080ff", secondary: "#00ffff", accent: "#ff0080" },
  "modern-retro": { primary: "#ff6b6b", secondary: "#ffd93d", accent: "#6bcf7f" },
  "modern-fusion": { primary: "#ff006e", secondary: "#8338ec", accent: "#fb5607" },
  "modern-minimal": { primary: "#1a1a1a", secondary: "#666666", accent: "#00d9ff" },
  "modern-vibrant": { primary: "#ff3366", secondary: "#00cc99", accent: "#ffcc00" },
  // Classic Themes
  "classic-navy": { primary: "#001f3f", secondary: "#003d82", accent: "#0074d9" },
  "classic-burgundy": { primary: "#5c2c2c", secondary: "#8b3e3e", accent: "#d64545" },
  "classic-teal": { primary: "#0d5d56", secondary: "#155e75", accent: "#06b6d4" },
  "classic-olive": { primary: "#3e3b28", secondary: "#555d50", accent: "#808000" },
  "classic-plum": { primary: "#423e5f", secondary: "#6b5b95", accent: "#9d84b7" },
  "classic-coral": { primary: "#8b4513", secondary: "#cd853f", accent: "#ff7f50" },
  "classic-slate": { primary: "#2c3e50", secondary: "#34495e", accent: "#95a5a6" },
  // Beautiful Themes
  "beautiful-sunset": { primary: "#ff6b35", secondary: "#ffd662", accent: "#f7931e" },
  "beautiful-aurora": { primary: "#00d4ff", secondary: "#00ff85", accent: "#ff0080" },
  "beautiful-opal": { primary: "#a0d995", secondary: "#d5f4e6", accent: "#81c3d7" },
  "beautiful-sapphire": { primary: "#0f3460", secondary: "#16213e", accent: "#e94560" },
  "beautiful-celestial": { primary: "#2a1a4e", secondary: "#5a2a7a", accent: "#b366ff" },
  "beautiful-garden": { primary: "#2d5016", secondary: "#5a8c3a", accent: "#a4de6c" },
  "beautiful-pearl": { primary: "#e8dcc8", secondary: "#f5e6d3", accent: "#c1a384" },
};

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

const DAY_NAMES = (days: number) => Array.from({ length: days }, (_, i) => `Day ${i + 1}`);

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
  const timetableRef = useRef<HTMLDivElement>(null);

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
  const dayNames = timetable ? DAY_NAMES(timetable.days) : [];

  const getSlot = (classId: string, day: number, hour: number) => {
    // Hours are displayed as 1-indexed but stored as 0-indexed
    const dbHour = hour - 1;
    return slots.find((s) => s.class_id === classId && s.day === day && s.hour === dbHour);
  };

  const downloadPDF = () => {
    if (!timetable) return;

    if (viewMode === "class") {
      downloadClassPDF();
    } else if (viewMode === "staff") {
      downloadStaffPDF();
    }
  };

  const downloadClassPDF = () => {
    if (!timetable || !selectedClass) return;
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(16);
    doc.text(`${timetable.name} - ${getClassName(selectedClass)}`, 14, 15);

    const tableData = days.map((d) =>
      [dayNames[d], ...hours.map((h) => {
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

    doc.save(`${timetable.name}-class-view.pdf`);
    toast.success("Class PDF downloaded");
  };

  const downloadStaffPDF = () => {
    if (!timetable) return;
    const doc = new jsPDF({ orientation: "landscape" });
    let pageCount = 0;

    const staffWithClasses = staffList.filter((st) =>
      slots.some((s) => s.staff_id === st.id)
    );

    if (staffWithClasses.length === 0) {
      toast.error("No staff schedules found");
      return;
    }

    staffWithClasses.forEach((st, index) => {
      if (index > 0) {
        doc.addPage();
      }

      doc.setFontSize(16);
      doc.text(`${timetable.name} - ${st.name}`, 14, 15);

      const tableData = days.map((d) =>
        [dayNames[d], ...hours.map((h) => {
          const slot = slots.find((s) => s.staff_id === st.id && s.day === d && s.hour === h - 1);
          if (!slot) return "FREE";
          return `${getSubjectName(slot.subject_id)}\n${getClassName(slot.class_id)}`;
        })]
      );

      autoTable(doc, {
        head: [["DAY", ...hours.map((h) => `HOUR ${h}`)]],
        body: tableData,
        startY: 22,
        styles: { fontSize: 8, cellPadding: 3 },
      });

      pageCount++;
    });

    doc.save(`${timetable.name}-staff-view.pdf`);
    toast.success(`Staff PDF downloaded (${pageCount} pages)`);
  };

  const downloadExcel = () => {
    if (!timetable) return;

    if (viewMode === "class") {
      downloadClassExcel();
    } else if (viewMode === "staff") {
      downloadStaffExcel();
    }
  };

  const downloadClassExcel = () => {
    if (!timetable || !selectedClass) return;
    const wb = XLSX.utils.book_new();

    const data = [
      ["DAY", ...hours.map((h) => `HOUR ${h}`)],
      ...days.map((d) => [
        dayNames[d],
        ...hours.map((h) => {
          const slot = getSlot(selectedClass, d, h);
          if (!slot || slot.is_free) return "FREE";
          return `${getSubjectName(slot.subject_id)} (${getStaffName(slot.staff_id)})`;
        }),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, getClassName(selectedClass));

    XLSX.writeFile(wb, `${timetable.name}-class-view.xlsx`);
    toast.success("Class Excel downloaded");
  };

  const downloadStaffExcel = () => {
    if (!timetable) return;
    const wb = XLSX.utils.book_new();

    const staffWithClasses = staffList.filter((st) =>
      slots.some((s) => s.staff_id === st.id)
    );

    if (staffWithClasses.length === 0) {
      toast.error("No staff schedules found");
      return;
    }

    // Build all data in a single sheet with spacing between staff
    const allData: any[] = [];

    staffWithClasses.forEach((st, staffIndex) => {
      // Add staff name header
      allData.push([st.name, "", "", "", "", "", ""]);
      
      // Add column headers
      allData.push(["DAY", ...hours.map((h) => `HOUR ${h}`)]);
      
      // Add schedule rows
      days.forEach((d) => {
        allData.push([
          dayNames[d],
          ...hours.map((h) => {
            const slot = slots.find((s) => s.staff_id === st.id && s.day === d && s.hour === h - 1);
            if (!slot) return "FREE";
            return `${getSubjectName(slot.subject_id)} (${getClassName(slot.class_id)})`;
          }),
        ]);
      });

      // Add 2 blank rows between staff (except after last staff)
      if (staffIndex < staffWithClasses.length - 1) {
        allData.push([]);
        allData.push([]);
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(allData);
    XLSX.utils.book_append_sheet(wb, ws, "Staff Schedules");

    XLSX.writeFile(wb, `${timetable.name}-staff-schedules.xlsx`);
    toast.success(`Staff Excel downloaded (${staffWithClasses.length} staff)`);
  };

  const downloadImage = async () => {
    if (!timetable) return;

    if (viewMode === "class") {
      await downloadClassImage();
    } else if (viewMode === "staff") {
      await downloadStaffImage();
    }
  };

  const downloadClassImage = async () => {
    if (!timetable || !selectedClass) return;

    try {
      const element = document.getElementById("class-timetable-content");
      if (!element) {
        toast.error("Timetable content not found");
        return;
      }

      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${timetable.name}-${getClassName(selectedClass)}-timetable.png`;
      link.click();
      toast.success("Class image downloaded");
    } catch (err: any) {
      console.error("Image generation error:", err);
      toast.error("Failed to generate image");
    }
  };

  const downloadStaffImage = async () => {
    if (!timetable) return;

    try {
      const staffWithClasses = staffList.filter((st) =>
        slots.some((s) => s.staff_id === st.id)
      );

      if (staffWithClasses.length === 0) {
        toast.error("No staff schedules found");
        return;
      }

      // Create a temporary container to hold all staff schedules
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "fixed";
      tempContainer.style.left = "-9999px";
      tempContainer.style.backgroundColor = "white";
      tempContainer.style.padding = "40px";

      // Manually build the HTML for all staff
      let html = `<div style="font-family: Arial, sans-serif;">
        <h2 style="text-align: center; margin-bottom: 30px; color: #1a1a1a; font-size: 24px;">${timetable.name} - Staff Schedules</h2>`;

      staffWithClasses.forEach((st, staffIndex) => {
        html += `<div style="margin-bottom: 40px; page-break-after: always;">
          <h3 style="background-color: #f0f0f0; padding: 10px; margin: 0 0 10px 0; font-size: 18px; color: #333;">${st.name}</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background-color: #e0e0e0;">
                <th style="border: 1px solid #999; padding: 8px; text-align: center; font-weight: bold;">DAY</th>`;

        hours.forEach((h) => {
          html += `<th style="border: 1px solid #999; padding: 8px; text-align: center; font-weight: bold;">HOUR ${h}</th>`;
        });

        html += `</tr></thead><tbody>`;

        days.forEach((d) => {
          html += `<tr><td style="border: 1px solid #999; padding: 8px; font-weight: bold;">${dayNames[d]}</td>`;
          hours.forEach((h) => {
            const slot = slots.find((s) => s.staff_id === st.id && s.day === d && s.hour === h - 1);
            const cellContent = slot ? `${getSubjectName(slot.subject_id)}<br/><span style="color: #666; font-size: 10px;">${getClassName(slot.class_id)}</span>` : "FREE";
            html += `<td style="border: 1px solid #999; padding: 8px; text-align: center;">${cellContent}</td>`;
          });
          html += `</tr>`;
        });

        html += `</tbody></table></div>`;
      });

      html += `</div>`;
      tempContainer.innerHTML = html;
      document.body.appendChild(tempContainer);

      const canvas = await html2canvas(tempContainer, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${timetable.name}-staff-schedules.png`;
      link.click();

      document.body.removeChild(tempContainer);
      toast.success("Staff image downloaded");
    } catch (err: any) {
      console.error("Image generation error:", err);
      toast.error("Failed to generate image");
    }
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

  const themeColors = timetable?.theme ? THEME_MAP[timetable.theme] || THEME_MAP["modern-neon"] : THEME_MAP["modern-neon"];
  const themeStyle = {
    "--theme-primary": themeColors.primary,
    "--theme-secondary": themeColors.secondary,
    "--theme-accent": themeColors.accent,
  } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-background hero-grid p-6" style={themeStyle}>
      <div className="max-w-7xl mx-auto">
        <BackButton to="/timetables" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 
                className="font-display text-3xl font-bold" 
                style={{ color: themeColors.primary }}
              >
                {timetable.name}
              </h1>
              <p className="text-muted-foreground mt-1">{timetable.days} days × {timetable.hours_per_day} hours</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "class" ? "default" : "outline"}
                onClick={() => setViewMode("class")}
                style={viewMode === "class" ? { backgroundColor: themeColors.primary, borderColor: themeColors.primary } : {}}
              >
                CLASS VIEW
              </Button>
              <Button
                variant={viewMode === "staff" ? "default" : "outline"}
                onClick={() => setViewMode("staff")}
                className="gap-2"
                style={viewMode === "staff" ? { backgroundColor: themeColors.primary, borderColor: themeColors.primary } : {}}
              >
                <Users className="h-4 w-4" /> STAFF VIEW
              </Button>
              <Button variant="outline" onClick={downloadPDF} className="gap-2">
                <Download className="h-4 w-4" /> PDF
              </Button>
              <Button variant="outline" onClick={downloadExcel} className="gap-2">
                <Download className="h-4 w-4" /> EXCEL
              </Button>
              <Button variant="outline" onClick={downloadImage} className="gap-2">
                <Image className="h-4 w-4" /> IMAGE
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
                id="class-timetable-content"
              >
                <Table>
                  <TableHeader style={{ backgroundColor: themeColors.secondary + "20", borderBottom: `2px solid ${themeColors.primary}` }}>
                    <TableRow>
                      <TableHead style={{ color: themeColors.primary, fontWeight: "bold" }}>DAY</TableHead>
                      {hours.map((h) => (
                        <TableHead key={h} className="text-center" style={{ color: themeColors.primary, fontWeight: "bold" }}>HOUR {h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {days.map((d) => (
                      <TableRow key={d} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">{dayNames[d]}</TableCell>
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
                  <div className="p-4 border-b" style={{ backgroundColor: themeColors.secondary + "20", borderBottomColor: themeColors.primary }}>
                    <h3 className="font-display font-semibold text-lg" style={{ color: themeColors.primary }}>{st.name}</h3>
                  </div>
                  <Table>
                    <TableHeader style={{ backgroundColor: themeColors.secondary + "20", borderBottom: `2px solid ${themeColors.primary}` }}>
                      <TableRow>
                        <TableHead style={{ color: themeColors.primary, fontWeight: "bold" }}>DAY</TableHead>
                        {hours.map((h) => (
                          <TableHead key={h} className="text-center" style={{ color: themeColors.primary, fontWeight: "bold" }}>HOUR {h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {days.map((d) => (
                        <TableRow key={d}>
                          <TableCell className="font-medium">{dayNames[d]}</TableCell>
                          {hours.map((h) => {
                            const slot = slots.find(
                              (s) => s.staff_id === st.id && s.day === d && s.hour === h - 1
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
