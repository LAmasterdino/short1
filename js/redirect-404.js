function $(id){ return document.getElementById(id); }
function cfg(){ return window.SHORTENER_CONFIG || {}; }

function normalizeCode(v){ return String(v || "").trim().replace(/^\/+|\/+$/g, ""); }

function getCodeFromLocation(){
  const url = new URL(window.location.href);
  const qrid = url.searchParams.get("qrid");
  if (qrid) return normalizeCode(qrid);

  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  if (!path) return "";
  const parts = path.split("/").filter(Boolean);
  if (!parts.length) return "";
  const last = decodeURIComponent(parts[parts.length - 1]);
  if (["index.html","404.html","admin.html"].includes(last)) return "";
  return normalizeCode(last);
}

function setMessage(message, detail=""){
  const status = $("status");
  const info = $("detail");
  const fallback = $("fallbackLink");
  if (status) status.textContent = message;
  if (info) info.textContent = detail;
  if (fallback) fallback.classList.remove("hidden");
}

async function resolveViaGithub(code){
  const github = cfg().github || {};
  const base = github.cdnBase || "";
  if (!base) throw new Error("GitHub CDN-Basis ist nicht konfiguriert.");
  const res = await fetch(`${base}/${encodeURIComponent(code)}.json?v=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return null;
  return await res.json();
}

async function resolveViaWorker(code){
  const worker = cfg().worker || {};
  const apiBase = worker.apiBase || "";
  if (!apiBase) throw new Error("Worker API Base ist nicht konfiguriert.");
  const res = await fetch(`${apiBase}/api/resolve/${encodeURIComponent(code)}`, { cache: "no-store" });
  if (!res.ok) return null;
  return await res.json();
}

async function main(){
  const code = getCodeFromLocation();
  if (!code){
    setMessage("Kein Shortcode angegeben.", "Nutze ?qrid=DEINCODE oder /DEINCODE.");
    return;
  }

  try{
    const mode = cfg().mode || "github";
    const data = mode === "worker" ? await resolveViaWorker(code) : await resolveViaGithub(code);

    if (!data || !data.url){
      setMessage("Kein Eintrag für diesen Code gefunden.", `Gesuchter Code: ${code}`);
      return;
    }

    const status = $("status");
    const detail = $("detail");
    if (status) status.textContent = "Weiterleitung läuft …";
    if (detail) detail.textContent = data.url;

    window.location.replace(data.url);
  }catch(err){
    console.error(err);
    setMessage("Fehler beim Laden der Weiterleitung.", String(err.message || err));
  }
}

main();
