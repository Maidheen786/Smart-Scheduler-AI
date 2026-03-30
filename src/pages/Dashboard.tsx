import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PlusCircle, FolderOpen, MessageCircle, LogOut, CalendarDays, Sparkles } from "lucide-react";

const cards = [
  {
    title: "CREATE NEW",
    desc: "Build a new timetable from scratch",
    icon: PlusCircle,
    to: "/create",
    gradients: {
      light: "from-primary/80 to-primary-dark",
      glow: "from-primary via-primary-light to-primary-dark",
    },
    shadow: "shadow-purple-500/40",
    accentColor: "primary",
  },
  {
    title: "VIEW EXISTING",
    desc: "Browse your saved timetables",
    icon: FolderOpen,
    to: "/timetables",
    gradients: {
      light: "from-secondary/80 to-secondary-dark",
      glow: "from-secondary via-secondary-light to-secondary-dark",
    },
    shadow: "shadow-teal-500/40",
    accentColor: "secondary",
  },
  {
    title: "HELP & AI",
    desc: "AI chatbot for timetable queries",
    icon: Sparkles,
    to: "/help",
    gradients: {
      light: "from-accent/80 to-accent-dark",
      glow: "from-accent via-accent-light to-accent-dark",
    },
    shadow: "shadow-orange-500/40",
    accentColor: "accent",
  },
];

export default function Dashboard() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Decorative blobs */}
      <div className="absolute top-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-200px] left-[-100px] w-[400px] h-[400px] rounded-full bg-accent/5 blur-3xl pointer-events-none" />

      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-purple-500/30">
            <CalendarDays className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            SMART TIMETABLE
          </span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => signOut()} 
            className="gap-2 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" /> LOGOUT
          </Button>
        </motion.div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <h1 className="font-display text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            DASHBOARD
          </h1>
          <p className="text-muted-foreground mt-4 text-lg">
            Welcome, <span className="text-primary font-semibold">{user?.user_metadata?.username || user?.email?.split("@")[0] || "User"}</span>
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {cards.map((card, i) => (
            <motion.button
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              onClick={() => navigate(card.to)}
              className={`group relative rounded-2xl bg-gradient-to-br ${card.gradients.light} p-8 text-white shadow-xl ${card.shadow} hover:shadow-2xl transition-all duration-300 hover:-translate-y-3 hover:scale-[1.05] active:scale-95 overflow-hidden text-left border border-white/10`}
            >
              {/* Animated gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradients.glow} opacity-0 group-hover:opacity-30 transition-opacity duration-300`} />
              
              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <card.icon className="h-12 w-12 opacity-90 group-hover:opacity-100 transition-opacity" />
                  <div className="h-8 w-8 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-all" />
                </div>
                <h2 className="font-display text-2xl font-bold text-white">{card.title}</h2>
                <p className="mt-2 text-white/80 text-sm group-hover:text-white/90 transition-colors">{card.desc}</p>
              </div>

              {/* Bottom accent line */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradients.light} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`} />
            </motion.button>
          ))}
        </div>
      </main>
    </div>
  );
}
