import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTimetableStore } from "@/lib/timetable-store";
import { School, GraduationCap } from "lucide-react";
import BackButton from "@/components/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useEffect } from "react";

export default function InstitutionType() {
  const navigate = useNavigate();
  const { setInstitutionType, setInstitutionId, reset } = useTimetableStore();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading) return null;

  const handleSelect = async (type: "school" | "college") => {
    reset();
    setInstitutionType(type);
    try {
      const { data, error } = await supabase
        .from("institutions")
        .insert({ type, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      setInstitutionId(data.id);
      navigate("/create/classes");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-background hero-grid p-6">
      <div className="max-w-4xl mx-auto">
        <BackButton to="/dashboard" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mt-16 mb-12"
        >
          <h1 className="font-display text-3xl font-bold text-primary">CHOOSE INSTITUTION TYPE</h1>
          <p className="text-muted-foreground mt-2">Select the type of institution for your timetable</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {[
            { type: "school" as const, icon: School, label: "SCHOOL", desc: "No department fields" },
            { type: "college" as const, icon: GraduationCap, label: "COLLEGE", desc: "With department fields" },
          ].map((opt, i) => (
            <motion.div
              key={opt.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              onClick={() => handleSelect(opt.type)}
              className="cursor-pointer glass-card rounded-2xl p-10 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-accent/50"
            >
              <opt.icon className="h-16 w-16 mx-auto text-primary mb-4" />
              <h2 className="font-display text-2xl font-bold text-foreground">{opt.label}</h2>
              <p className="text-muted-foreground mt-2 text-sm">{opt.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
