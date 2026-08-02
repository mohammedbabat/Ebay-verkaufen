/* ================= KONFIGURATION ==================
   Gleiche Zugangsdaten wie überall sonst in der App.
==================================================== */
const SUPABASE_URL = "https://nrsmzonjqspnsfbhvaus.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_BHyuPLdhMIV2f3n1roJYcQ_N2V_rxsl";
/* ==================================================== */

let supabaseClient = null;
let aktuellerUser = null;
let aktuelleRolle = null;
let aktuellerName = null;

function initSupabaseClient(){
  if(!supabaseClient && typeof window.supabase !== 'undefined'){
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

function zeigeZugriffFehler(nachricht){
  document.body.innerHTML = `
    <div style="max-width:420px;margin:80px auto;padding:0 20px;text-align:center;font-family:'IBM Plex Sans',sans-serif;color:#22262B;">
      <h2 style="margin-bottom:10px;">Kein Zugriff</h2>
      <p style="color:#6B7280;margin-bottom:20px;">${nachricht}</p>
      <a href="index.html" style="color:#3E7C7C;font-weight:600;text-decoration:none;">← Zurück zum Dashboard</a>
    </div>
  `;
}

/**
 * Prüft Login-Status und Rolle. Leitet zu login.html um, falls nicht eingeloggt.
 * erlaubteRollen: Array von Rollen, die diese Seite sehen dürfen, z.B. ['admin','ausgabe']
 * Gibt bei Erfolg {user, rolle, name} zurück, sonst null (Seite wurde bereits behandelt).
 */
async function schuetzeSeite(erlaubteRollen){
  const client = initSupabaseClient();
  if(!client){
    zeigeZugriffFehler('Supabase-Bibliothek konnte nicht geladen werden. Prüfe VPN/Adblocker.');
    return null;
  }

  const { data: { session } } = await client.auth.getSession();
  if(!session){
    location.href = 'login.html';
    return null;
  }
  aktuellerUser = session.user;

  let { data: rolleZeile } = await client
    .from('mitarbeiter_rollen')
    .select('*')
    .eq('user_id', aktuellerUser.id)
    .maybeSingle();

  if(!rolleZeile){
    const { data: neueZeile, error: insertFehler } = await client
      .from('mitarbeiter_rollen')
      .insert({ user_id: aktuellerUser.id, name: aktuellerUser.email, rolle: 'ausgabe' })
      .select()
      .single();
    if(insertFehler){
      console.error(insertFehler);
    }
    rolleZeile = neueZeile;
  }

  aktuelleRolle = rolleZeile ? rolleZeile.rolle : 'ausgabe';
  aktuellerName = (rolleZeile && rolleZeile.name) || aktuellerUser.email;

  if(erlaubteRollen && !erlaubteRollen.includes(aktuelleRolle)){
    zeigeZugriffFehler(`Deine Rolle ("${aktuelleRolle}") hat keine Berechtigung für diese Seite.`);
    return null;
  }

  return { user: aktuellerUser, rolle: aktuelleRolle, name: aktuellerName };
}

async function abmelden(){
  const client = initSupabaseClient();
  if(client) await client.auth.signOut();
  location.href = 'login.html';
}

function rollenLabel(rolle){
  const namen = { admin: 'Admin', ausgabe: 'Ausgabe', hinzufuegen: 'Hinzufügen', alle: 'Alles außer Admin' };
  return namen[rolle] || rolle;
}
