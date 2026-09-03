import React, { useState, useEffect } from "react";
import { Plus, Minus, X, Edit3, Trash2, ChevronLeft, ChevronRight, Save, RotateCcw, BookOpen, ShoppingCart, Share2, Check, XCircle, LogOut, Calendar, Sparkles } from "lucide-react";
import { supabase } from "./supabaseClient";
import { getAverageCycleLength, getCurrentCycleDay, getPhaseForDay, getPredictedNextPeriod, toISODateString } from "./cycleUtils";
import RecipeChat from "./RecipeChat";

const phases = [
  {
    id: "menstruation",
    name: "Menstruation",
    subtitle: "Ruhe & Wärme",
    description: "Wärmende, eisenreiche und leicht verdauliche Speisen. Der Körper braucht jetzt Regeneration.",
    color: "#b98b8f",
    colorDeep: "#8f5b60",
    histamineSafe: false,
  },
  {
    id: "follikel",
    name: "Follikelphase",
    subtitle: "Aufbau & Energie",
    description: "Frisch, leicht, energiegebend. Der Östrogenspiegel steigt — Zeit für neue Impulse und Leichtigkeit.",
    color: "#9cb37c",
    colorDeep: "#5f7548",
    histamineSafe: false,
  },
  {
    id: "ovulation",
    name: "Ovulation",
    subtitle: "Höhepunkt & Klarheit",
    description: "Antioxidantienreich und entzündungshemmend. Der Körper ist auf dem Energie-Höhepunkt.",
    color: "#cdaa6d",
    colorDeep: "#9c7a3e",
    histamineSafe: false,
  },
  {
    id: "luteal",
    name: "Lutealphase",
    subtitle: "Nährung & Stabilität",
    description: "Nährung & Stabilität Progesteron steigt, die Energie sinkt. Der Körper braucht jetzt mehr Nährstoffe, stabilen Blutzucker und Wärme — um Stimmung und PMS auszugleichen.",
    color: "#bfb2da",
    colorDeep: "#8d7fae",
    histamineSafe: true,
  },
];

const categories = ["Frühstück", "Mittag", "Abend", "Snack"];

// Übersetzt eine Datenbank-Zeile in ein App-Rezept
function fromDb(row) {
  return {
    id: row.recipe_id,
    phase: row.phase,
    title: row.title,
    category: row.category,
    baseServings: row.base_servings,
    tags: row.tags || [],
    benefits: row.benefits || "",
    ingredients: row.ingredients || [],
    steps: row.steps || [],
    notes: row.notes || "",
  };
}

// Übersetzt ein App-Rezept in eine Datenbank-Zeile
function toDb(recipe) {
  return {
    recipe_id: recipe.id,
    phase: recipe.phase,
    title: recipe.title,
    category: recipe.category,
    base_servings: recipe.baseServings,
    tags: recipe.tags,
    benefits: recipe.benefits,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    notes: recipe.notes,
  };
}

export default function Rezeptbuch({ session }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePhase, setActivePhase] = useState(null);
  const [activeCategory, setActiveCategory] = useState("Alle");
  const [selectedId, setSelectedId] = useState(null);
  const [servings, setServings] = useState(1);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [addedToList, setAddedToList] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [cycleEntries, setCycleEntries] = useState([]);
  const [cycleLoading, setCycleLoading] = useState(true);

  useEffect(() => {
    async function ladeRezepte() {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Fehler beim Laden:", error);
      } else {
        setRecipes(data.map(fromDb));
      }
      setLoading(false);
    }
    ladeRezepte();
  }, []);

  // ---- ZYKLUSTRACKER ----

  const loadCycleEntries = async () => {
    const { data, error } = await supabase
      .from("cycle_entries")
      .select("*")
      .order("period_start", { ascending: false });
    if (error) {
      console.error("Zyklus-Fehler:", error);
      return [];
    }
    return data || [];
  };

  const addCycleEntry = async (date) => {
    const { error } = await supabase.from("cycle_entries").insert({
      period_start: toISODateString(date),
      user_id: session.user.id,
    });
    if (error) {
      console.error("Zyklus-Insert-Fehler:", error);
      return;
    }
    setCycleEntries(await loadCycleEntries());
  };

  const deleteCycleEntry = async (id) => {
    const { error } = await supabase.from("cycle_entries").delete().eq("id", id);
    if (error) {
      console.error("Zyklus-Delete-Fehler:", error);
      return;
    }
    setCycleEntries(cycleEntries.filter((e) => e.id !== id));
  };

  useEffect(() => {
    async function ladeZyklus() {
      const items = await loadCycleEntries();
      setCycleEntries(items);
      setCycleLoading(false);
    }
    ladeZyklus();
  }, []);

  const currentCycleDay = getCurrentCycleDay(cycleEntries);
  const autoPhaseId = getPhaseForDay(currentCycleDay);
  const hasCycleData = cycleEntries.length > 0;
  const autoPhase = phases.find((p) => p.id === autoPhaseId);

  const addToDb = async (recipe) => {
    const { error } = await supabase.from("recipes").insert(toDb(recipe));
    if (error) console.error("Insert-Fehler:", error);
  };
  
  const updateInDb = async (recipe) => {
    const { error } = await supabase
      .from("recipes")
      .update(toDb(recipe))
      .eq("recipe_id", recipe.id);
    if (error) console.error("Update-Fehler:", error);
  };
  
  const deleteFromDb = async (id) => {
    const { error } = await supabase
      .from("recipes")
      .delete()
      .eq("recipe_id", id);
    if (error) console.error("Delete-Fehler:", error);
  };

  const selected = recipes.find((r) => r.id === selectedId);
  const currentPhase = phases.find((p) => p.id === activePhase);

  const chatPhaseId = hasCycleData ? autoPhaseId : activePhase || phases[0].id;
  const chatPhase = phases.find((p) => p.id === chatPhaseId) || phases[0];
  const chatCycleDay = hasCycleData ? currentCycleDay : null;

  const saveChatRecipe = async (recipe, category) => {
    const cleaned = {
      ...recipe,
      id: "ai-" + Date.now(),
      category,
      tags: Array.isArray(recipe.tags) ? recipe.tags.filter(Boolean) : [],
    };
    await addToDb(cleaned);
    setRecipes((prev) => [...prev, cleaned]);
  };

  const addChatRecipeToShoppingList = async (recipe) => {
    await addToShoppingList(recipe, recipe.baseServings);
  };

  const openRecipe = (r) => {
    setSelectedId(r.id);
    setServings(r.baseServings);
    setEditMode(false);
    setIsNew(false);
  };

  const closeRecipe = () => {
    setSelectedId(null);
    setEditMode(false);
    setDraft(null);
    setIsNew(false);
  };

  const startEdit = () => {
    setDraft(JSON.parse(JSON.stringify(selected)));
    setEditMode(true);
  };

  const startNew = () => {
    console.log("startNew wurde aufgerufen! activePhase:", activePhase);
    const newRecipe = {
      id: "custom-" + Date.now(),
      phase: activePhase,
      title: "Neues Rezept",
      category: "Mittag",
      baseServings: 1,
      tags: [],
      benefits: "",
      ingredients: [{ name: "", amount: 0, unit: "g" }],
      steps: [""],
      notes: "",
    };
    setDraft(newRecipe);
    setSelectedId(newRecipe.id);
    setEditMode(true);
    setIsNew(true);
    setServings(1);
  };

  const saveDraft = async () => {
    const cleaned = { ...draft, tags: draft.tags.filter(Boolean) };
    if (isNew) {
      await addToDb(cleaned);
      setRecipes([...recipes, cleaned]);
    } else {
      await updateInDb(cleaned);
      setRecipes(recipes.map((r) => (r.id === cleaned.id ? cleaned : r)));
    }
    setEditMode(false);
    setIsNew(false);
    setSelectedId(cleaned.id);
  };

  const deleteRecipe = async () => {
    if (!confirm("Dieses Rezept wirklich löschen?")) return;
    await deleteFromDb(selectedId);
    setRecipes(recipes.filter((r) => r.id !== selectedId));
    closeRecipe();
  };

  const scaleAmount = (amount, base, target) => {
    const scaled = (amount * target) / base;
    if (scaled < 1) return Math.round(scaled * 100) / 100;
    if (scaled < 10) return Math.round(scaled * 10) / 10;
    return Math.round(scaled);
  };

  const openShoppingList = async () => {
    setShoppingLoading(true);
    setShowShoppingList(true);
    const items = await loadShoppingList();
    setShoppingItems(items);
    setShoppingLoading(false);
  };

  const closeShoppingList = () => {
    setShowShoppingList(false);
  };

  const fontStyle = { fontFamily: "'Karla', system-ui, sans-serif", fontWeight: 300 };
  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,500;0,600;0,700;1,500;1,600&family=Karla:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap');
    .serif { font-family: 'Alegreya', Georgia, serif; font-weight: 500; }
  `;

  // ---- EINKAUFSLISTE ----

const loadShoppingList = async () => {
  const { data, error } = await supabase
    .from("shopping_list")
    .select("*")
    .order("checked", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Shopping-List-Fehler:", error);
    return [];
  }
  return data || [];
};

const addToShoppingList = async (recipe, currentServings) => {
  const items = recipe.ingredients.map((ing) => ({
    ingredient_name: ing.name,
    amount: scaleAmount(ing.amount, recipe.baseServings, currentServings),
    unit: ing.unit,
    checked: false,
    recipe_title: recipe.title,
  }));
  const { error } = await supabase.from("shopping_list").insert(items);
  if (error) {
    console.error("Insert-Fehler:", error);
    return false;
  }
  return true;
};

const toggleShoppingItem = async (id, currentChecked) => {
  const { error } = await supabase
    .from("shopping_list")
    .update({ checked: !currentChecked })
    .eq("id", id);
  if (error) console.error("Toggle-Fehler:", error);
};

const deleteShoppingItem = async (id) => {
  const { error } = await supabase
    .from("shopping_list")
    .delete()
    .eq("id", id);
  if (error) console.error("Delete-Fehler:", error);
};

const clearCheckedItems = async () => {
  const { error } = await supabase
    .from("shopping_list")
    .delete()
    .eq("checked", true);
  if (error) console.error("Clear-Fehler:", error);
};

const clearAllItems = async () => {
  const { error } = await supabase
    .from("shopping_list")
    .delete()
    .neq("id", 0);
  if (error) console.error("Clear-all-Fehler:", error);
};

  // Phase selection screen
  if (showShoppingList) {
    return (
      <div className="min-h-screen" style={{ background: "#272e1b", ...fontStyle }}>
        <style>{globalStyles}</style>
        <ShoppingList
          items={shoppingItems}
          setItems={setShoppingItems}
          loading={shoppingLoading}
          onClose={closeShoppingList}
          onToggle={async (item) => {
            await toggleShoppingItem(item.id, item.checked);
            setShoppingItems(shoppingItems.map((i) =>
              i.id === item.id ? { ...i, checked: !i.checked } : i
            ));
          }}
          onDelete={async (item) => {
            await deleteShoppingItem(item.id);
            setShoppingItems(shoppingItems.filter((i) => i.id !== item.id));
          }}
          onClearChecked={async () => {
            await clearCheckedItems();
            setShoppingItems(shoppingItems.filter((i) => !i.checked));
          }}
          onClearAll={async () => {
            if (!confirm("Gesamte Einkaufsliste wirklich leeren?")) return;
            await clearAllItems();
            setShoppingItems([]);
          }}
        />
      </div>
    );
  }

  if (showTracker) {
    return (
      <div className="min-h-screen" style={{ background: "#272e1b", ...fontStyle }}>
        <style>{globalStyles}</style>
        <CycleTracker
          entries={cycleEntries}
          loading={cycleLoading}
          onClose={() => setShowTracker(false)}
          onAdd={addCycleEntry}
          onDelete={deleteCycleEntry}
        />
      </div>
    );
  }

  if (showChat) {
    return (
      <div className="min-h-screen" style={{ background: "#272e1b", ...fontStyle }}>
        <style>{globalStyles}</style>
        <RecipeChat
          phase={chatPhase.id}
          phaseName={chatPhase.name}
          cycleDay={chatCycleDay}
          histamineSafe={chatPhase.histamineSafe}
          onClose={() => setShowChat(false)}
          onSaveRecipe={saveChatRecipe}
          onAddToShoppingList={addChatRecipeToShoppingList}
        />
      </div>
    );
  }

  if (!activePhase && !selected) {
    return (
      <div className="min-h-screen" style={{ background: "#272e1b", ...fontStyle }}>
        <style>{globalStyles}</style>
        <div className="max-w-5xl mx-auto px-6 py-12">
          <header className="mb-14 border-b-2 pb-8" style={{ borderColor: "#ebddc5" }}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-3" style={{ color: "#bfb2da" }}>
                  <BookOpen size={16} />
                  <span className="text-[11px] tracking-[0.2em] uppercase font-medium">Nach Zyklusphase</span>
                </div>
                <h1 className="serif text-6xl md:text-7xl leading-[0.9] tracking-tight" style={{ color: "#ebddc5" }}>
                  Rezept-
                  <br />
                  <em className="italic" style={{ color: "#bfb2da" }}>buch</em>
                </h1>
                <p className="mt-4 max-w-md text-sm leading-relaxed" style={{ color: "#ccdbb2" }}>
                  Vegetarisch, histaminarm und proteinreich — abgestimmt auf die vier Phasen deines Zyklus.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowChat(true)}
                  title="Rezept-Assistent"
                  className="p-3 rounded-full"
                  style={{ border: "1px solid #bfb2da", color: "#bfb2da", background: "transparent" }}
                >
                  <Sparkles size={16} />
                </button>
                <button
                  onClick={() => setShowTracker(true)}
                  title="Zyklustracker"
                  className="p-3 rounded-full"
                  style={{ border: "1px solid #ebddc5", color: "#ebddc5", background: "transparent" }}
                >
                  <Calendar size={16} />
                </button>
                <button
                  onClick={openShoppingList}
                  title="Einkaufsliste"
                  className="p-3 rounded-full"
                  style={{ border: "1px solid #ebddc5", color: "#ebddc5", background: "transparent" }}
                >
                  <ShoppingCart size={16} />
                </button>
                <button
                  onClick={() => supabase.auth.signOut()}
                  title="Abmelden"
                  className="p-3 rounded-full"
                  style={{ border: "1px solid #ebddc5", color: "#ebddc5", background: "transparent" }}
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </header>

          {hasCycleData && autoPhase && (
            <div
              className="flex items-center justify-between gap-4 flex-wrap mb-10 p-6 rounded-sm"
              style={{ background: "#3d472b", border: `1px solid ${autoPhase.color}40` }}
            >
              <div>
                <div className="text-[11px] tracking-[0.2em] uppercase mb-1" style={{ color: autoPhase.color }}>
                  Tag {currentCycleDay} · {autoPhase.name}
                </div>
                <p className="serif italic text-lg" style={{ color: "#ebddc5" }}>
                  {autoPhase.subtitle}
                </p>
              </div>
              <button
                onClick={() => {
                  setActivePhase(autoPhase.id);
                  setActiveCategory("Alle");
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium whitespace-nowrap"
                style={{ background: autoPhase.color, color: "#272e1b" }}
              >
                Rezepte für heute
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {phases.map((p, i) => {
              const count = recipes.filter((r) => r.phase === p.id).length;
              const isToday = hasCycleData && p.id === autoPhaseId;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setActivePhase(p.id);
                    setActiveCategory("Alle");
                  }}
                  className="text-left p-8 rounded-sm transition-all hover:shadow-lg group relative overflow-hidden"
                  style={{
                    background: "#3d472b",
                    border: isToday ? `2px solid ${p.color}` : `1px solid ${p.color}30`,
                  }}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1 transition-all group-hover:h-2"
                    style={{ background: p.color }}
                  />
                  <div className="flex items-start justify-between mb-4">
                    <span className="serif italic text-sm" style={{ color: p.color }}>
                      Phase № {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex items-center gap-2">
                      {isToday && (
                        <span
                          className="text-[11px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-full"
                          style={{ background: p.color, color: "#272e1b" }}
                        >
                          Heute
                        </span>
                      )}
                      <span className="text-[11px] tracking-[0.2em] uppercase" style={{ color: "#ccdbb2" }}>
                        {count} {count === 1 ? "Rezept" : "Rezepte"}
                      </span>
                    </span>
                  </div>
                  <h2 className="serif text-4xl leading-tight mb-1" style={{ color: "#ebddc5" }}>
                    {p.name}
                  </h2>
                  <div className="serif italic text-lg mb-4" style={{ color: p.color }}>
                    {p.subtitle}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#ccdbb2" }}>
                    {p.description}
                  </p>
                  {p.histamineSafe && (
                    <div
                      className="mt-4 inline-block text-[11px] tracking-[0.2em] uppercase px-2 py-1 rounded-sm"
                      style={{ background: p.color, color: "#272e1b" }}
                    >
                      Histaminarm
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <footer className="mt-16 pt-8 border-t text-xs" style={{ borderColor: "#ebddc520", color: "#ccdbb2" }}>
            Wähle eine Phase, um die passenden Rezepte zu sehen. Alle Rezepte sind anpassbar und du kannst eigene hinzufügen.
          </footer>
        </div>
      </div>
    );
  }

  // Category/list view within a phase
  if (activePhase && !selected && !editMode) {
    const phaseRecipes = recipes.filter((r) => r.phase === activePhase);
    const filtered = activeCategory === "Alle" ? phaseRecipes : phaseRecipes.filter((r) => r.category === activeCategory);

    return (
      <div className="min-h-screen" style={{ background: "#272e1b", ...fontStyle }}>
        <style>{globalStyles}</style>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <button
            onClick={() => {
              setActivePhase(null);
              setActiveCategory("Alle");
            }}
            className="flex items-center gap-2 mb-8 text-sm hover:underline"
            style={{ color: "#ebddc5" }}
          >
            <ChevronLeft size={16} /> Alle Phasen
          </button>

          <header className="mb-10 pb-6 border-b-2" style={{ borderColor: currentPhase.color }}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: currentPhase.color }}>
                  Zyklusphase
                </div>
                <h1 className="serif text-5xl md:text-6xl leading-[0.95]" style={{ color: "#ebddc5" }}>
                  {currentPhase.name}
                </h1>
                <div className="serif italic text-xl mt-1" style={{ color: currentPhase.color }}>
                  {currentPhase.subtitle}
                </div>
                <p className="mt-4 max-w-xl text-sm leading-relaxed" style={{ color: "#ccdbb2" }}>
                  {currentPhase.description}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowChat(true)}
                  title="Rezept-Assistent"
                  className="p-3 rounded-full"
                  style={{ border: "1px solid #bfb2da", color: "#bfb2da", background: "transparent" }}
                >
                  <Sparkles size={16} />
                </button>
                <button
                  onClick={openShoppingList}
                  title="Einkaufsliste"
                  className="p-3 rounded-full"
                  style={{ border: `1px solid ${currentPhase.color}`, color: currentPhase.color, background: "transparent" }}
                >
                  <ShoppingCart size={16} />
                </button>
                <button
                  onClick={startNew}
                  className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium"
                  style={{ background: currentPhase.color, color: "#272e1b" }}
                >
                  <Plus size={16} /> Neues Rezept
                </button>
              </div>
            </div>
          </header>

          <div className="flex flex-wrap gap-2 mb-10">
            {["Alle", ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="px-4 py-2 rounded-full text-sm transition-all"
                style={{
                  background: activeCategory === cat ? currentPhase.color : "transparent",
                  color: activeCategory === cat ? "#272e1b" : "#ebddc5",
                  border: `1px solid ${activeCategory === cat ? currentPhase.color : "#ebddc540"}`,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm" style={{ color: "#ccdbb2" }}>Lade…</p>
          ) : filtered.length === 0 ? (
            <p className="serif italic text-lg" style={{ color: "#ccdbb2" }}>
              Noch keine Rezepte in dieser Kategorie. Tippe auf „Neues Rezept".
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filtered.map((r, i) => (
                <article
                  key={r.id}
                  onClick={() => openRecipe(r)}
                  className="group cursor-pointer p-6 rounded-sm transition-all hover:shadow-lg"
                  style={{ background: "#3d472b", border: "1px solid #ebddc520" }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <span
                      className="text-[11px] tracking-[0.2em] uppercase px-2 py-1 rounded-sm"
                      style={{ background: currentPhase.color, color: "#272e1b" }}
                    >
                      {r.category}
                    </span>
                    <span className="serif italic text-sm" style={{ color: currentPhase.color }}>
                      № {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h2 className="serif text-3xl leading-tight mb-3 group-hover:italic transition-all" style={{ color: "#ebddc5" }}>
                    {r.title}
                  </h2>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: "#ccdbb2" }}>
                    {r.benefits}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {r.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: "#aebf92", color: "#ccdbb2" }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Detail or edit view
  const phase = phases.find((p) => p.id === (selected?.phase || draft?.phase)) || phases[0];

  return (
    <div className="min-h-screen" style={{ background: "#272e1b", ...fontStyle }}>
      <style>{globalStyles}</style>

      {selected && !editMode && (
        <RecipeDetail
          recipe={selected}
          phase={phase}
          servings={servings}
          setServings={setServings}
          scaleAmount={scaleAmount}
          onClose={closeRecipe}
          onEdit={startEdit}
          onDelete={deleteRecipe}
          addedToList={addedToList}
          onAddToShoppingList={async (recipe, currentServings) => {
            const success = await addToShoppingList(recipe, currentServings);
            if (success) {
              setAddedToList(true);
              setTimeout(() => setAddedToList(false), 2000);
            }
          }}
        />
      )}

      {editMode && draft && (
        <RecipeEditor
          draft={draft}
          setDraft={setDraft}
          phase={phase}
          onCancel={() => {
            setEditMode(false);
            if (isNew) closeRecipe();
          }}
          onSave={saveDraft}
          isNew={isNew}
        />
      )}
    </div>
  );
}

function RecipeDetail({ recipe, phase, servings, setServings, scaleAmount, onClose, onEdit, onDelete, onAddToShoppingList, addedToList }) {
  const formatAmount = (n) => {
    if (n === 0) return "";
    return String(n).replace(".", ",");
  };

  const ink = "#201e1d";
  const inkMuted = "#6b5d4f";
  const inset = "#eaddc2";
  const accent = phase.colorDeep;

  return (
    <div className="min-h-screen" style={{ background: "#f5ead8" }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <button
          onClick={onClose}
          className="flex items-center gap-2 mb-8 text-sm hover:underline"
          style={{ color: ink }}
        >
          <ChevronLeft size={16} /> Zurück
        </button>

        <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
          <div className="flex gap-2 items-center flex-wrap">
            <span
              className="text-[11px] tracking-[0.2em] uppercase px-2 py-1 rounded-sm"
              style={{ background: phase.color, color: ink }}
            >
              {phase.name}
            </span>
            <span
              className="text-[11px] tracking-[0.2em] uppercase px-2 py-1 rounded-sm"
              style={{ background: inset, color: ink }}
            >
              {recipe.category}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
              style={{ border: `1px solid ${ink}`, color: ink, background: "transparent" }}
            >
              <Edit3 size={12} /> Bearbeiten
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
              style={{ border: `1px solid ${accent}`, color: accent, background: "transparent" }}
            >
              <Trash2 size={12} /> Löschen
            </button>
          </div>
        </div>

        <h1 className="serif text-5xl md:text-6xl leading-[0.95] mb-6 mt-4" style={{ color: ink }}>
          {recipe.title}
        </h1>

        {recipe.benefits && (
          <p className="serif italic text-lg leading-relaxed mb-8 max-w-xl" style={{ color: accent }}>
            „{recipe.benefits}"
          </p>
        )}

        <div
          className="flex items-center justify-between p-4 rounded-sm mb-10"
          style={{ background: inset, border: `1px solid ${ink}15` }}
        >
          <div>
            <div className="text-[11px] tracking-[0.2em] uppercase mb-1" style={{ color: inkMuted }}>
              Portionen
            </div>
            <div className="serif text-2xl" style={{ color: ink }}>
              {servings}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setServings(Math.max(1, servings - 1))}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: phase.color, color: ink }}
            >
              <Minus size={14} />
            </button>
            <button
              onClick={() => setServings(servings + 1)}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: phase.color, color: ink }}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <button
          onClick={() => onAddToShoppingList(recipe, servings)}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-sm mb-10 text-sm font-medium transition-all"
          style={{
            background: addedToList ? "#9cb37c" : phase.color,
            color: ink,
          }}
        >
          {addedToList ? (
            <>
              <Check size={16} /> Zutaten hinzugefügt!
            </>
          ) : (
            <>
              <ShoppingCart size={16} /> Zutaten zur Einkaufsliste ({servings} {servings === 1 ? "Portion" : "Portionen"})
            </>
          )}
        </button>

        <section className="mb-10">
          <h2
            className="text-[11px] tracking-[0.2em] uppercase mb-4 pb-2 border-b"
            style={{ color: accent, borderColor: `${ink}20` }}
          >
            Zutaten
          </h2>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-baseline gap-3 py-1 text-[15px] leading-[1.4]">
                <span className="serif text-lg tabular-nums min-w-[80px]" style={{ color: accent }}>
                  {formatAmount(scaleAmount(ing.amount, recipe.baseServings, servings))} {ing.unit}
                </span>
                <span style={{ color: ink }}>{ing.name}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2
            className="text-[11px] tracking-[0.2em] uppercase mb-4 pb-2 border-b"
            style={{ color: accent, borderColor: `${ink}20` }}
          >
            Zubereitung
          </h2>
          <ol className="space-y-4">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="serif italic text-2xl leading-none pt-1" style={{ color: accent }}>
                  {i + 1}.
                </span>
                <p className="flex-1 text-[15px] leading-[1.4]" style={{ color: ink }}>
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {recipe.notes && (
          <section
            className="p-5 rounded-sm mb-8"
            style={{ background: inset, borderLeft: `3px solid ${accent}` }}
          >
            <div className="text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: accent }}>
              Notiz
            </div>
            <p className="text-sm leading-relaxed" style={{ color: inkMuted }}>
              {recipe.notes}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

function RecipeEditor({ draft, setDraft, phase, onCancel, onSave, isNew }) {
  const update = (field, value) => setDraft({ ...draft, [field]: value });

  const updateIngredient = (i, field, value) => {
    const next = [...draft.ingredients];
    next[i] = { ...next[i], [field]: field === "amount" ? parseFloat(value) || 0 : value };
    update("ingredients", next);
  };

  const addIngredient = () => update("ingredients", [...draft.ingredients, { name: "", amount: 0, unit: "g" }]);
  const removeIngredient = (i) => update("ingredients", draft.ingredients.filter((_, j) => j !== i));

  const updateStep = (i, value) => {
    const next = [...draft.steps];
    next[i] = value;
    update("steps", next);
  };
  const addStep = () => update("steps", [...draft.steps, ""]);
  const removeStep = (i) => update("steps", draft.steps.filter((_, j) => j !== i));

  const inputStyle = {
    background: "#272e1b",
    border: "1px solid #ebddc540",
    color: "#ebddc5",
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onCancel} className="flex items-center gap-2 text-sm hover:underline" style={{ color: "#ebddc5" }}>
          <X size={16} /> Abbrechen
        </button>
        <button
          onClick={onSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm"
          style={{ background: phase.color, color: "#272e1b" }}
        >
          <Save size={14} /> Speichern
        </button>
      </div>

      <div className="text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: phase.color }}>
        {isNew ? "Neues Rezept" : "Rezept bearbeiten"}
      </div>

      <input
        value={draft.title}
        onChange={(e) => update("title", e.target.value)}
        className="serif text-4xl md:text-5xl leading-tight mb-6 w-full bg-transparent outline-none border-b pb-2"
        style={{ color: "#ebddc5", borderColor: "#ebddc530" }}
        placeholder="Titel"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="text-[11px] tracking-[0.2em] uppercase block mb-1" style={{ color: "#ccdbb2" }}>
            Zyklusphase
          </label>
          <select
            value={draft.phase}
            onChange={(e) => update("phase", e.target.value)}
            className="w-full px-3 py-2 rounded-sm outline-none"
            style={inputStyle}
          >
            {phases.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] tracking-[0.2em] uppercase block mb-1" style={{ color: "#ccdbb2" }}>
            Kategorie
          </label>
          <select
            value={draft.category}
            onChange={(e) => update("category", e.target.value)}
            className="w-full px-3 py-2 rounded-sm outline-none"
            style={inputStyle}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] tracking-[0.2em] uppercase block mb-1" style={{ color: "#ccdbb2" }}>
            Basis-Portionen
          </label>
          <input
            type="number"
            min="1"
            value={draft.baseServings}
            onChange={(e) => update("baseServings", parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 rounded-sm outline-none"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="text-[11px] tracking-[0.2em] uppercase block mb-1" style={{ color: "#ccdbb2" }}>
          Wirkung / Nutzen
        </label>
        <textarea
          value={draft.benefits}
          onChange={(e) => update("benefits", e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-sm outline-none resize-none"
          style={inputStyle}
        />
      </div>

      <div className="mb-6">
        <label className="text-[11px] tracking-[0.2em] uppercase block mb-1" style={{ color: "#ccdbb2" }}>
          Tags (mit Komma getrennt)
        </label>
        <input
          value={draft.tags.join(", ")}
          onChange={(e) => update("tags", e.target.value.split(",").map((t) => t.trim()))}
          className="w-full px-3 py-2 rounded-sm outline-none"
          style={inputStyle}
        />
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-[11px] tracking-[0.2em] uppercase" style={{ color: phase.color }}>
            Zutaten
          </label>
          <button onClick={addIngredient} className="text-xs flex items-center gap-1" style={{ color: "#ebddc5" }}>
            <Plus size={12} /> hinzufügen
          </button>
        </div>
        <div className="space-y-2">
          {draft.ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="number"
                step="0.1"
                value={ing.amount}
                onChange={(e) => updateIngredient(i, "amount", e.target.value)}
                className="w-20 px-2 py-1.5 rounded-sm outline-none text-sm"
                style={inputStyle}
              />
              <input
                value={ing.unit}
                onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                className="w-20 px-2 py-1.5 rounded-sm outline-none text-sm"
                style={inputStyle}
                placeholder="Einheit"
              />
              <input
                value={ing.name}
                onChange={(e) => updateIngredient(i, "name", e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-sm outline-none text-sm"
                style={inputStyle}
                placeholder="Name"
              />
              <button onClick={() => removeIngredient(i)} style={{ color: phase.color }}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-[11px] tracking-[0.2em] uppercase" style={{ color: phase.color }}>
            Zubereitung
          </label>
          <button onClick={addStep} className="text-xs flex items-center gap-1" style={{ color: "#ebddc5" }}>
            <Plus size={12} /> Schritt
          </button>
        </div>
        <div className="space-y-2">
          {draft.steps.map((step, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="serif italic text-lg pt-1" style={{ color: phase.color }}>
                {i + 1}.
              </span>
              <textarea
                value={step}
                onChange={(e) => updateStep(i, e.target.value)}
                rows={2}
                className="flex-1 px-2 py-1.5 rounded-sm outline-none text-sm resize-none"
                style={inputStyle}
              />
              <button onClick={() => removeStep(i)} style={{ color: phase.color }}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-10">
        <label className="text-[11px] tracking-[0.2em] uppercase block mb-1" style={{ color: "#ccdbb2" }}>
          Notiz
        </label>
        <textarea
          value={draft.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-sm outline-none resize-none"
          style={inputStyle}
        />
      </div>
    </div>
  );
}

function ShoppingList({ items, setItems, loading, onClose, onToggle, onDelete, onClearChecked, onClearAll }) {
  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  const formatAmount = (n) => {
    if (!n) return "";
    return String(n).replace(".", ",");
  };

  const handleShare = async () => {
    const lines = unchecked.map(
      (i) => `☐ ${formatAmount(i.amount)} ${i.unit || ""} ${i.ingredient_name}`.trim()
    );
    const text = "Einkaufsliste:\n" + lines.join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: "Einkaufsliste", text });
      } catch (e) {
        // user cancelled share
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert("Liste in die Zwischenablage kopiert!");
    }
  };

  // Gruppiere nach Zutat+Einheit
  const grouped = {};
  unchecked.forEach((item) => {
    const key = `${item.ingredient_name}___${item.unit || ""}`;
    if (grouped[key]) {
      grouped[key].amount += item.amount || 0;
      grouped[key].ids.push(item.id);
      if (item.recipe_title && !grouped[key].recipes.includes(item.recipe_title)) {
        grouped[key].recipes.push(item.recipe_title);
      }
    } else {
      grouped[key] = {
        ingredient_name: item.ingredient_name,
        amount: item.amount || 0,
        unit: item.unit,
        ids: [item.id],
        recipes: item.recipe_title ? [item.recipe_title] : [],
        checked: false,
      };
    }
  });
  const groupedList = Object.values(grouped);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <button
        onClick={onClose}
        className="flex items-center gap-2 mb-8 text-sm hover:underline"
        style={{ color: "#ebddc5" }}
      >
        <ChevronLeft size={16} /> Zurück
      </button>

      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2" style={{ color: "#bfb2da" }}>
            <ShoppingCart size={16} />
            <span className="text-[11px] tracking-[0.2em] uppercase font-medium">Einkaufsliste</span>
          </div>
          <h1 className="serif text-5xl md:text-6xl leading-[0.95]" style={{ color: "#ebddc5" }}>
            Einkaufs-
            <br />
            <em className="italic" style={{ color: "#bfb2da" }}>liste</em>
          </h1>
        </div>
        <div className="flex gap-2">
          {unchecked.length > 0 && (
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs"
              style={{ border: "1px solid #ebddc5", color: "#ebddc5", background: "transparent" }}
            >
              <Share2 size={14} /> Teilen
            </button>
          )}
          {items.length > 0 && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs"
              style={{ border: "1px solid #bfb2da", color: "#bfb2da", background: "transparent" }}
            >
              <Trash2 size={14} /> Alles leeren
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "#ccdbb2" }}>Lade…</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart size={48} style={{ color: "#aebf92" }} className="mx-auto mb-4" />
          <p className="serif italic text-xl mb-2" style={{ color: "#ccdbb2" }}>
            Deine Einkaufsliste ist leer
          </p>
          <p className="text-sm" style={{ color: "#ccdbb2" }}>
            Öffne ein Rezept und tippe auf „Zutaten zur Einkaufsliste"
          </p>
        </div>
      ) : (
        <>
          {/* Offene Zutaten */}
          {groupedList.length > 0 && (
            <section className="mb-10">
              <h2
                className="text-[11px] tracking-[0.2em] uppercase mb-4 pb-2 border-b"
                style={{ color: "#bfb2da", borderColor: "#ebddc530" }}
              >
                Noch zu besorgen ({groupedList.length})
              </h2>
              <ul className="space-y-1">
                {groupedList.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-sm cursor-pointer transition-colors"
                    style={{ background: "#3d472b" }}
                    onClick={() => {
                      item.ids.forEach((id) => {
                        const original = items.find((x) => x.id === id);
                        if (original) onToggle(original);
                      });
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-sm border-2 flex-shrink-0"
                      style={{ borderColor: "#bfb2da" }}
                    />
                    <div className="flex-1 min-w-0">
                      <span style={{ color: "#ebddc5" }}>
                        <span className="serif" style={{ color: "#bfb2da" }}>
                          {formatAmount(item.amount)} {item.unit}
                        </span>{" "}
                        {item.ingredient_name}
                      </span>
                      {item.recipes.length > 0 && (
                        <div className="text-[10px] mt-0.5" style={{ color: "#ccdbb2" }}>
                          {item.recipes.join(", ")}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Abgehakte Zutaten */}
          {checked.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4 pb-2 border-b" style={{ borderColor: "#ebddc530" }}>
                <h2
                  className="text-[11px] tracking-[0.2em] uppercase"
                  style={{ color: "#ccdbb2" }}
                >
                  Erledigt ({checked.length})
                </h2>
                <button
                  onClick={onClearChecked}
                  className="text-xs hover:underline"
                  style={{ color: "#bfb2da" }}
                >
                  Erledigte entfernen
                </button>
              </div>
              <ul className="space-y-1">
                {checked.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-sm cursor-pointer transition-colors opacity-50"
                    style={{ background: "#3d472b" }}
                    onClick={() => onToggle(item)}
                  >
                    <div
                      className="w-5 h-5 rounded-sm flex items-center justify-center flex-shrink-0"
                      style={{ background: "#bfb2da" }}
                    >
                      <Check size={12} color="#272e1b" />
                    </div>
                    <span className="line-through" style={{ color: "#ccdbb2" }}>
                      {formatAmount(item.amount)} {item.unit} {item.ingredient_name}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function MiniCalendar({ selected, onSelect, accentColor }) {
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Montag = 0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayKey = new Date().toDateString();
  const selectedKey = selected.toDateString();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const goNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  return (
    <div className="p-4 rounded-sm" style={{ background: "#272e1b", border: "1px solid #ebddc530" }}>
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={goPrevMonth} className="p-1" style={{ color: "#ebddc5" }}>
          <ChevronLeft size={16} />
        </button>
        <span className="serif italic text-lg" style={{ color: "#ebddc5" }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button type="button" onClick={goNextMonth} className="p-1" style={{ color: "#ebddc5" }}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="text-center text-[10px] uppercase tracking-wide py-1" style={{ color: "#ccdbb2" }}>
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const cellDate = new Date(viewYear, viewMonth, d);
          const isToday = cellDate.toDateString() === todayKey;
          const isSelected = cellDate.toDateString() === selectedKey;
          return (
            <button
              type="button"
              key={i}
              onClick={() => onSelect(cellDate)}
              className="aspect-square rounded-full text-sm"
              style={{
                background: isSelected ? accentColor : "transparent",
                color: isSelected ? "#272e1b" : "#ebddc5",
                border: isToday && !isSelected ? `1px solid ${accentColor}` : "1px solid transparent",
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CycleTracker({ entries, loading, onClose, onAdd, onDelete }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [saving, setSaving] = useState(false);

  const avgLength = getAverageCycleLength(entries);
  const currentDay = getCurrentCycleDay(entries);
  const predicted = getPredictedNextPeriod(entries);
  const sorted = [...entries].sort((a, b) => new Date(b.period_start) - new Date(a.period_start));

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });

  const handleConfirm = async () => {
    setSaving(true);
    await onAdd(pickerDate);
    setSaving(false);
    setPickerOpen(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <button
        onClick={onClose}
        className="flex items-center gap-2 mb-8 text-sm hover:underline"
        style={{ color: "#ebddc5" }}
      >
        <ChevronLeft size={16} /> Zurück
      </button>

      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2" style={{ color: "#bfb2da" }}>
            <Calendar size={16} />
            <span className="text-[11px] tracking-[0.2em] uppercase font-medium">Zyklustracker</span>
          </div>
          <h1 className="serif text-5xl md:text-6xl leading-[0.95]" style={{ color: "#ebddc5" }}>
            Mein
            <br />
            <em className="italic" style={{ color: "#bfb2da" }}>Zyklus</em>
          </h1>
        </div>
        <button
          onClick={() => { setPickerDate(new Date()); setPickerOpen(true); }}
          className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium"
          style={{ background: "#bfb2da", color: "#272e1b" }}
        >
          <Plus size={16} /> Neue Periode eintragen
        </button>
      </div>

      {pickerOpen && (
        <div className="mb-10 p-6 rounded-sm" style={{ background: "#3d472b", border: "1px solid #ebddc520" }}>
          <p className="text-sm mb-4" style={{ color: "#ccdbb2" }}>Wann hat deine Periode begonnen?</p>
          <MiniCalendar selected={pickerDate} onSelect={setPickerDate} accentColor="#bfb2da" />
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setPickerOpen(false)}
              className="px-4 py-2.5 rounded-full text-xs"
              style={{ border: "1px solid #ebddc5", color: "#ebddc5" }}
            >
              Abbrechen
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="px-4 py-2.5 rounded-full text-xs font-medium disabled:opacity-60"
              style={{ background: "#bfb2da", color: "#272e1b" }}
            >
              {saving ? "Speichere…" : `${formatDate(pickerDate)} speichern`}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: "#ccdbb2" }}>Lade…</p>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <Calendar size={48} style={{ color: "#aebf92" }} className="mx-auto mb-4" />
          <p className="serif italic text-xl mb-2" style={{ color: "#ccdbb2" }}>Noch keine Einträge</p>
          <p className="text-sm" style={{ color: "#ccdbb2" }}>
            Trag deinen letzten Periodenstart ein, damit die App deine Phase automatisch erkennt.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <div className="p-5 rounded-sm" style={{ background: "#3d472b", border: "1px solid #ebddc520" }}>
              <div className="text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: "#ccdbb2" }}>Aktueller Tag</div>
              <div className="serif text-3xl" style={{ color: "#ebddc5" }}>Tag {currentDay}</div>
            </div>
            <div className="p-5 rounded-sm" style={{ background: "#3d472b", border: "1px solid #ebddc520" }}>
              <div className="text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: "#ccdbb2" }}>Ø Zykluslänge</div>
              <div className="serif text-3xl" style={{ color: "#ebddc5" }}>{avgLength} Tage</div>
            </div>
            <div className="p-5 rounded-sm" style={{ background: "#3d472b", border: "1px solid #ebddc520" }}>
              <div className="text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: "#ccdbb2" }}>Nächste Periode (geschätzt)</div>
              <div className="serif text-xl" style={{ color: "#ebddc5" }}>{formatDate(predicted)}</div>
            </div>
          </div>

          <h2
            className="text-[11px] tracking-[0.2em] uppercase mb-4 pb-2 border-b"
            style={{ color: "#bfb2da", borderColor: "#ebddc530" }}
          >
            Eingetragene Periodenstarts ({entries.length})
          </h2>
          <ul className="space-y-2">
            {sorted.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between px-4 py-3 rounded-sm"
                style={{ background: "#3d472b", border: "1px solid #ebddc520" }}
              >
                <span className="text-sm" style={{ color: "#ebddc5" }}>{formatDate(entry.period_start)}</span>
                <button onClick={() => onDelete(entry.id)} style={{ color: "#bfb2da" }}>
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
