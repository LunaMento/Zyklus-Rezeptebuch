import React, { useState } from "react";
import { BookOpen, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { supabase } from "./supabaseClient";

const fontStyle = { fontFamily: "'Karla', system-ui, sans-serif", fontWeight: 300 };
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,500;0,600;0,700;1,500;1,600&family=Karla:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap');
  .serif { font-family: 'Alegreya', Georgia, serif; font-weight: 500; }
`;

export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setErrorMsg("Passwort muss mindestens 6 Zeichen haben.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Passwörter stimmen nicht überein.");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("done");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#272e1b", ...fontStyle }}>
      <style>{globalStyles}</style>
      <div className="w-full max-w-md px-6">
        <div className="flex items-center gap-2 mb-3 justify-center" style={{ color: "#bfb2da" }}>
          <BookOpen size={16} />
          <span className="text-[11px] tracking-[0.2em] uppercase font-medium">Neues Passwort</span>
        </div>
        <h1 className="serif text-5xl text-center leading-[0.9] tracking-tight mb-8" style={{ color: "#ebddc5" }}>
          Rezept-
          <br />
          <em className="italic" style={{ color: "#bfb2da" }}>buch</em>
        </h1>

        <div className="p-8 rounded-sm" style={{ background: "#3d472b", border: "1px solid #ebddc520" }}>
          {status === "done" ? (
            <div className="text-center py-4">
              <CheckCircle2 className="mx-auto mb-4" size={32} style={{ color: "#9cb37c" }} />
              <p className="serif italic text-lg mb-2" style={{ color: "#ebddc5" }}>
                Passwort gesetzt
              </p>
              <p className="text-sm leading-relaxed mb-4" style={{ color: "#ccdbb2" }}>
                Du kannst dich jetzt damit anmelden.
              </p>
              <button
                onClick={onDone}
                className="px-5 py-3 rounded-full text-sm font-medium"
                style={{ background: "#bfb2da", color: "#272e1b" }}
              >
                Weiter zum Rezeptbuch
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="block text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: "#ccdbb2" }}>
                Neues Passwort
              </label>
              <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-sm" style={{ background: "#272e1b", border: "1px solid #ebddc530" }}>
                <Lock size={16} style={{ color: "#ccdbb2" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-transparent outline-none text-sm"
                  style={{ color: "#ebddc5" }}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)} style={{ color: "#ccdbb2" }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <label className="block text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: "#ccdbb2" }}>
                Passwort bestätigen
              </label>
              <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-sm" style={{ background: "#272e1b", border: "1px solid #ebddc530" }}>
                <Lock size={16} style={{ color: "#ccdbb2" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-transparent outline-none text-sm"
                  style={{ color: "#ebddc5" }}
                />
              </div>

              {errorMsg && (
                <p className="text-sm mb-4" style={{ color: "#bfb2da" }}>
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-medium disabled:opacity-60"
                style={{ background: "#bfb2da", color: "#272e1b" }}
              >
                {status === "loading" ? "Speichere…" : "Passwort speichern"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
