import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PlusCircle, FolderOpen, MessageCircle, LogOut, CalendarDays } from "lucide-react";

const cards = [
  {
    title: "CREATE NEW",
    desc: "Build a new timetable from scratch",
    icon: PlusCircle,
    to: "/create",
    gradient: "from-blue-600 to-indigo-700",
    shadow: "shadow-blue-500/25",
  },
  {
    title: "VIEW EXISTING",
    desc: "Browse your saved timetables",
    icon: FolderOpen,
    to: "/timetables",
    gradient: "from-emerald-500 to-teal-600",
    shadow: "shadow-emerald-500/25",
  },
  {
    title: "HELP",
    desc: "AI chatbot for timetable queries",
    icon: MessageCircle,
    to: "/help",
    gradient: "from-violet-500 to-purple-600",
    shadow: "shadow-violet-500/25",
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
    <div className="min-h-screen bg-background hero-grid">
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-primary">SMART TIMETABLE</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => signOut()} className="gap-2">
          <LogOut className="h-4 w-4" /> LOGOUT
        </Button>
      </nav>

      <main className="max-w-5xl mx-auto px-6 pt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="font-display text-4xl font-bold text-primary">DASHBOARD</h1>
          <p className="text-muted-foreground mt-2">
            Welcome, {user?.user_metadata?.username || user?.email?.split("@")[0] || "User"}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              onClick={() => navigate(card.to)}
              className={`cursor-pointer rounded-2xl bg-gradient-to-br ${card.gradient} p-8 text-white shadow-xl ${card.shadow} hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02]`}
            >
              <card.icon className="h-12 w-12 mb-4 opacity-90" />
              <h2 className="font-display text-2xl font-bold">{card.title}</h2>
              <p className="mt-2 text-white/80 text-sm">{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
