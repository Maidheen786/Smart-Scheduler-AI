import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user's timetable data for context
    let timetableContext = "No timetable data available.";
    if (userId) {
      const { data: timetables } = await supabase
        .from("timetables")
        .select("id, name, days, hours_per_day")
        .eq("user_id", userId);

      if (timetables && timetables.length > 0) {
        const contextParts: string[] = [`User has ${timetables.length} timetable(s):`];
        
        for (const tt of timetables) {
          contextParts.push(`\n--- ${tt.name} (${tt.days} days, ${tt.hours_per_day} hours/day) ---`);
          
          // Get slots with class/subject/staff info
          const { data: slots } = await supabase
            .from("timetable_slots")
            .select("day, hour, class_id, subject_id, staff_id, is_free")
            .eq("timetable_id", tt.id);

          // Get related data
          const { data: classes } = await supabase
            .from("classes")
            .select("id, class_name, section, department")
            .eq("user_id", userId);

          const { data: subjects } = await supabase
            .from("subjects")
            .select("id, name, type")
            .eq("user_id", userId);

          const { data: staffList } = await supabase
            .from("staff")
            .select("id, name, department")
            .eq("user_id", userId);

          const classMap: Record<string, string> = {};
          (classes || []).forEach((c: any) => { classMap[c.id] = `${c.class_name} ${c.section}`; });
          
          const subMap: Record<string, string> = {};
          (subjects || []).forEach((s: any) => { subMap[s.id] = s.name; });
          
          const staffMap: Record<string, string> = {};
          (staffList || []).forEach((s: any) => { staffMap[s.id] = s.name; });

          const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN", "DAY8"];

          // Group by class
          const byClass: Record<string, any[]> = {};
          (slots || []).forEach((slot: any) => {
            const key = slot.class_id;
            if (!byClass[key]) byClass[key] = [];
            byClass[key].push(slot);
          });

          for (const [classId, classSlots] of Object.entries(byClass)) {
            contextParts.push(`\nClass: ${classMap[classId] || classId}`);
            const sorted = classSlots.sort((a: any, b: any) => a.day - b.day || a.hour - b.hour);
            for (const slot of sorted) {
              const day = dayNames[slot.day] || `Day${slot.day}`;
              const sub = slot.is_free ? "FREE" : (subMap[slot.subject_id] || "?");
              const stf = slot.is_free ? "" : ` (${staffMap[slot.staff_id] || "?"})`;
              contextParts.push(`  ${day} Hour ${slot.hour}: ${sub}${stf}`);
            }
          }
        }
        timetableContext = contextParts.join("\n");
      }
    }

    const systemPrompt = `You are the Smart Timetable AI assistant. You help users with their timetable queries.
You have access to the user's timetable data below. Use it to answer their questions accurately.
Always be concise and helpful. Format your answers clearly.
If asked about a specific class, hour, day, or staff - look up the exact data and respond.

TIMETABLE DATA:
${timetableContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...(messages || []),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e: any) {
    console.error("timetable-chat error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
