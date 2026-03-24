import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Trash2, Pencil, Loader2, Download, Eye } from "lucide-react";
import BackButton from "@/components/BackButton";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Timetable {
  id: string;
  name: string;
  days: number;
  hours_per_day: number;
  created_at: string;
}

export default function TimetableList() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [loading, setLoading] = useState(true);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading]);

  useEffect(() => {
    if (user) loadTimetables();
  }, [user]);

  const loadTimetables = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("timetables")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setTimetables((data || []) as Timetable[]);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this timetable?")) return;
    const { error } = await supabase.from("timetables").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      loadTimetables();
    }
  };

  const handleRename = async () => {
    if (!renameId || !newName.trim()) return;
    const { error } = await supabase
      .from("timetables")
      .update({ name: newName.toUpperCase() })
      .eq("id", renameId);
    if (error) toast.error(error.message);
    else {
      toast.success("Renamed");
      setRenameId(null);
      loadTimetables();
    }
  };

  return (
    <div className="min-h-screen bg-background hero-grid p-6">
      <div className="max-w-4xl mx-auto">
        <BackButton to="/dashboard" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <h1 className="font-display text-3xl font-bold text-primary">YOUR TIMETABLES</h1>
          <p className="text-muted-foreground mt-1">View and manage your saved timetables</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center mt-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : timetables.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-16">
            <CalendarDays className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No timetables yet</p>
            <Button className="mt-4" onClick={() => navigate("/create")}>CREATE YOUR FIRST</Button>
          </motion.div>
        ) : (
          <div className="mt-8 space-y-4">
            {timetables.map((tt, i) => (
              <motion.div
                key={tt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="glass-card hover:shadow-lg transition-all duration-300">
                  <CardContent className="flex items-center justify-between p-5">
                    <div>
                      <h3 className="font-display font-semibold text-lg">{tt.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {tt.days} days × {tt.hours_per_day} hours •{" "}
                        {new Date(tt.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => navigate(`/timetable/${tt.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setRenameId(tt.id); setNewName(tt.name); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(tt.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!renameId} onOpenChange={() => setRenameId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>RENAME TIMETABLE</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="uppercase-input"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameId(null)}>CANCEL</Button>
            <Button onClick={handleRename}>SAVE</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
