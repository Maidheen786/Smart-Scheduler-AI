import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { timetableId } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch timetable config
    const { data: tt, error: ttErr } = await supabase
      .from("timetables")
      .select("*")
      .eq("id", timetableId)
      .single();
    if (ttErr) throw ttErr;

    const userId = tt.user_id;
    const institutionId = tt.institution_id;
    const days = tt.days;
    const hoursPerDay = tt.hours_per_day;

    // Fetch institution type
    const { data: inst } = await supabase
      .from("institutions")
      .select("type")
      .eq("id", institutionId)
      .single();
    const isCollege = inst?.type === "college";

    // Fetch classes for this institution
    const { data: classes } = await supabase
      .from("classes")
      .select("*")
      .eq("institution_id", institutionId)
      .eq("user_id", userId);

    // Fetch subjects for these classes
    const classIds = (classes || []).map((c: any) => c.id);
    const { data: subjects } = await supabase
      .from("subjects")
      .select("*")
      .in("class_id", classIds);

    // Fetch staff
    const { data: staff } = await supabase
      .from("staff")
      .select("*")
      .eq("institution_id", institutionId)
      .eq("user_id", userId);

    // Fetch staff-subject mappings
    const staffIds = (staff || []).map((s: any) => s.id);
    const { data: staffSubjects } = await supabase
      .from("staff_subjects")
      .select("*")
      .in("staff_id", staffIds);

    // Build data structures
    interface SubjectInfo {
      id: string;
      name: string;
      type: string;
      classId: string;
    }

    interface StaffAssignment {
      staffId: string;
      subjectId: string;
    }

    const subjectList: SubjectInfo[] = (subjects || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      classId: s.class_id,
    }));

    const staffSubjectMap: StaffAssignment[] = (staffSubjects || []).map((ss: any) => ({
      staffId: ss.staff_id,
      subjectId: ss.subject_id,
    }));

    // For each class, determine hours per subject
    const slots: any[] = [];

    for (const cls of (classes || [])) {
      const classSubjects = subjectList.filter((s) => s.classId === cls.id);
      const coreAllied = classSubjects.filter((s) => s.type === "CORE" || s.type === "ALLIED");
      const sec = classSubjects.filter((s) => s.type === "SEC");

      const totalSlots = days * hoursPerDay;
      const secHours = sec.length * 2; // 2 hours per SEC subject
      const remainingHours = totalSlots - secHours;

      // Distribute remaining hours equally among CORE/ALLIED
      const hoursPerCoreAllied = coreAllied.length > 0
        ? Math.floor(remainingHours / coreAllied.length)
        : 0;
      let extraHours = coreAllied.length > 0
        ? remainingHours - hoursPerCoreAllied * coreAllied.length
        : remainingHours;

      // **CONSISTENCY FIX:** Pre-assign each subject to a specific staff member
      interface SubjectStaffAssignment {
        subjectId: string;
        primaryStaffId: string | null;
        alternativeStaffIds: string[];
        hoursNeeded: number;
      }

      const subjectStaffMap: Record<string, SubjectStaffAssignment> = {};

      for (const sub of coreAllied) {
        const h = hoursPerCoreAllied + (extraHours > 0 ? 1 : 0);
        if (extraHours > 0) extraHours--;

        // Find all qualified staff for this subject
        const possibleStaff = staffSubjectMap
          .filter((ss) => ss.subjectId === sub.id)
          .map((ss) => ss.staffId);

        // Pick PRIMARY staff for this subject
        let primaryStaffId: string | null = null;
        if (isCollege && cls.department) {
          const deptStaff = (staff || []).filter(
            (s: any) => s.department === cls.department && possibleStaff.includes(s.id)
          );
          if (deptStaff.length > 0) primaryStaffId = deptStaff[0].id;
        }
        if (!primaryStaffId && possibleStaff.length > 0) {
          primaryStaffId = possibleStaff[0];
        }

        subjectStaffMap[sub.id] = {
          subjectId: sub.id,
          primaryStaffId,
          alternativeStaffIds: possibleStaff.filter((s) => s !== primaryStaffId),
          hoursNeeded: h,
        };
      }

      for (const sub of sec) {
        const possibleStaff = staffSubjectMap
          .filter((ss) => ss.subjectId === sub.id)
          .map((ss) => ss.staffId);

        const primaryStaffId = possibleStaff.length > 0 ? possibleStaff[0] : null;

        subjectStaffMap[sub.id] = {
          subjectId: sub.id,
          primaryStaffId,
          alternativeStaffIds: possibleStaff.filter((s) => s !== primaryStaffId),
          hoursNeeded: 2,
        };
      }

      // Build assignment list preserving subject-staff consistency
      interface SlotAssignment {
        subjectId: string;
        primaryStaffId: string | null;
        alternativeStaffIds: string[];
      }

      const assignmentList: SlotAssignment[] = [];

      for (const subId in subjectStaffMap) {
        const assignment = subjectStaffMap[subId];
        for (let i = 0; i < assignment.hoursNeeded; i++) {
          assignmentList.push({
            subjectId: assignment.subjectId,
            primaryStaffId: assignment.primaryStaffId,
            alternativeStaffIds: assignment.alternativeStaffIds,
          });
        }
      }

      // Shuffle to randomize placement
      for (let i = assignmentList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [assignmentList[i], assignmentList[j]] = [assignmentList[j], assignmentList[i]];
      }

      // Place into grid, maintaining staff consistency for each subject
      const staffSchedule: Record<string, Set<string>> = {};
      let assignIdx = 0;

      for (let d = 0; d < days; d++) {
        for (let h = 1; h <= hoursPerDay; h++) {
          if (assignIdx >= assignmentList.length) {
            // Free slot
            slots.push({
              timetable_id: timetableId,
              user_id: userId,
              class_id: cls.id,
              day: d,
              hour: h,
              subject_id: null,
              staff_id: null,
              is_free: true,
            });
            continue;
          }

          const assignment = assignmentList[assignIdx];
          const slotKey = `${d}-${h}`;
          let selectedStaffId: string | null = assignment.primaryStaffId;

          // Check if primary staff is available
          if (selectedStaffId) {
            if (!staffSchedule[selectedStaffId]) staffSchedule[selectedStaffId] = new Set();
            if (staffSchedule[selectedStaffId].has(slotKey)) {
              // Primary staff has a clash, try alternatives
              selectedStaffId = null;
              for (const altStaffId of assignment.alternativeStaffIds) {
                if (!staffSchedule[altStaffId]) staffSchedule[altStaffId] = new Set();
                if (!staffSchedule[altStaffId].has(slotKey)) {
                  selectedStaffId = altStaffId;
                  break;
                }
              }
            }
          }

          // Add to staff schedule if assigned
          if (selectedStaffId) {
            if (!staffSchedule[selectedStaffId]) staffSchedule[selectedStaffId] = new Set();
            staffSchedule[selectedStaffId].add(slotKey);
          }

          slots.push({
            timetable_id: timetableId,
            user_id: userId,
            class_id: cls.id,
            day: d,
            hour: h,
            subject_id: assignment.subjectId,
            staff_id: selectedStaffId,
            is_free: false,
          });
          assignIdx++;
        }
      }
    }

    // Insert slots in batches
    const batchSize = 100;
    for (let i = 0; i < slots.length; i += batchSize) {
      const batch = slots.slice(i, i + batchSize);
      const { error: insertErr } = await supabase.from("timetable_slots").insert(batch);
      if (insertErr) throw insertErr;
    }

    return new Response(JSON.stringify({ success: true, slotsCreated: slots.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-timetable error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
