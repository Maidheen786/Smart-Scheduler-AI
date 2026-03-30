import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTimetableStore } from "@/lib/timetable-store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BackButton from "@/components/BackButton";
import { FileText, Calendar, Clock, Zap, Settings } from "lucide-react";

export default function TimetableSetup() {
  const navigate = useNavigate();
  const store = useTimetableStore();
  
  const [name, setName] = useState(store.timetableName || "");
  const [daysCount, setDaysCount] = useState(store.days || 5);
  const [hoursPerDay, setHoursPerDay] = useState(store.hoursPerDay || 8);
  const [allocationMode, setAllocationMode] = useState(store.allocationMode || "default");

  const handleCreateTimetable = () => {
    if (!name.trim()) {
      toast.error("Please enter a timetable name");
      return;
    }

    if (daysCount < 1 || daysCount > 7) {
      toast.error("Days per week must be between 1 and 7");
      return;
    }

    if (hoursPerDay < 1 || hoursPerDay > 12) {
      toast.error("Hours per day must be between 1 and 12");
      return;
    }

    // Update store with the setup values
    store.setTimetableName(name);
    store.setDays(daysCount);
    store.setHoursPerDay(hoursPerDay);
    store.setAllocationMode(allocationMode as "default" | "custom");

    toast.success("Timetable setup complete!");
    navigate("/create/classes");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-4xl mx-auto">
        <BackButton to="/create" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <h1 className="font-display text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            CONFIGURE YOUR TIMETABLE
          </h1>
          <p className="text-muted-foreground mt-4">
            Set up the basic details for your timetable
          </p>
        </motion.div>

        {/* Breadcrumb Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-medium">1. SETUP</span>
          <span className="text-xs opacity-50">→</span>
          <span className="text-xs bg-primary/10 text-primary/60 px-3 py-1 rounded-full font-medium">2. CLASSES</span>
          <span className="text-xs opacity-50">→</span>
          <span className="text-xs bg-primary/10 text-primary/60 px-3 py-1 rounded-full font-medium">3. STAFF</span>
          <span className="text-xs opacity-50">→</span>
          <span className="text-xs bg-primary/10 text-primary/60 px-3 py-1 rounded-full font-medium">4. THEME</span>
        </motion.div>

        {/* Setup Cards */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {/* Timetable Name Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-card border border-border h-full hover:border-primary/50 transition-colors">
              <CardHeader className="bg-gradient-to-r from-primary/20 to-primary/10 border-b border-primary/10 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Timetable Name
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Computer Science 2024-25"
                  className="bg-background/50 border-border focus:border-primary focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-3">
                  Give your timetable a descriptive name for easy identification
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Days Per Week Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass-card border border-border h-full hover:border-secondary/50 transition-colors">
              <CardHeader className="bg-gradient-to-r from-secondary/20 to-secondary/10 border-b border-secondary/10 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-secondary" />
                  Days Per Week
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <button
                      key={day}
                      onClick={() => setDaysCount(day)}
                      className={`h-10 rounded-lg font-semibold text-sm transition-all ${
                        daysCount === day
                          ? "bg-gradient-to-r from-secondary to-secondary-dark text-white shadow-lg shadow-secondary/40 scale-105"
                          : "bg-secondary/10 text-secondary hover:bg-secondary/20"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected: {daysCount} {daysCount === 1 ? "day" : "days"} per week
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Hours Per Day Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass-card border border-border h-full hover:border-accent/50 transition-colors">
              <CardHeader className="bg-gradient-to-r from-accent/20 to-accent/10 border-b border-accent/10 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-accent" />
                  Hours Per Day
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((hours) => (
                    <button
                      key={hours}
                      onClick={() => setHoursPerDay(hours)}
                      className={`h-10 rounded-lg font-semibold text-sm transition-all ${
                        hoursPerDay === hours
                          ? "bg-gradient-to-r from-accent to-orange-600 text-white shadow-lg shadow-accent/40 scale-105"
                          : "bg-accent/10 text-accent hover:bg-accent/20"
                      }`}
                    >
                      {hours}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected: {hoursPerDay} {hoursPerDay === 1 ? "hour" : "hours"} per day
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Card className="glass-card border border-border bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
            <CardHeader>
              <CardTitle className="text-lg">Configuration Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Timetable Name</p>
                  <p className="font-semibold text-lg">{name || "Not Set"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Schedule</p>
                  <p className="font-semibold text-lg">
                    {daysCount} days × {hoursPerDay} hours
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Slots</p>
                  <p className="font-semibold text-lg">{daysCount * hoursPerDay} slots</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Allocation Mode Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mt-8"
        >
          <Card className="glass-card border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5 text-primary" />
                Allocation Mode
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Choose how subjects will be allocated in the timetable
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Default Allotment */}
                <button
                  onClick={() => setAllocationMode("default")}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    allocationMode === "default"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background/50 hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Zap className={`h-5 w-5 flex-shrink-0 mt-1 ${
                      allocationMode === "default" ? "text-primary" : "text-muted-foreground"
                    }`} />
                    <div>
                      <h3 className="font-semibold text-base">Default Allotment</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        System automatically distributes subjects across time slots based on subject type (CORE, ALLIED, SEC)
                      </p>
                    </div>
                  </div>
                </button>

                {/* Custom Allotment */}
                <button
                  onClick={() => setAllocationMode("custom")}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    allocationMode === "custom"
                      ? "border-secondary bg-secondary/10"
                      : "border-border bg-background/50 hover:border-secondary/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Settings className={`h-5 w-5 flex-shrink-0 mt-1 ${
                      allocationMode === "custom" ? "text-secondary" : "text-muted-foreground"
                    }`} />
                    <div>
                      <h3 className="font-semibold text-base">Custom Allotment</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        You specify the exact number of hours for each subject per week. System validates total hours
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Mode Info */}
              <div className="mt-4 p-4 rounded-lg bg-background/50 border border-border">
                <p className="text-sm">
                  {allocationMode === "default" 
                    ? "📊 With Default Allotment, focus on scheduling class time and staff availability. The system handles subject distribution automatically."
                    : "⚙️ With Custom Allotment, specify exact hours per subject in Class Details (e.g., Math: 5 hours, Science: 4 hours). Total must equal available slots."}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Navigation Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 flex gap-4"
        >
          <Button
            variant="outline"
            onClick={() => navigate("/create")}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleCreateTimetable}
            className="flex-1 bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/50"
          >
            NEXT → CLASS DETAILS
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
