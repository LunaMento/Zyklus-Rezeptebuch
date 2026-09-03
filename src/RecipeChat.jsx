import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronDown, ChevronUp, Sparkles, Send, Save, ShoppingCart, Check } from "lucide-react";
import { supabase } from "./supabaseClient";

const EXAMPLE_PROMPTS = [
  "Ich hab Quinoa, Zucchini und Eier da — was kann ich machen?",
  "Gib mir ein schnelles Frühstück für diese Phase",
  "Ich hab Heißhunger auf Süßes — was passt gerade?",
  "Was kann ich mit Süßkartoffeln und Ricotta kochen?",
];

const categories = ["Frühstück", "Mittag", "Abend", "Snack"];

export default function RecipeChat({ phase, phaseName, cycleDay, histamineSafe, onClose, onSaveRecipe, onAddToShoppingList }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingIndex, setSavingIndex] = useState(null);
  const [expandedIndices, setExpandedIndices] = useState({});
  const [savedIndices, setSavedIndices] = useState({});
  const [addedIndices, setAddedIndices] = useState({});
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const userMessage = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError("");

    const { data, error: fnError } = await supabase.functions.invoke("recipe-agent", {
      body: {
        question: text.trim(),
        history,
        phase,
        cycleDay,
        histamineSafe,
      },
    });

    setLoading(false);

    if (fnError || data?.error) {
      setError(data?.error || "Der Rezept-Assistent ist gerade nicht erreichbar.");
      return;
    }

    setMessages((prev) => [...prev, { role: "assistant", content: data.reply, recipe: data.recipe || null }]);
  };

  const handleSave = async (recipe, index, category) => {
    setSavingIndex(null);
    await onSaveRecipe(recipe, category);
    setSavedIndices((prev) => ({ ...prev, [index]: true }));
  };

  const handleAddToShoppingList = async (recipe, index) => {
    await onAddToShoppingList(recipe);
    setAddedIndices((prev) => ({ ...prev, [index]: true }));
  };

  const toggleExpanded = (index) => {
    setExpandedIndices((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const formatAmount = (n) => {
    if (!n) return "";
    return String(n).replace(".", ",");
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col" style={{ minHeight: "100vh" }}>
      <button
        onClick={onClose}
        className="flex items-center gap-2 mb-8 text-sm hover:underline"
        style={{ color: "#ebddc5" }}
      >
        <ChevronLeft size={16} /> Zurück
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2" style={{ color: "#bfb2da" }}>
          <Sparkles size={16} />
          <span className="text-[11px] tracking-[0.2em] uppercase font-medium">Rezept-Assistent</span>
        </div>
        <h1 className="serif text-4xl leading-[0.95]" style={{ color: "#ebddc5" }}>
          Frag mich was
        </h1>
        <div
          className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full text-[11px] tracking-[0.1em]"
          style={{ background: "#3d472b", color: "#ccdbb2" }}
        >
          Phase: {phaseName}
          {cycleDay && <> · Tag {cycleDay}</>}
          {histamineSafe && <> · Histaminarm</>}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 mb-6">
        {messages.length === 0 && (
          <div className="mb-4">
            <p className="text-sm mb-3" style={{ color: "#aebf92" }}>
              Ein paar Ideen zum Start:
            </p>
            <div className="flex flex-col gap-2 items-start">
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-left text-sm px-4 py-2.5 rounded-sm"
                  style={{ background: "#3d472b", color: "#ccdbb2", border: "1px solid #ebddc520" }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[85%]">
              <div
                className="px-4 py-3 rounded-sm text-sm leading-relaxed whitespace-pre-wrap"
                style={
                  m.role === "user"
                    ? { background: "#bfb2da", color: "#272e1b" }
                    : { background: "#3d472b", color: "#ccdbb2" }
                }
              >
                {m.content}
              </div>

              {m.recipe && (
                <div className="mt-2 p-4 rounded-sm" style={{ background: "#272e1b", border: "1px solid #bfb2da40" }}>
                  <div className="serif text-lg mb-1" style={{ color: "#ebddc5" }}>
                    {m.recipe.title}
                  </div>
                  <p className="text-xs mb-3" style={{ color: "#aebf92" }}>
                    {m.recipe.benefits}
                  </p>

                  <button
                    onClick={() => toggleExpanded(i)}
                    className="flex items-center gap-1.5 mb-3 text-xs"
                    style={{ color: "#bfb2da" }}
                  >
                    {expandedIndices[i] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {expandedIndices[i] ? "Weniger anzeigen" : "Rezept ansehen"}
                  </button>

                  {expandedIndices[i] && (
                    <div className="mb-4 pb-4 border-b" style={{ borderColor: "#ebddc520" }}>
                      <div className="text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: "#aebf92" }}>
                        Zutaten ({m.recipe.baseServings} {m.recipe.baseServings === 1 ? "Portion" : "Portionen"})
                      </div>
                      <ul className="mb-4 space-y-1">
                        {(m.recipe.ingredients || []).map((ing, idx) => (
                          <li key={idx} className="text-[15px] leading-[1.4]" style={{ color: "#ccdbb2" }}>
                            <span className="tabular-nums" style={{ color: "#ebddc5" }}>
                              {formatAmount(ing.amount)} {ing.unit}
                            </span>{" "}
                            {ing.name}
                          </li>
                        ))}
                      </ul>

                      <div className="text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: "#aebf92" }}>
                        Zubereitung
                      </div>
                      <ol className="space-y-2">
                        {(m.recipe.steps || []).map((step, idx) => (
                          <li key={idx} className="flex gap-2 text-[15px] leading-[1.4]" style={{ color: "#ccdbb2" }}>
                            <span style={{ color: "#ebddc5" }}>{idx + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>

                      {m.recipe.notes && (
                        <p className="mt-4 text-xs leading-relaxed" style={{ color: "#aebf92" }}>
                          {m.recipe.notes}
                        </p>
                      )}
                    </div>
                  )}

                  {savedIndices[i] ? (
                    <div className="flex items-center gap-2 text-xs" style={{ color: "#9cb37c" }}>
                      <Check size={14} /> Gespeichert
                    </div>
                  ) : savingIndex === i ? (
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => handleSave(m.recipe, i, cat)}
                          className="px-3 py-1.5 rounded-full text-xs"
                          style={{ background: "#bfb2da", color: "#272e1b" }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSavingIndex(i)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                        style={{ background: "#bfb2da", color: "#272e1b" }}
                      >
                        <Save size={12} /> Rezept speichern
                      </button>
                      {addedIndices[i] ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs" style={{ color: "#9cb37c" }}>
                          <Check size={12} /> Auf der Liste
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToShoppingList(m.recipe, i)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                          style={{ border: "1px solid #ebddc540", color: "#ebddc5", background: "transparent" }}
                        >
                          <ShoppingCart size={12} /> Zutaten zur Einkaufsliste
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-sm text-sm" style={{ background: "#3d472b", color: "#aebf92" }}>
              Überlegt …
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm" style={{ color: "#b98b8f" }}>
            {error}
          </p>
        )}

        <div ref={scrollRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="sticky bottom-6 flex items-center gap-2 p-2 rounded-full"
        style={{ background: "#3d472b", border: "1px solid #ebddc520" }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Was hast du im Kühlschrank?"
          className="flex-1 bg-transparent outline-none text-sm px-3"
          style={{ color: "#ebddc5" }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
          style={{ background: "#bfb2da", color: "#272e1b" }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
