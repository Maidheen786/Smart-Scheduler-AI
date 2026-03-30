import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTimetableStore } from "@/lib/timetable-store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BackButton from "@/components/BackButton";
import { Check, Palette } from "lucide-react";

interface Theme {
  id: string;
  name: string;
  category: "dark" | "light" | "modern" | "classic" | "beautiful";
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  description: string;
}

const themes: Theme[] = [
  // Dark Themes
  {
    id: "dark-midnight",
    name: "Midnight",
    category: "dark",
    colors: { primary: "#1e293b", secondary: "#334155", accent: "#64748b" },
    description: "Deep slate tones for a professional look",
  },
  {
    id: "dark-noir",
    name: "Noir",
    category: "dark",
    colors: { primary: "#0f172a", secondary: "#1e293b", accent: "#475569" },
    description: "Pure black with subtle grays",
  },
  {
    id: "dark-ocean",
    name: "Ocean",
    category: "dark",
    colors: { primary: "#082f49", secondary: "#0c4a6e", accent: "#0ea5e9" },
    description: "Deep blue inspired by the ocean",
  },
  {
    id: "dark-forest",
    name: "Forest",
    category: "dark",
    colors: { primary: "#14532d", secondary: "#166534", accent: "#22c55e" },
    description: "Dark green with nature vibes",
  },
  {
    id: "dark-sunset",
    name: "Sunset",
    category: "dark",
    colors: { primary: "#7c2d12", secondary: "#92400e", accent: "#f97316" },
    description: "Warm oranges on dark background",
  },
  {
    id: "dark-purple",
    name: "Deep Purple",
    category: "dark",
    colors: { primary: "#3f0f5c", secondary: "#581c87", accent: "#a855f7" },
    description: "Rich purple tones",
  },
  {
    id: "dark-crimson",
    name: "Crimson",
    category: "dark",
    colors: { primary: "#450a0a", secondary: "#7f1d1d", accent: "#dc2626" },
    description: "Deep red for bold statements",
  },

  // Light Themes
  {
    id: "light-fresh",
    name: "Fresh",
    category: "light",
    colors: { primary: "#e0f2fe", secondary: "#cffafe", accent: "#06b6d4" },
    description: "Bright cyan and sky blues",
  },
  {
    id: "light-meadow",
    name: "Meadow",
    category: "light",
    colors: { primary: "#f0fdf4", secondary: "#dcfce7", accent: "#22c55e" },
    description: "Light greens and fresh pastels",
  },
  {
    id: "light-blush",
    name: "Blush",
    category: "light",
    colors: { primary: "#fdf2f8", secondary: "#fbecf8", accent: "#ec4899" },
    description: "Soft pinks and peaches",
  },
  {
    id: "light-lavender",
    name: "Lavender",
    category: "light",
    colors: { primary: "#f3e8ff", secondary: "#ede9fe", accent: "#a78bfa" },
    description: "Gentle purple and lilac",
  },
  {
    id: "light-cream",
    name: "Cream",
    category: "light",
    colors: { primary: "#fffbeb", secondary: "#fef3c7", accent: "#f59e0b" },
    description: "Warm cream and amber tones",
  },
  {
    id: "light-mint",
    name: "Mint",
    category: "light",
    colors: { primary: "#f0fdfa", secondary: "#ccfbf1", accent: "#14b8a6" },
    description: "Cool mint greens",
  },
  {
    id: "light-rose",
    name: "Rose",
    category: "light",
    colors: { primary: "#ffe4e6", secondary: "#ffd6db", accent: "#f43f5e" },
    description: "Romantic rose pinks",
  },

  // Modern Themes
  {
    id: "modern-gradient",
    name: "Gradient",
    category: "modern",
    colors: { primary: "#6366f1", secondary: "#06b6d4", accent: "#8b5cf6" },
    description: "Vibrant purple to indigo blend",
  },
  {
    id: "modern-neon",
    name: "Neon",
    category: "modern",
    colors: { primary: "#00ff00", secondary: "#00ffff", accent: "#ff00ff" },
    description: "Bright neon colors",
  },
  {
    id: "modern-cyber",
    name: "Cyber",
    category: "modern",
    colors: { primary: "#0080ff", secondary: "#00ffff", accent: "#ff0080" },
    description: "Tech-inspired cyber colors",
  },
  {
    id: "modern-retro",
    name: "Retro",
    category: "modern",
    colors: { primary: "#ff6b6b", secondary: "#ffd93d", accent: "#6bcf7f" },
    description: "70s inspired retro palette",
  },
  {
    id: "modern-fusion",
    name: "Fusion",
    category: "modern",
    colors: { primary: "#ff006e", secondary: "#8338ec", accent: "#fb5607" },
    description: "Bold contemporary colors",
  },
  {
    id: "modern-minimal",
    name: "Minimal",
    category: "modern",
    colors: { primary: "#1a1a1a", secondary: "#666666", accent: "#00d9ff" },
    description: "Minimalist with accent pop",
  },
  {
    id: "modern-vibrant",
    name: "Vibrant",
    category: "modern",
    colors: { primary: "#ff3366", secondary: "#00cc99", accent: "#ffcc00" },
    description: "High-energy vibrant palette",
  },

  // Classic Themes
  {
    id: "classic-navy",
    name: "Navy",
    category: "classic",
    colors: { primary: "#001f3f", secondary: "#003d82", accent: "#0074d9" },
    description: "Professional navy blues",
  },
  {
    id: "classic-burgundy",
    name: "Burgundy",
    category: "classic",
    colors: { primary: "#5c2c2c", secondary: "#8b3e3e", accent: "#d64545" },
    description: "Elegant burgundy tones",
  },
  {
    id: "classic-teal",
    name: "Teal",
    category: "classic",
    colors: { primary: "#0d5d56", secondary: "#155e75", accent: "#06b6d4" },
    description: "Sophisticated teal palette",
  },
  {
    id: "classic-olive",
    name: "Olive",
    category: "classic",
    colors: { primary: "#3e3b28", secondary: "#555d50", accent: "#808000" },
    description: "Earthy olive greens",
  },
  {
    id: "classic-plum",
    name: "Plum",
    category: "classic",
    colors: { primary: "#423e5f", secondary: "#6b5b95", accent: "#9d84b7" },
    description: "Rich plum wine tones",
  },
  {
    id: "classic-coral",
    name: "Coral",
    category: "classic",
    colors: { primary: "#8b4513", secondary: "#cd853f", accent: "#ff7f50" },
    description: "Warm coral and terracotta",
  },
  {
    id: "classic-slate",
    name: "Slate",
    category: "classic",
    colors: { primary: "#2c3e50", secondary: "#34495e", accent: "#95a5a6" },
    description: "Cool slate grays",
  },

  // Beautiful Themes
  {
    id: "beautiful-sunset",
    name: "Sunset Glow",
    category: "beautiful",
    colors: { primary: "#ff6b35", secondary: "#ffd662", accent: "#f7931e" },
    description: "Warm sunset hues",
  },
  {
    id: "beautiful-aurora",
    name: "Aurora",
    category: "beautiful",
    colors: { primary: "#00d4ff", secondary: "#00ff85", accent: "#ff0080" },
    description: "Northern lights inspired",
  },
  {
    id: "beautiful-opal",
    name: "Opal",
    category: "beautiful",
    colors: { primary: "#a0d995", secondary: "#d5f4e6", accent: "#81c3d7" },
    description: "Soft iridescent opal",
  },
  {
    id: "beautiful-sapphire",
    name: "Sapphire",
    category: "beautiful",
    colors: { primary: "#0f3460", secondary: "#16213e", accent: "#e94560" },
    description: "Deep sapphire blue with rose",
  },
  {
    id: "beautiful-celestial",
    name: "Celestial",
    category: "beautiful",
    colors: { primary: "#2a1a4e", secondary: "#5a2a7a", accent: "#b366ff" },
    description: "Cosmic celestial purple",
  },
  {
    id: "beautiful-garden",
    name: "Garden",
    category: "beautiful",
    colors: { primary: "#2d5016", secondary: "#5a8c3a", accent: "#a4de6c" },
    description: "Lush garden greens",
  },
  {
    id: "beautiful-pearl",
    name: "Pearl",
    category: "beautiful",
    colors: { primary: "#e8dcc8", secondary: "#f5e6d3", accent: "#c1a384" },
    description: "Elegant pearl whites",
  },
];

export default function ThemeSelection() {
  const navigate = useNavigate();
  const store = useTimetableStore();
  const [selectedTheme, setSelectedTheme] = useState<string | null>(store.theme);

  const handleSelectTheme = (theme: Theme) => {
    setSelectedTheme(theme.id);
    store.setTheme(theme.id);
    toast.success(`Theme "${theme.name}" selected!`);
  };

  const handleContinue = () => {
    if (!selectedTheme) {
      toast.error("Please select a theme");
      return;
    }
    navigate("/create/generate");
  };

  const categories = ["dark", "light", "modern", "classic", "beautiful"] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-7xl mx-auto">
        <BackButton to="/create/staff" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <h1 className="font-display text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            CHOOSE YOUR THEME
          </h1>
          <p className="text-muted-foreground mt-4">
            Select a theme for your timetable. You can preview the colors for each style.
          </p>
        </motion.div>

        {/* Themes by Category */}
        {categories.map((category, categoryIndex) => {
          const categoryThemes = themes.filter((t) => t.category === category);
          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIndex * 0.1 }}
              className="mt-12"
            >
              <div className="flex items-center gap-2 mb-6">
                <Palette className="h-5 w-5 text-primary" />
                <h2 className="font-display text-2xl font-bold capitalize">
                  {category} Themes
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categoryThemes.map((theme) => (
                  <motion.div
                    key={theme.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Card
                      onClick={() => handleSelectTheme(theme)}
                      className={`glass-card border-2 cursor-pointer transition-all ${
                        selectedTheme === theme.id
                          ? "border-primary shadow-lg shadow-primary/50"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <CardContent className="p-4">
                        {/* Color Preview */}
                        <div className="flex gap-2 mb-4 h-12 rounded-lg overflow-hidden border border-border">
                          <div
                            className="flex-1"
                            style={{ backgroundColor: theme.colors.primary }}
                          />
                          <div
                            className="flex-1"
                            style={{ backgroundColor: theme.colors.secondary }}
                          />
                          <div
                            className="flex-1"
                            style={{ backgroundColor: theme.colors.accent }}
                          />
                        </div>

                        {/* Theme Info */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm">{theme.name}</h3>
                            {selectedTheme === theme.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {theme.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}

        {/* Navigation Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 flex gap-4 mb-12"
        >
          <Button
            variant="outline"
            onClick={() => navigate("/create/staff")}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleContinue}
            className="flex-1 bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/50"
          >
            GENERATE TIMETABLE
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
