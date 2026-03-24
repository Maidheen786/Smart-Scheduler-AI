import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, Users, Sparkles } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background hero-grid relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute bottom-[-200px] left-[-100px] w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl" />

      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-primary">SMART TIMETABLE</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex gap-3"
        >
          <Button variant="ghost" asChild className="btn-glow">
            <Link to="/auth?mode=login">LOGIN</Link>
          </Button>
          <Button asChild className="btn-glow">
            <Link to="/auth?mode=signup">SIGN UP</Link>
          </Button>
        </motion.div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h1 className="font-display text-5xl md:text-7xl font-bold text-primary leading-tight">
            AUTOMATIC
            <br />
            <span className="text-accent">TIMETABLE</span>
            <br />
            GENERATOR
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
            Generate clash-free timetables for schools and colleges in seconds.
            AI-powered scheduling with smart constraint handling.
          </p>
          <div className="mt-10 flex gap-4 justify-center">
            <Button size="lg" asChild className="btn-glow text-lg px-8 py-6">
              <Link to="/auth?mode=signup">GET STARTED FREE</Link>
            </Button>
          </div>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-24 grid md:grid-cols-3 gap-6"
        >
          {[
            { icon: Clock, title: "INSTANT GENERATION", desc: "Create complete timetables in seconds with our AI algorithm" },
            { icon: Users, title: "CLASH-FREE", desc: "No staff conflicts, balanced hours, and free periods guaranteed" },
            { icon: Sparkles, title: "AI HELP DESK", desc: "Ask questions about your timetable and get instant answers" },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.15 }}
              className="glass-card rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <f.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-muted-foreground text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
