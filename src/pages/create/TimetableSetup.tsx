import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTimetableStore } from "@/lib/timetable-store";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2, AlertTriangle } from "lucide-react";
import BackButton from "@/components/BackButton";
import { toast } from "sonner";

export default function TimetableSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const store = useTimetableStore();
  const [loading, setLoading] = useState(false);

  // Check for subjects without staff
  const allSubjects = Array.from(new Set(store.classes.flatMap((c) => c.subjects.map((s) => s.name))));
  const staffSubjects = new Set(store.staff.flatMap((s) => s.subjects));
  const unassigned = allSubjects.filter((s) => !staffSubjects.has(s));

  const handleGenerate = async () => {
    if (!store.timetableName.trim()) {
      toast.error("Enter a timetable name");
      return;
    }
    setLoading(true);

    try {
      const userId = user!.id;
      const institutionId = store.institutionId!;

      // Save classes and subjects to DB
      const classIds: Record<string, string> = {};
      const subjectIds: Record<string, string> = {};

      for (const cls of store.classes) {
        const { data: classData, error: classErr } = await supabase
          .from("classes")
          .insert({
            user_id: userId,
            institution_id: institutionId,
            class_name: cls.className,
            section: cls.section,
            department: cls.department || null,
          })
          .select()
          .single();
        if (classErr) throw classErr;
        classIds[`${cls.className}-${cls.section}`] = classData.id;

        for (const sub of cls.subjects) {
          const { data: subData, error: subErr } = await supabase
            .from("subjects")
            .insert({
              user_id: userId,
              class_id: classData.id,
              name: sub.name,
              type: sub.type,
            })
            .select()
            .single();
          if (subErr) throw subErr;
          subjectIds[`${classData.id}-${sub.name}`] = subData.id;
        }
      }

      // Save staff
      const staffIds: Record<string, string> = {};
      for (const st of store.staff) {
        const { data: staffData, error: staffErr } = await supabase
          .from("staff")
          .insert({
            user_id: userId,
            institution_id: institutionId,
            name: st.name,
            department: st.department || null,
          })
          .select()
          .single();
        if (staffErr) throw staffErr;
        staffIds[st.name] = staffData.id;

        // Map staff to subjects
        for (const subName of st.subjects) {
          // find subject IDs that match this name
          const matchingKeys = Object.keys(subjectIds).filter((k) => k.endsWith(`-${subName}`));
          for (const key of matchingKeys) {
            await supabase.from("staff_subjects").insert({
              staff_id: staffData.id,
              subject_id: subjectIds[key],
              user_id: userId,
            });
          }
        }
      }

      // Create timetable
      const { data: ttData, error: ttErr } = await supabase
        .from("timetables")
        .insert({
          user_id: userId,
          institution_id: institutionId,
          name: store.timetableName.toUpperCase(),
          days: store.days,
          hours_per_day: store.hoursPerDay,
        })
        .select()
        .single();
      if (ttErr) throw ttErr;

      // Call edge function to generate timetable
      const { data: genData, error: genErr } = await supabase.functions.invoke("generate-timetable", {
        body: { timetableId: ttData.id },
      });

      if (genErr) throw genErr;

      toast.success("Timetable generated successfully!");
      store.reset();
      navigate(`/timetable/${ttData.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate timetable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background hero-grid p-6">
      <div className="max-w-3xl mx-auto">
        <BackButton to="/create/staff" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <h1 className="font-display text-3xl font-bold text-primary">TIMETABLE SETUP</h1>
          <p className="text-muted-foreground mt-1">Configure and generate your timetable</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-6 mt-6 space-y-6"
        >
          <div className="space-y-2">
            <Label>TIMETABLE NAME</Label>
            <Input
              value={store.timetableName}
              onChange={(e) => store.setTimetableName(e.target.value)}
              className="uppercase-input"
              placeholder="TNC 2026 TIMETABLE"
            />
          </div>

          <div className="space-y-3">
            <Label>NUMBER OF DAYS: {store.days}</Label>
            <Slider
              value={[store.days]}
              onValueChange={([v]) => store.setDays(v)}
              min={4}
              max={8}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>4</span><span>5</span><span>6</span><span>7</span><span>8</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label>HOURS PER DAY: {store.hoursPerDay}</Label>
            <Slider
              value={[store.hoursPerDay]}
              onValueChange={([v]) => store.setHoursPerDay(v)}
              min={4}
              max={8}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>4</span><span>5</span><span>6</span><span>7</span><span>8</span>
            </div>
          </div>

          {unassigned.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Unassigned subjects</p>
                <p className="text-xs text-amber-600 mt-1">
                  The following subjects have no staff: {unassigned.join(", ")}
                </p>
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground space-y-1">
            <p>• {store.classes.length} class(es) configured</p>
            <p>• {store.staff.length} staff member(s) configured</p>
            <p>• {allSubjects.length} unique subject(s)</p>
          </div>
        </motion.div>

        <div className="mt-8 flex justify-end">
          <Button onClick={handleGenerate} disabled={loading} className="btn-glow px-8" size="lg">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            GENERATE TIMETABLE
          </Button>
        </div>
      </div>
    </div>
  );
}
