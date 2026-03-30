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
      navigate("/create/setup");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const options = [
    {
      type: "school" as const,
      icon: School,
      label: "SCHOOL",
      desc: "Standard school structure without departments",
      gradient: "from-primary/80 to-primary-dark",
      glow: "shadow-purple-500/40",
    },
    {
      type: "college" as const,
      icon: GraduationCap,
      label: "COLLEGE",
      desc: "University with department-based organization",
      gradient: "from-secondary/80 to-secondary-dark",
      glow: "shadow-teal-500/40",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      {/* Decorative blobs */}
      <div className="absolute top-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-200px] left-[-100px] w-[400px] h-[400px] rounded-full bg-secondary/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto p-6">
        <BackButton to="/dashboard" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mt-16 mb-16"
        >
          <h1 className="font-display text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            CHOOSE INSTITUTION TYPE
          </h1>
          <p className="text-muted-foreground mt-4 text-lg">Select the type of institution for your timetable</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {options.map((opt, i) => (
            <motion.button
              key={opt.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              onClick={() => handleSelect(opt.type)}
              className={`group relative rounded-2xl bg-gradient-to-br ${opt.gradient} p-10 text-white shadow-xl ${opt.glow} hover:shadow-2xl transition-all duration-300 hover:-translate-y-3 hover:scale-[1.05] active:scale-95 overflow-hidden border border-white/10 text-center`}
            >
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              
              {/* Content */}
              <div className="relative z-10 flex flex-col items-center">
                <opt.icon className="h-16 w-16 mb-4 opacity-90 group-hover:opacity-100 transition-opacity group-hover:scale-110 transform duration-300" />
                <h2 className="font-display text-2xl font-bold text-white">{opt.label}</h2>
                <p className="text-white/80 mt-3 text-sm group-hover:text-white/90 transition-colors">{opt.desc}</p>
              </div>

              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl bg-gradient-to-br from-white via-transparent to-transparent transition-opacity duration-300" />
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
