import { useEffect, useState, type FormEvent } from "react";
import React from "react";
import ReactDOM from "react-dom/client";
import type { Session } from "@supabase/supabase-js";
import App from "./App";
import { supabase } from "./lib/supabase";
import "./styles.css";

async function signOutSafely() { if (supabase) await supabase.auth.signOut(); }

type Membership = {
  restaurant_id: string;
  restaurant_name: string;
  role: string;
  active: boolean;
  restaurant_status: string;
};

function AuthGate() {
  const [session,setSession] = useState<Session | null>(null);
  const [loading,setLoading] = useState(true);
  const [mode,setMode] = useState<"signin"|"signup">("signin");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [fullName,setFullName] = useState("");
  const [restaurantName,setRestaurantName] = useState("");
  const [city,setCity] = useState("Abidjan");
  const [membership,setMembership] = useState<Membership | null>(null);
  const [needsProvisioning,setNeedsProvisioning] = useState(false);
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [demoMode,setDemoMode] = useState(false);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let alive = true;
    supabase.auth.getSession().then(({data}) => {
      if (alive) { setSession(data.session); setLoading(false); }
    });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,next) => {
      setSession(next);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!supabase || !session) { setMembership(null); setNeedsProvisioning(false); return; }
    let alive = true;
    setLoading(true);
    supabase.rpc("get_my_restaurant_memberships").then(({data,error}) => {
      if (!alive) return;
      if (error) setMessage("Impossible de charger vos accès : " + error.message);
      const active = (data ?? []).find((m: Membership) => m.active && m.restaurant_status === "active");
      setMembership(active ?? null);
      setNeedsProvisioning(!(data ?? []).length);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [session]);

  async function submitAuth(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setMessage("");
    try {
      if (mode === "signup") {
        const {data,error} = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) throw error;
        if (!data.session) setMessage("Compte créé. Consultez votre boîte mail pour confirmer l'adresse, puis connectez-vous.");
        else setMessage("Compte créé. Préparation de votre espace…");
      } else {
        const {error} = await supabase.auth.signInWithPassword({email:email.trim(),password});
        if (error) throw error;
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Authentification impossible."); }
    finally { setBusy(false); }
  }

  async function provision(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setMessage("");
    try {
      const {data,error} = await supabase.rpc("provision_first_restaurant",{
        p_name: restaurantName.trim(), p_city: city.trim(),
      });
      if (error) throw error;
      const {data:rows,error:membershipError} = await supabase.rpc("get_my_restaurant_memberships");
      if (membershipError) throw membershipError;
      const active = (rows ?? []).find((m: Membership) => m.restaurant_id === data);
      if (!active) throw new Error("Le restaurant a été créé, mais son appartenance n'a pas pu être confirmée.");
      setMembership(active); setNeedsProvisioning(false);
      setMessage("Votre restaurant et votre accès Propriétaire sont créés.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Création du restaurant impossible."); }
    finally { setBusy(false); }
  }

  if (demoMode) return <><div className="demo-access-bar"><span><strong>MODE DÉMO</strong> · Données fictives, modifications temporaires dans ce navigateur uniquement.</span><button type="button" onClick={()=>setDemoMode(false)}>Quitter la démo</button></div><App /></>;

  if (!supabase) return <main className="auth-shell"><section className="auth-card"><div className="auth-brand">Resto’<span>MAX</span></div><h1>Connexion indisponible</h1><p>Les variables VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY doivent être configurées dans l'environnement de l'application.</p></section></main>;
  if (loading) return <main className="auth-shell"><section className="auth-card"><div className="auth-brand">Resto’<span>MAX</span></div><p>Vérification sécurisée de votre session…</p></section></main>;

  if (!session) return <main className="auth-shell"><section className="auth-card">
    <div className="auth-brand">Resto’<span>MAX</span></div><p className="auth-kicker">GESTION INTELLIGENTE DE RESTAURANT</p>
    <h1>{mode === "signin" ? "Bienvenue" : "Créer votre compte"}</h1>
    <p>Connectez-vous à votre espace Resto’MAX.</p>
    <form onSubmit={submitAuth} className="auth-form">
      {mode === "signup" && <label>Nom complet<input autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)} required minLength={2}/></label>}
      <label>Adresse e-mail<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
      <label>Mot de passe<input type="password" autoComplete={mode==="signin"?"current-password":"new-password"} value={password} onChange={e=>setPassword(e.target.value)} required minLength={8}/></label>
      <button disabled={busy} type="submit">{busy ? "Veuillez patienter…" : mode==="signin" ? "Se connecter" : "Créer mon compte"}</button>
    </form>
    <button className="auth-link" type="button" onClick={()=>{setMode(mode==="signin"?"signup":"signin");setMessage("");}}>{mode==="signin"?"Créer un compte":"J'ai déjà un compte"}</button>
    {message && <p className="auth-message" role="status">{message}</p>}
    <div className="auth-demo-separator"><span>OU</span></div>
    <button className="auth-demo-button" type="button" onClick={()=>setDemoMode(true)}>Voir l’application en mode démo</button>
    <p className="auth-demo-note">Accès immédiat sans e-mail ni mot de passe. Espace de démonstration isolé, sans connexion à vos données Supabase.</p>
  </section></main>;

  if (needsProvisioning) return <main className="auth-shell"><section className="auth-card">
    <div className="auth-brand">Resto’<span>MAX</span></div><p className="auth-kicker">CONFIGURATION INITIALE</p>
    <h1>Créer votre restaurant</h1><p>Votre compte est authentifié. Créez votre premier établissement pour activer votre espace Propriétaire.</p>
    <form onSubmit={provision} className="auth-form">
      <label>Nom du restaurant<input value={restaurantName} onChange={e=>setRestaurantName(e.target.value)} required minLength={2} maxLength={100}/></label>
      <label>Ville<input value={city} onChange={e=>setCity(e.target.value)} required minLength={2} maxLength={80}/></label>
      <button disabled={busy} type="submit">{busy?"Création…":"Créer mon restaurant"}</button>
    </form>
    {message && <p className="auth-message" role="status">{message}</p>}
    <button className="auth-link" type="button" onClick={()=>void signOutSafely()}>Se déconnecter</button>
  </section></main>;

  if (!membership) return <main className="auth-shell"><section className="auth-card"><h1>Accès suspendu ou indisponible</h1><p>Aucun établissement actif n'est associé à ce compte. Contactez le propriétaire ou l'administrateur de la plateforme.</p><button onClick={()=>void signOutSafely()}>Se déconnecter</button></section></main>;
  if (membership.role !== "owner") return <main className="auth-shell"><section className="auth-card"><h1>Accès authentifié</h1><p>Vous êtes connecté à {membership.restaurant_name} avec le rôle {membership.role}. Le branchement des interfaces par rôle sera réalisé après certification des accès.</p><button onClick={()=>void signOutSafely()}>Se déconnecter</button></section></main>;
  return <><div className="auth-session-bar"><span>{membership.restaurant_name} · Propriétaire</span><button onClick={()=>void signOutSafely()}>Déconnexion</button></div><App /></>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><AuthGate /></React.StrictMode>);
