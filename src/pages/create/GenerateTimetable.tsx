import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTimetableStore } from "@/lib/timetable-store";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import { Loader, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GenerateTimetable() {
  const navigate = useNavigate();
  const store = useTimetableStore();
  const { user } = useAuth();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidationPassed, setIsValidationPassed] = useState(false);

  // Check for subjects without staff
  const allSubjects = Array.from(new Set(store.classes.flatMap((c) => c.subjects.map((s) => s.name))));
  const staffSubjects = new Set(store.staff.flatMap((s) => s.subjects));
  const unassigned = allSubjects.filter((s) => !staffSubjects.has(s));

  // Validate custom allotment BEFORE generation
  useEffect(() => {
    if (store.allocationMode === "custom") {
      const totalSlots = store.days * store.hoursPerDay;
      let errorMsg = "";

      for (const cls of store.classes) {
        const totalHours = cls.subjects.reduce((sum, s) => sum + (s.hours || 0), 0);

        if (totalHours > totalSlots) {
          errorMsg = `❌ Class "${cls.className} ${cls.section}": Total hours (${totalHours}) exceeds available slots (${totalSlots}). Please reduce subject hours.`;
          break;
        }

        if (totalHours < totalSlots) {
          // Show warning but allow to proceed
          toast.warning(`⚠️ Class "${cls.className} ${cls.section}": Total hours (${totalHours}) < available slots (${totalSlots}). ${totalSlots - totalHours} slot(s) will be free.`);
        }
      }

      if (errorMsg) {
        setValidationError(errorMsg);
        setIsValidationPassed(false);
      } else {
        setValidationError(null);
        setIsValidationPassed(true);
      }
    } else {
      setIsValidationPassed(true);
    }
  }, [store.allocationMode, store.classes, store.days, store.hoursPerDay]);

  useEffect(() => {
    // Only generate if validation passed
    if (!isValidationPassed) return;

    // Auto-generate timetable
    const generateTimetable = async () => {
      if (!store.timetableName.trim()) {
        toast.error("Timetable name is missing");
        navigate("/create/theme");
        return;
      }

      if (!user) {
        toast.error("User not authenticated");
        navigate("/auth");
        return;
      }

      try {
        // Save timetable to database
        const { data, error } = await supabase
          .from("timetables")
          .insert({
            user_id: user.id,
            institution_id: store.institutionId,
            name: store.timetableName.toUpperCase(),
            days: store.days,
            hours_per_day: store.hoursPerDay,
            theme: store.theme,
          })
          .select()
          .single();

        if (error) throw error;
        const timetableId = data.id;

        // Save all classes and their subjects in bulk
        const classMap: Record<string, string> = {}; // className_section -> id
        const classesToInsert = store.classes.map((cls) => ({
          user_id: user.id,
          institution_id: store.institutionId,
          class_name: cls.className,
          section: cls.section,
          department: cls.department || null,
        }));

        const { data: classesData, error: classesError } = await supabase
          .from("classes")
          .insert(classesToInsert)
          .select();

        if (classesError) throw classesError;

        // Map classes by key for later use
        classesData?.forEach((cls: any) => {
          classMap[`${cls.class_name}_${cls.section}`] = cls.id;
        });

        // Build subject insert data
        const subjectsToInsert: any[] = [];
        store.classes.forEach((cls) => {
          cls.subjects.forEach((subject) => {
            subjectsToInsert.push({
              user_id: user.id,
              class_id: classMap[`${cls.className}_${cls.section}`],
              name: subject.name,
              type: subject.type,
            });
          });
        });

        if (subjectsToInsert.length > 0) {
          const { error: subError } = await supabase
            .from("subjects")
            .insert(subjectsToInsert);

          if (subError) throw subError;
        }

        // Save all staff in bulk
        const staffMap: Record<string, { id: string; subjects: string[] }> = {};
        const staffToInsert = store.staff.map((s) => ({
          user_id: user.id,
          institution_id: store.institutionId,
          name: s.name,
          department: s.department || null,
        }));

        const { data: staffData, error: staffError } = await supabase
          .from("staff")
          .insert(staffToInsert)
          .select();

        if (staffError) throw staffError;

        // Map staff and their subjects
        staffData?.forEach((s: any) => {
          const staffInfo = store.staff.find((st) => st.name === s.name);
          if (staffInfo) {
            staffMap[s.name] = { id: s.id, subjects: staffInfo.subjects };
          }
        });


        // Query all subjects fresh from database to get IDs
        const { data: allSubjects } = await supabase
          .from("subjects")
          .select("id, name, class_id")
          .eq("user_id", user.id);

        if (!allSubjects || allSubjects.length === 0) {
          throw new Error("Failed to save/retrieve subjects from database");
        }

        console.log(`Retrieved ${allSubjects.length} subjects with IDs`);

        // Build staff-subject mappings using actual subject IDs
        const staffSubjectsToInsert: any[] = [];
        for (const staffName in staffMap) {
          const { id: staffId, subjects } = staffMap[staffName];
          subjects.forEach((staffSubject) => {
            // Find matching subject in database (case-insensitive)
            const found = allSubjects.find((s: any) => 
              s.name.toLowerCase() === staffSubject.toLowerCase()
            );
            if (found) {
              staffSubjectsToInsert.push({
                user_id: user.id,
                staff_id: staffId,
                subject_id: found.id,
              });
            }
          });
        }

        // Remove duplicates in staff-subject mappings
        const uniqueStaffSubjects = Array.from(
          new Map(staffSubjectsToInsert.map(item => [`${item.staff_id}:${item.subject_id}`, item])).values()
        );

        if (uniqueStaffSubjects.length > 0) {
          const { error: mappingError } = await supabase
            .from("staff_subjects")
            .insert(uniqueStaffSubjects);

          if (mappingError) throw mappingError;
        }

        console.log(`Created ${uniqueStaffSubjects.length} staff-subject mappings`);

        // Get staff-subject mappings
        const { data: staffSubjectMaps } = await supabase
          .from("staff_subjects")
          .select("staff_id, subject_id");

        // Get all staff IDs
        const { data: staffDataList } = await supabase
          .from("staff")
          .select("id")
          .eq("user_id", user.id);
        
        const allStaffIds = staffDataList?.map((s: any) => s.id) || [];

        // Build a map of subject IDs by class and name
        const subjectIdMap: Record<string, Record<string, string>> = {};
        (allSubjects || []).forEach((s: any) => {
          if (!subjectIdMap[s.class_id]) subjectIdMap[s.class_id] = {};
          subjectIdMap[s.class_id][s.name.toLowerCase()] = s.id;
        });

        // Generate timetable slots with subject and staff assignments
        const slotsToInsert: any[] = [];
        const staffWorkload: Record<string, number> = {}; // Track hours per staff

        Object.entries(classMap).forEach(([classKey, classId]) => {
          const [className, section] = classKey.split("_");
          const classObj = store.classes.find((c) => c.className === className && c.section === section);
          if (!classObj) return;

          const classSubjects = classObj.subjects;
          if (classSubjects.length === 0) {
            console.warn(`No subjects for class ${classKey}`);
            return;
          }

          console.log(`Generating slots for ${classKey} with ${classSubjects.length} subjects:`, classSubjects.map(s => s.name));

          // Separate CORE/ALLIED subjects from SEC (Elective) subjects
          const coreAlliedSubjects = classSubjects.filter(s => s.type !== "SEC");
          const secSubjects = classSubjects.filter(s => s.type === "SEC");
          
          console.log(`  Core/Allied: ${coreAlliedSubjects.length}, SEC: ${secSubjects.length}`);

          // **CONSISTENCY FIX:** Pre-assign each subject to a specific staff member for this class
          const classSubjectToStaffMap: Record<string, string | null> = {};
          const classSubjectToAlternativesMap: Record<string, string[]> = {};

          for (const subject of classSubjects) {
            const subjectId = subjectIdMap[classId]?.[subject.name.toLowerCase()];
            if (!subjectId) continue;

            // Find all staff qualified for this subject
            const staffMembers = staffSubjectMaps
              ?.filter((m: any) => m.subject_id === subjectId)
              .map((m: any) => m.staff_id) || [];

            // Pick PRIMARY staff for this subject (least workload at this point)
            let assignedStaff: string | null = null;
            if (staffMembers.length > 0) {
              assignedStaff = staffMembers.reduce((prev, cur) => {
                const prevLoad = staffWorkload[prev] || 0;
                const curLoad = staffWorkload[cur] || 0;
                return curLoad < prevLoad ? cur : prev;
              });
              staffWorkload[assignedStaff] = (staffWorkload[assignedStaff] || 0) + 1;
            } else if (allStaffIds.length > 0) {
              // Fallback to any staff with least workload
              assignedStaff = allStaffIds.reduce((prev, cur) => {
                const prevLoad = staffWorkload[prev] || 0;
                const curLoad = staffWorkload[cur] || 0;
                return curLoad < prevLoad ? cur : prev;
              });
              staffWorkload[assignedStaff] = (staffWorkload[assignedStaff] || 0) + 1;
            }

            classSubjectToStaffMap[subjectId] = assignedStaff;
            classSubjectToAlternativesMap[subjectId] = staffMembers.filter(s => s !== assignedStaff);
          }

          // Calculate total slots
          const totalSlots = store.days * store.hoursPerDay;
          
          // Create slot allocation based on mode
          const slotAssignment: (typeof classSubjects[0] | null)[] = new Array(totalSlots).fill(null);

          if (store.allocationMode === "custom") {
            // CUSTOM ALLOTMENT: Distribute hours across different days (mixed allocation)
            const subjectHoursRemaining: Record<string, number> = {};
            classSubjects.forEach(s => {
              subjectHoursRemaining[s.name] = s.hours || 0;
            });

            // Round-robin distribution across all slots
            let slotIndex = 0;
            while (slotIndex < totalSlots && Object.values(subjectHoursRemaining).some(h => h > 0)) {
              for (const subject of classSubjects) {
                if (slotIndex >= totalSlots) break;
                if (subjectHoursRemaining[subject.name] > 0) {
                  slotAssignment[slotIndex] = subject;
                  subjectHoursRemaining[subject.name]--;
                  slotIndex++;
                }
              }
            }

            console.log(`  Custom allotment result: ${slotIndex} slots allocated out of ${totalSlots}`);
          } else {
            // DEFAULT ALLOTMENT: Cycle through subjects
            const secSlotsAllowed = 2;
            let secSlotsUsed = 0;

            for (let slot = 0; slot < totalSlots; slot++) {
              let subject;
              const useSec = secSubjects.length > 0 && secSlotsUsed < secSlotsAllowed;
              
              if (useSec) {
                const secIndex = secSlotsUsed % secSubjects.length;
                subject = secSubjects[secIndex];
                secSlotsUsed++;
              } else {
                if (coreAlliedSubjects.length === 0) {
                  const subjectIndex = slot % classSubjects.length;
                  subject = classSubjects[subjectIndex];
                } else {
                  const nonSecSlotIndex = slot - secSlotsUsed;
                  const subjectIndex = nonSecSlotIndex % coreAlliedSubjects.length;
                  subject = coreAlliedSubjects[subjectIndex];
                }
              }
              
              slotAssignment[slot] = subject;
            }
          }

          // Create slots for every hour of every day using the pre-computed allocation
          for (let day = 0; day < store.days; day++) {
            for (let hour = 0; hour < store.hoursPerDay; hour++) {
              const slotIndex = day * store.hoursPerDay + hour;
              const subject = slotAssignment[slotIndex];

              if (!subject) {
                // Free slot
                slotsToInsert.push({
                  timetable_id: timetableId,
                  user_id: user.id,
                  class_id: classId,
                  subject_id: null,
                  staff_id: null,
                  day: day,
                  hour: hour,
                  is_free: true,
                });
                continue;
              }

              // Get subject ID from map
              const subjectId = subjectIdMap[classId]?.[subject.name.toLowerCase()];
              
              if (!subjectId) {
                console.warn(`Subject ID not found: ${subject.name} for class ${classKey}. Available:`, Object.keys(subjectIdMap[classId] || {}));
                continue;
              }

              // **CONSISTENCY FIX:** Use the pre-assigned staff for this subject
              let assignedStaff = classSubjectToStaffMap[subjectId] || null;

              // If pre-assigned staff is not available, try alternatives
              if (!assignedStaff) {
                const alternatives = classSubjectToAlternativesMap[subjectId] || [];
                if (alternatives.length > 0) {
                  assignedStaff = alternatives[0];
                }
              }

              // Create the slot
              slotsToInsert.push({
                timetable_id: timetableId,
                user_id: user.id,
                class_id: classId,
                subject_id: subjectId,
                staff_id: assignedStaff || null,
                day: day,
                hour: hour,
                is_free: !assignedStaff,
              });
            }
          }
        });

        // Batch insert all slots
        if (slotsToInsert.length > 0) {
          const { error: slotError } = await supabase
            .from("timetable_slots")
            .insert(slotsToInsert);
          
          if (slotError) throw slotError;
        }

        toast.success("Timetable created successfully!");
        setTimeout(() => {
          store.reset();
          navigate("/dashboard");
        }, 1500);
      } catch (err: any) {
        console.error("Error:", err);
        toast.error(err.message || "Failed to create timetable");
        navigate("/create/theme");
      }
    };

    const timer = setTimeout(generateTimetable, 1000);
    return () => clearTimeout(timer);
  }, [isValidationPassed, store.allocationMode, user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-2xl mx-auto">
        <BackButton to="/create/theme" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <h1 className="font-display text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {validationError ? "Validation Error" : "GENERATING TIMETABLE"}
          </h1>
          <p className="text-muted-foreground mt-4">
            {validationError ? "Please fix the issues below" : "Your timetable is being prepared..."}
          </p>
          <div className="mt-3 inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/30">
            <p className="text-xs font-medium text-primary">
              Allocation Mode: <span className="uppercase font-bold">{store.allocationMode}</span>
            </p>
          </div>
        </motion.div>

        {/* Error Card - Show if validation fails */}
        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <Card className="glass-card border-2 border-destructive/50 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-6 w-6" />
                  Custom Allotment Error
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                  <p className="text-destructive font-semibold text-lg">{validationError}</p>
                </div>

                <div className="space-y-3 bg-background/50 p-4 rounded-lg border border-border">
                  <h3 className="font-semibold text-foreground">What to do:</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>✓ Go back to Class Details</li>
                    <li>✓ Review the subject hours for each class</li>
                    <li>✓ Make sure total hours = {store.days * store.hoursPerDay} slots</li>
                    <li>✓ Try again</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => navigate("/create/classes")}
                    className="flex-1 bg-gradient-to-r from-primary to-primary-dark"
                  >
                    ← Back to Class Details
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="flex-1"
                  >
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Generation Loader - Show only if validation passed */}
        {!validationError && (
          <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-12 glass-card rounded-2xl p-8"
          >
            <div className="space-y-6">
              {/* Status: Validating */}
              <div className="flex items-start gap-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="p-3 rounded-lg bg-primary/20"
                >
                <Loader className="h-6 w-6 text-primary" />
              </motion.div>
              <div>
                <p className="font-semibold text-foreground">Validating Configuration</p>
                <p className="text-sm text-muted-foreground mt-1">Checking classes and staff assignments...</p>
              </div>
            </div>

            {/* Status: Processing */}
            <div className="flex items-start gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="p-3 rounded-lg bg-secondary/20"
              >
                <Loader className="h-6 w-6 text-secondary" />
              </motion.div>
              <div>
                <p className="font-semibold text-foreground">Processing Setup</p>
                <p className="text-sm text-muted-foreground mt-1">Organizing timetable structure...</p>
              </div>
            </div>

            {/* Status: Generating */}
            <div className="flex items-start gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="p-3 rounded-lg bg-accent/20"
              >
                <Loader className="h-6 w-6 text-accent" />
              </motion.div>
              <div>
                <p className="font-semibold text-foreground">Finalizing Timetable</p>
                <p className="text-sm text-muted-foreground mt-1">Applying selected theme and optimizations...</p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-8 pt-8 border-t border-border space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Timetable Name:</span>
              <span className="font-semibold">{store.timetableName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Classes:</span>
              <span className="font-semibold">{store.classes.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Staff Members:</span>
              <span className="font-semibold">{store.staff.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Schedule:</span>
              <span className="font-semibold">{store.days} days × {store.hoursPerDay} hours</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Theme:</span>
              <span className="font-semibold capitalize">{store.theme}</span>
            </div>
          </div>

          {unassigned.length > 0 && (
            <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Note</p>
                <p className="text-xs text-amber-600 mt-1">
                  Some subjects have no assigned staff: {unassigned.join(", ")}
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Completion Message */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2 }}
          className="mt-8 text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 2 }}
            className="flex justify-center mb-4"
          >
            <CheckCircle2 className="h-12 w-12 text-primary" />
          </motion.div>
          <p className="font-semibold text-foreground">Timetable Created Successfully!</p>
          <p className="text-sm text-muted-foreground mt-2">Redirecting to dashboard...</p>
        </motion.div>
        </>
        )}
      </div>
    </div>
  );
}
