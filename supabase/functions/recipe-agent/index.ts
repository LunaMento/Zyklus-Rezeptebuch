// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@^0.68";

const MODEL = "claude-sonnet-5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const phaseNames: Record<string, string> = {
  menstruation: "Menstruation",
  follikel: "Follikelphase",
  ovulation: "Ovulation",
  luteal: "Lutealphase",
};

function buildSystemPrompt(phase: string, cycleDay: number | null, histamineSafe: boolean) {
  const phaseName = phaseNames[phase] || phase;
  const dayInfo = cycleDay ? `Zyklustag ${cycleDay}` : "Zyklustag unbekannt (noch kein Tracking)";

  return `Du bist ein Rezept-Assistent für eine vegetarische Nutzerin.
Aktuelle Zyklusphase: ${phaseName} (${dayInfo}).
${histamineSafe
    ? "Diese Phase (Lutealphase) sollte histaminarm sein — vermeide histaminreiche Zutaten wie lange gereiften Käse, Alkohol, Fermentiertes, geräucherten Fisch, Zitrusfrüchte in großen Mengen und Nüsse in Übermaß."
    : "In dieser Phase ist Histamin kein Thema, keine Einschränkung nötig."}
Alle Rezepte müssen vegetarisch sein.
Antworte immer auf Deutsch, freundlich und knapp.

Wenn die Nutzerin ein konkretes Rezept möchte, das sie speichern könnte, gib zusätzlich zu deiner Antwort einen JSON-Block in einem \`\`\`json Codeblock zurück, mit genau diesen Feldern:
{
  "title": string,
  "phase": "${phase}",
  "category": "Frühstück" | "Mittag" | "Abend" | "Snack",
  "baseServings": number,
  "tags": string[],
  "benefits": string,
  "ingredients": [{ "name": string, "amount": number, "unit": string }],
  "steps": string[],
  "notes": string
}
Gib den JSON-Block nur aus, wenn du wirklich ein konkretes, vollständiges Rezept vorschlägst — nicht bei allgemeinen Ratschlägen oder Rückfragen.`;
}

function extractRecipe(text: string): { reply: string; recipe: unknown | null } {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  if (!match) {
    return { reply: text.trim(), recipe: null };
  }

  try {
    const recipe = JSON.parse(match[1]);
    const reply = (text.slice(0, match.index) + text.slice(match.index! + match[0].length)).trim();
    return { reply, recipe };
  } catch {
    return { reply: text.trim(), recipe: null };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { question, history, phase, cycleDay, histamineSafe } = await req.json();

    if (!question || typeof question !== "string") {
      return Response.json({ error: "Frage fehlt." }, { status: 400, headers: corsHeaders });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return Response.json(
        { error: "ANTHROPIC_API_KEY ist auf dem Server nicht gesetzt." },
        { status: 500, headers: corsHeaders },
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const messages = [
      ...((history as { role: "user" | "assistant"; content: string }[]) || []),
      { role: "user" as const, content: question },
    ];

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: buildSystemPrompt(phase, cycleDay ?? null, !!histamineSafe),
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const rawText = textBlock && "text" in textBlock ? textBlock.text : "";

    const { reply, recipe } = extractRecipe(rawText);

    return Response.json({ reply, recipe }, { headers: corsHeaders });
  } catch (error) {
    console.error("recipe-agent Fehler:", error);
    return Response.json(
      { error: "Der Rezept-Assistent hat gerade ein Problem." },
      { status: 500, headers: corsHeaders },
    );
  }
});
