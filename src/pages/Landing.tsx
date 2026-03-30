import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, Users, Sparkles, Zap, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full bg-primary/8 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-200px] left-[-100px] w-[400px] h-[400px] rounded-full bg-accent/8 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] rounded-full bg-secondary/8 blur-3xl pointer-events-none" />

      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-purple-500/30 hover:shadow-xl transition-all">
            <CalendarDays className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            SMART TIMETABLE
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex gap-3"
        >
          <Button variant="outline" asChild className="border-primary/30 hover:bg-primary/10">
            <Link to="/auth?mode=login">LOGIN</Link>
          </Button>
          <Button asChild className="bg-gradient-to-r from-secondary to-secondary-dark hover:shadow-lg hover:shadow-teal-500/40">
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
          <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight">
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              AUTOMATIC
            </span>
            <br />
            <span className="text-foreground">TIMETABLE</span>
            <br />
            <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              GENERATOR
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Generate clash-free timetables for schools and colleges in seconds.
            AI-powered scheduling with smart constraint handling.
          </p>
          <div className="mt-10 flex gap-4 justify-center flex-wrap">
            <Button size="lg" asChild className="bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-purple-500/40 text-lg px-8 py-6">
              <Link to="/auth?mode=signup">GET STARTED FREE</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-secondary/50 text-secondary hover:bg-secondary/10">
              <Link to="/auth?mode=login">EXPLORE DEMO</Link>
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
            { 
              icon: Zap, 
              title: "INSTANT GENERATION", 
              desc: "Create complete clash-free timetables in seconds with advanced AI algorithms",
              gradient: "from-primary/80 to-primary-dark",
              glow: "shadow-purple-500/30"
            },
            { 
              icon: Shield, 
              title: "CLASH-FREE GUARANTEED", 
              desc: "No staff conflicts, balanced teaching hours, and optimized free periods",
              gradient: "from-secondary/80 to-secondary-dark",
              glow: "shadow-teal-500/30"
            },
            { 
              icon: Sparkles, 
              title: "AI HELP DESK", 
              desc: "Ask questions about your timetable and get instant intelligent answers",
              gradient: "from-accent/80 to-accent-dark",
              glow: "shadow-orange-500/30"
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.15 }}
              className={`group rounded-2xl bg-gradient-to-br ${f.gradient} p-8 text-white shadow-xl ${f.glow} hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-105 active:scale-95 border border-white/10 overflow-hidden cursor-pointer`}
            >
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              
              {/* Content */}
              <div className="relative z-10">
                <f.icon className="h-12 w-12 mb-4 opacity-90 group-hover:opacity-100 transition-opacity group-hover:scale-110 transform duration-300" />
                <h3 className="font-display text-xl font-bold text-white">{f.title}</h3>
                <p className="mt-3 text-white/80 text-sm group-hover:text-white/90 transition-colors">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-32 text-center"
        >
          <div className="glass-card rounded-2xl p-12 max-w-2xl mx-auto">
            <h2 className="font-display text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              READY TO SIMPLIFY SCHEDULING?
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Join thousands of institutions that trust our AI-powered timetable generation
            </p>
            <div className="mt-8 flex gap-4 justify-center">
              <Button size="lg" asChild className="bg-gradient-to-r from-accent to-accent-dark hover:shadow-lg hover:shadow-orange-500/40">
                <Link to="/auth?mode=signup">Start Creating Now</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
