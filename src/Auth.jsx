import React, { useState, useEffect } from "react";
import { BookOpen, Mail, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { supabase } from "./supabaseClient";

const REMEMBERED_EMAIL_KEY = "rezeptbuch_email";

const fontStyle = { fontFamily: "'Karla', system-ui, sans-serif", fontWeight: 300 };
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,500;0,600;0,700;1,500;1,600&family=Karla:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap');
  .serif { font-family: 'Alegreya', Georgia, serif; font-weight: 500; }
`;

function AuthShell({ children, footer }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#272e1b", ...fontStyle }}>
      <style>{globalStyles}</style>
      <div className="w-full max-w-md px-6">
        <div className="flex items-center gap-2 mb-3 justify-center" style={{ color: "#bfb2da" }}>
          <BookOpen size={16} />
          <span className="text-[11px] tracking-[0.2em] uppercase font-medium">Anmelden</span>
        </div>
        <h1 className="serif text-5xl text-center leading-[0.9] tracking-tight mb-8" style={{ color: "#ebddc5" }}>
          Rezept-
          <br />
          <em className="italic" style={{ color: "#bfb2da" }}>buch</em>
        </h1>

        <div className="p-8 rounded-sm" style={{ background: "#3d472b", border: "1px solid #ebddc520" }}>
          {children}
        </div>

        {footer && (
          <p className="mt-6 text-center text-xs leading-relaxed" style={{ color: "#ccdbb2" }}>
            {footer}
          </p>
        )}
      </div>
    </div>
  );
}

function TextField({ icon: Icon, right, ...inputProps }) {
  return (
    <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-sm" style={{ background: "#272e1b", border: "1px solid #ebddc530" }}>
      <Icon size={16} style={{ color: "#ccdbb2" }} />
      <input
        {...inputProps}
        className="w-full bg-transparent outline-none text-sm"
        style={{ color: "#ebddc5" }}
      />
      {right}
    </div>
  );
}

function ToggleVisibilityButton({ visible, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={-1}
      style={{ color: "#ccdbb2" }}
    >
      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}

function SubmitButton({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-medium disabled:opacity-60"
      style={{ background: "#bfb2da", color: "#272e1b" }}
    >
      {children}
    </button>
  );
}

function ErrorText({ children }) {
  if (!children) return null;
  return (
    <p className="text-sm mb-4" style={{ color: "#bfb2da" }}>
      {children}
    </p>
  );
}

export default function Auth() {
  const [mode, setMode] = useState("login"); // login | forgot | forgotSent
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      setMode("forgotSent");
      setLoading(false);
    }
  };

  if (mode === "forgotSent") {
    return (
      <AuthShell>
        <div className="text-center py-4">
          <CheckCircle2 className="mx-auto mb-4" size={32} style={{ color: "#9cb37c" }} />
          <p className="serif italic text-lg mb-2" style={{ color: "#ebddc5" }}>
            Link verschickt
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "#ccdbb2" }}>
            Schau in dein Postfach ({email}) und klicke auf den Link, um ein Passwort festzulegen.
          </p>
        </div>
      </AuthShell>
    );
  }

  if (mode === "forgot") {
    return (
      <AuthShell
        footer={
          <button onClick={() => setMode("login")} className="underline">
            Zurück zur Anmeldung
          </button>
        }
      >
        <form onSubmit={handleForgot}>
          <label className="block text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: "#ccdbb2" }}>
            E-Mail-Adresse
          </label>
          <TextField
            icon={Mail}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="du@beispiel.de"
            required
          />
          <ErrorText>{errorMsg}</ErrorText>
          <SubmitButton loading={loading}>
            {loading ? "Sende Link…" : "Link zum Passwort-Einrichten senden"}
          </SubmitButton>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      footer={
        <button onClick={() => { setMode("forgot"); setErrorMsg(""); }} className="underline">
          Passwort vergessen oder noch keins eingerichtet?
        </button>
      }
    >
      <form onSubmit={handleLogin}>
        <label className="block text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: "#ccdbb2" }}>
          E-Mail-Adresse
        </label>
        <TextField
          icon={Mail}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="du@beispiel.de"
          required
        />

        <label className="block text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: "#ccdbb2" }}>
          Passwort
        </label>
        <TextField
          icon={Lock}
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          right={
            <ToggleVisibilityButton
              visible={showPassword}
              onClick={() => setShowPassword((v) => !v)}
            />
          }
        />

        <ErrorText>{errorMsg}</ErrorText>

        <SubmitButton loading={loading}>
          {loading ? "Melde an…" : "Anmelden"}
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
