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
    
    // Try to get API key - support multiple providers
    const claudeKey = Deno.env.get("ANTHROPIC_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const groqKey = Deno.env.get("GROQ_API_KEY");
    
    console.log("Checking API keys:", {
      hasAnthropicKey: !!claudeKey,
      hasOpenaiKey: !!openaiKey,
      hasGroqKey: !!groqKey,
    });

    if (!claudeKey && !openaiKey && !groqKey) {
      const errorMsg = "No AI API keys configured. Please set OPENAI_API_KEY in Supabase Secrets.";
      console.error(errorMsg);
      return new Response(
        `data: ${JSON.stringify({ choices: [{ delta: { content: errorMsg } }] })}\ndata: [DONE]\n\n`,
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" } 
        }
      );
    }

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

          // Generate day names dynamically
          const dayNames = Array.from({ length: tt.days }, (_, i) => `Day ${i + 1}`);

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
You can also suggest substitutions when staff is absent, analyze workloads, and provide insights.

TIMETABLE DATA:
${timetableContext}`;

    // Use Groq API (free tier available)
    if (!groqKey) {
      console.error("Groq key is not set even though it was checked earlier");
      return new Response(
        `data: ${JSON.stringify({ choices: [{ delta: { content: "Groq API key not configured in Supabase. Please add GROQ_API_KEY to Secrets and wait 2-3 minutes." } }] })}\ndata: [DONE]\n\n`,
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" } 
        }
      );
    }

    let response: Response;
    try {
      console.log("Calling Groq API with key starting with:", groqKey.substring(0, 10));
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            ...(messages || []),
          ],
          stream: true,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });
    } catch (fetchErr: any) {
      console.error("Fetch error:", fetchErr);
      throw new Error(`Failed to connect to AI service: ${fetchErr.message}`);
    }

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error(`AI API error (${status}):`, errorText);
      
      if (status === 429) {
        return new Response(
          `data: ${JSON.stringify({ choices: [{ delta: { content: "Rate limit exceeded. Please wait a moment and try again." } }] })}\ndata: [DONE]\n\n`,
          { 
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" } 
          }
        );
      }
      if (status === 401 || status === 403) {
        return new Response(
          `data: ${JSON.stringify({ choices: [{ delta: { content: "AI service authentication failed. Please check your Groq API key configuration in Supabase." } }] })}\ndata: [DONE]\n\n`,
          { 
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" } 
          }
        );
      }
      
      return new Response(
        `data: ${JSON.stringify({ choices: [{ delta: { content: `Error from AI service: ${status}. ${errorText}` } }] })}\ndata: [DONE]\n\n`,
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" } 
        }
      );
    }

    // Create a transform stream to forward the response
    const transformStream = new TransformStream({
      async transform(chunk: Uint8Array, controller: TransformStreamDefaultController) {
        const text = new TextDecoder().decode(chunk);
        controller.enqueue(new TextEncoder().encode(text));
      }
    });

    return new Response(response.body!.pipeThrough(transformStream), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e: any) {
    console.error("timetable-chat error:", e);
    const errorMessage = e.message || "An error occurred";
    return new Response(
      `data: ${JSON.stringify({ choices: [{ delta: { content: `Error: ${errorMessage}` } }] })}\ndata: [DONE]\n\n`,
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      }
    );
  }
});
