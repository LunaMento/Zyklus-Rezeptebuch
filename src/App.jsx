import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Rezeptbuch from "./rezeptbuch";
import Auth from "./Auth";
import ResetPassword from "./ResetPassword";

function App() {
  const [session, setSession] = useState(undefined);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setPasswordRecovery(true);
        }
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return null;
  }

  if (passwordRecovery) {
    return <ResetPassword onDone={() => setPasswordRecovery(false)} />;
  }

  return session ? <Rezeptbuch session={session} /> : <Auth />;
}

export default App;
