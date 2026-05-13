let currentEntries = [];
let currentMap = new Map();

function $(id){ return document.getElementById(id); }
function cfg(){ return window.SHORTENER_CONFIG || {}; }

function normalizeCode(v){ return String(v || "").trim().replace(/^\/+|\/+$/g, ""); }
function normalizeUrl(v){ return String(v || "").trim(); }

function generateCode(len=6){
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint32Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i=0; i<len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

function encodeBase64Unicode(str){
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function showMessage(text, kind=""){
  const el = $("message");
  if (!el) return;
  el.textContent = text;
  el.className = kind ? `notice ${kind}` : "notice";
}

function getMode(){ return $("backendMode").value; }

function loadPrefs(){
  const c = cfg();
  $("backendMode").value = localStorage.getItem("shortener.backendMode") || c.mode || "github";
  $("owner").value = localStorage.getItem("shortener.owner") || c.github?.dataRepoOwner || "";
  $("repo").value = localStorage.getItem("shortener.repo") || c.github?.dataRepoName || "";
  $("branch").value = localStorage.getItem("shortener.branch") || c.github?.branch || "main";
  $("codesFolder").value = localStorage.getItem("shortener.codesFolder") || c.github?.codesFolder || "codes";
  $("workerBase").value = localStorage.getItem("shortener.workerBase") || c.worker?.apiBase || "";
  $("rememberToken").checked = localStorage.getItem("shortener.rememberToken") === "true" || !!c.ui?.rememberTokenByDefault;
  $("token").value = $("rememberToken").checked ? (localStorage.getItem("shortener.token") || "") : "";
  $("workerToken").value = $("rememberToken").checked ? (localStorage.getItem("shortener.workerToken") || "") : "";
  syncUi();
}

function savePrefs(){
  localStorage.setItem("shortener.backendMode", getMode());
  localStorage.setItem("shortener.owner", $("owner").value.trim());
  localStorage.setItem("shortener.repo", $("repo").value.trim());
  localStorage.setItem("shortener.branch", $("branch").value.trim() || "main");
  localStorage.setItem("shortener.codesFolder", $("codesFolder").value.trim() || "codes");
  localStorage.setItem("shortener.workerBase", $("workerBase").value.trim());
  localStorage.setItem("shortener.rememberToken", String($("rememberToken").checked));
  if ($("rememberToken").checked){
    localStorage.setItem("shortener.token", $("token").value.trim());
    localStorage.setItem("shortener.workerToken", $("workerToken").value.trim());
  } else {
    localStorage.removeItem("shortener.token");
    localStorage.removeItem("shortener.workerToken");
  }
}

function syncUi(){
  const mode = getMode();
  $("githubSettings").classList.toggle("hidden", mode !== "github");
  $("workerSettings").classList.toggle("hidden", mode !== "worker");
}

function publicBaseUrl(){ return new URL("./", window.location.href).href; }
function shortLinkForCode(code){ return `${publicBaseUrl()}?qrid=${encodeURIComponent(code)}`; }

function normalizeEntry(raw){
  if (!raw) return null;
  return {
    code: raw.code || "",
    url: raw.url || "",
    title: raw.title || "",
    clicks: Number(raw.clicks || 0),
    createdAt: raw.createdAt || "",
    updatedAt: raw.updatedAt || ""
  };
}

function currentCodeValue(){ return normalizeCode($("code").value); }

function renderQr(text){
  const holder = $("qrHolder");
  holder.innerHTML = "";
  if (!text || !window.QRCodeStyling) return;
  const qr = new QRCodeStyling({
    width: 260,
    height: 260,
    data: text,
    dotsOptions: { type: "rounded" },
    cornersSquareOptions: { type: "extra-rounded" },
    cornersDotOptions: { type: "dot" },
    backgroundOptions: { color: "#ffffff" },
    imageOptions: { hideBackgroundDots: true, margin: 4 }
  });
  qr.append(holder);
  window.__qr = qr;
}

function updateShortLinkPreview(){
  const code = currentCodeValue();
  const link = code ? shortLinkForCode(code) : "";
  $("shortUrl").value = link;
  renderQr(link);
}

function updateUiFromEntry(code){
  const entry = currentMap.get(code);
  if (!entry) return;
  $("code").value = entry.code;
  $("url").value = entry.url;
  $("title").value = entry.title || "";
  updateShortLinkPreview();
}

function escapeHtml(v){
  return String(v)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function filterEntries(entries){
  const term = ($("search").value || "").trim().toLowerCase();
  if (!term) return entries;
  return entries.filter(e =>
    e.code.toLowerCase().includes(term) ||
    e.url.toLowerCase().includes(term) ||
    (e.title || "").toLowerCase().includes(term)
  );
}

function renderTable(entries){
  const tbody = $("tableBody");
  const filtered = filterEntries(entries);

  if (!filtered.length){
    tbody.innerHTML = `<tr><td colspan="4" class="muted">Noch keine Einträge vorhanden.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(e => `
    <tr>
      <td><code class="k">${escapeHtml(e.code)}</code></td>
      <td>${escapeHtml(e.url)}${e.title ? `<div class="muted small">${escapeHtml(e.title)}</div>` : ""}</td>
      <td>${Number.isFinite(e.clicks) ? e.clicks : 0}</td>
      <td>
        <div class="row">
          <button class="button secondary" data-action="edit" data-code="${escapeHtml(e.code)}">Bearbeiten</button>
          <button class="button secondary" data-action="copy" data-code="${escapeHtml(e.code)}">Link kopieren</button>
          <button class="button secondary" data-action="png" data-code="${escapeHtml(e.code)}">QR PNG</button>
          <button class="button secondary" data-action="svg" data-code="${escapeHtml(e.code)}">QR SVG</button>
          <button class="button danger" data-action="delete" data-code="${escapeHtml(e.code)}">Löschen</button>
        </div>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const action = btn.getAttribute("data-action");
      const code = btn.getAttribute("data-code");
      if (action === "edit") {
        updateUiFromEntry(code);
        showMessage(`Eintrag ${code} geladen.`, "ok");
      } else if (action === "copy") {
        await navigator.clipboard.writeText(shortLinkForCode(code));
        showMessage(`Kurzlink kopiert: ${code}`, "ok");
      } else if (action === "png") {
        downloadQr(code, "png");
      } else if (action === "svg") {
        downloadQr(code, "svg");
      } else if (action === "delete") {
        await deleteEntry(code);
      }
    });
  });
}

function githubApiBase(owner, repo, path){
  const segments = path.split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${segments}`;
}

function configForRead(){
  if (getMode() === "worker"){
    return { workerBase: $("workerBase").value.trim() };
  }
  return {
    owner: $("owner").value.trim(),
    repo: $("repo").value.trim(),
    branch: $("branch").value.trim() || "main",
    codesFolder: $("codesFolder").value.trim() || "codes",
    token: $("token").value.trim(),
  };
}

async function readGithubFolder(){
  const { owner, repo, branch, codesFolder, token } = configForRead();
  if (!owner || !repo) throw new Error("Bitte Owner und Repo ausfüllen.");
  const res = await fetch(`${githubApiBase(owner, repo, codesFolder)}?ref=${encodeURIComponent(branch)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(await res.text());
  const items = await res.json();
  const files = Array.isArray(items) ? items.filter(x => x.type === "file" && x.name.endsWith(".json")) : [];
  const loaded = await Promise.all(files.map(async file => {
    const r = await fetch(file.download_url, { cache: "no-store" });
    if (!r.ok) return null;
    return normalizeEntry(await r.json());
  }));
  return loaded.filter(Boolean);
}

async function writeGithubEntry(entry){
  const { owner, repo, branch, codesFolder, token } = configForRead();
  if (!token) throw new Error("Bitte einen GitHub-Token eingeben.");
  const path = `${codesFolder}/${entry.code}.json`;
  const url = githubApiBase(owner, repo, path);

  let sha = null;
  const metaRes = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`
    }
  });
  if (metaRes.ok) {
    const meta = await metaRes.json();
    sha = meta.sha || null;
  }

  const payload = {
    code: entry.code,
    url: entry.url,
    title: entry.title || "",
    clicks: Number(entry.clicks || 0),
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const saveRes = await fetch(url, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Update ${entry.code}`,
      content: encodeBase64Unicode(JSON.stringify(payload, null, 2) + "\n"),
      ...(sha ? { sha } : {}),
      branch
    })
  });
  if (!saveRes.ok) throw new Error(await saveRes.text());
}

async function deleteGithubEntry(code){
  const { owner, repo, branch, codesFolder, token } = configForRead();
  if (!token) throw new Error("Bitte einen GitHub-Token eingeben.");
  const path = `${codesFolder}/${code}.json`;
  const url = githubApiBase(owner, repo, path);

  const metaRes = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`
    }
  });
  if (!metaRes.ok) throw new Error(await metaRes.text());
  const meta = await metaRes.json();

  const delRes = await fetch(url, {
    method: "DELETE",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Delete ${code}`,
      sha: meta.sha,
      branch
    })
  });
  if (!delRes.ok) throw new Error(await delRes.text());
}

async function readWorkerList(){
  const { workerBase } = configForRead();
  if (!workerBase) throw new Error("Bitte Worker API Base ausfüllen.");
  const token = $("workerToken").value.trim();
  const res = await fetch(`${workerBase}/api/list`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return Array.isArray(json.items) ? json.items.map(normalizeEntry) : [];
}

async function writeWorkerEntry(entry){
  const { workerBase } = configForRead();
  if (!workerBase) throw new Error("Bitte Worker API Base ausfüllen.");
  const token = $("workerToken").value.trim();
  const res = await fetch(`${workerBase}/api/code/${encodeURIComponent(entry.code)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      code: entry.code,
      url: entry.url,
      title: entry.title || "",
      clicks: Number(entry.clicks || 0)
    })
  });
  if (!res.ok) throw new Error(await res.text());
}

async function deleteWorkerEntry(code){
  const { workerBase } = configForRead();
  if (!workerBase) throw new Error("Bitte Worker API Base ausfüllen.");
  const token = $("workerToken").value.trim();
  const res = await fetch(`${workerBase}/api/code/${encodeURIComponent(code)}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error(await res.text());
}

async function loadEntries(){
  currentEntries = getMode() === "worker" ? await readWorkerList() : await readGithubFolder();
  currentMap = new Map(currentEntries.map(e => [e.code, e]));
  renderTable(currentEntries);
  showMessage(`Geladen: ${currentEntries.length} Einträge.`, "ok");
}

async function saveCurrentEntry(){
  const code = normalizeCode($("code").value) || generateCode(6);
  const url = normalizeUrl($("url").value);
  const title = normalizeUrl($("title").value);

  if (!url) throw new Error("Bitte eine Ziel-URL angeben.");
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error("Bitte eine gültige URL angeben."); }
  if (!["http:","https:"].includes(parsed.protocol)) throw new Error("Nur http:// oder https:// URLs sind erlaubt.");

  const existing = currentMap.get(code);
  const payload = {
    code,
    url: parsed.toString(),
    title,
    clicks: existing ? Number(existing.clicks || 0) : 0,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (getMode() === "worker") await writeWorkerEntry(payload);
  else await writeGithubEntry(payload);

  $("code").value = code;
  updateShortLinkPreview();
  await loadEntries();
  showMessage(`Eintrag gespeichert: ${code}`, "ok");
}

async function deleteEntry(code){
  if (!confirm(`Eintrag "${code}" wirklich löschen?`)) return;
  if (getMode() === "worker") await deleteWorkerEntry(code);
  else await deleteGithubEntry(code);
  await loadEntries();
  showMessage(`Eintrag gelöscht: ${code}`, "ok");
}

async function downloadQr(code, ext){
  const entry = currentMap.get(code);
  if (!entry) return;
  const link = shortLinkForCode(code);
  if (!window.QRCodeStyling) return showMessage("QR-Bibliothek ist nicht geladen.", "err");
  const qr = new QRCodeStyling({
    width: 1024,
    height: 1024,
    data: link,
    dotsOptions: { type: "rounded" },
    cornersSquareOptions: { type: "extra-rounded" },
    cornersDotOptions: { type: "dot" },
    backgroundOptions: { color: "#ffffff" },
    imageOptions: { hideBackgroundDots: true, margin: 4 }
  });
  qr.download({ name: code, extension: ext });
}

function exportJson(){
  const blob = new Blob([JSON.stringify(currentEntries, null, 2) + "\n"], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "redirects-export.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJson(file){
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || "[]"));
      const arr = Array.isArray(data) ? data : Object.values(data);
      currentEntries = arr.map(normalizeEntry).filter(Boolean);
      currentMap = new Map(currentEntries.map(e => [e.code, e]));
      renderTable(currentEntries);
      showMessage("JSON importiert. Jetzt einzeln speichern.", "ok");
    } catch (err) {
      showMessage(String(err.message || err), "err");
    }
  };
  reader.readAsText(file);
}

function applyPrefillFromQuery(){
  const params = new URLSearchParams(window.location.search);
  const preset = params.get("changeqr1");
  if (preset && !$("url").value) $("url").value = preset;
}

function bindEvents(){
  $("backendMode").addEventListener("change", async () => {
    savePrefs();
    syncUi();
    await loadEntries().catch(err => showMessage(String(err.message || err), "err"));
  });
  $("search").addEventListener("input", () => renderTable(currentEntries));
  $("code").addEventListener("input", updateShortLinkPreview);

  $("generateCode").addEventListener("click", () => {
    $("code").value = generateCode(6);
    updateShortLinkPreview();
    showMessage("Neuer Shortcode erzeugt.", "ok");
  });

  $("copyShortUrl").addEventListener("click", async () => {
    const link = $("shortUrl").value.trim();
    if (!link) return;
    await navigator.clipboard.writeText(link);
    showMessage("Kurzlink kopiert.", "ok");
  });

  $("downloadPng").addEventListener("click", async () => {
    const code = currentCodeValue();
    if (!code) return showMessage("Kein Code ausgewählt.", "err");
    await downloadQr(code, "png");
  });

  $("downloadSvg").addEventListener("click", async () => {
    const code = currentCodeValue();
    if (!code) return showMessage("Kein Code ausgewählt.", "err");
    await downloadQr(code, "svg");
  });

  $("saveEntry").addEventListener("click", async () => {
    try {
      savePrefs();
      showMessage("Speichere …");
      await saveCurrentEntry();
    } catch (err) {
      showMessage(String(err.message || err), "err");
    }
  });

  $("reload").addEventListener("click", async () => {
    try {
      savePrefs();
      showMessage("Lade …");
      await loadEntries();
    } catch (err) {
      showMessage(String(err.message || err), "err");
    }
  });

  $("savePrefs").addEventListener("click", () => {
    savePrefs();
    syncUi();
    showMessage("Einstellungen gespeichert.", "ok");
  });

  $("rememberToken").addEventListener("change", () => {
    savePrefs();
    showMessage("Token-Einstellung gespeichert.", "ok");
  });

  $("exportJson").addEventListener("click", exportJson);

  $("importFile").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importJson(file);
  });
}

function syncUi(){
  const mode = getMode();
  $("githubSettings").classList.toggle("hidden", mode !== "github");
  $("workerSettings").classList.toggle("hidden", mode !== "worker");
}

async function init(){
  loadPrefs();
  applyPrefillFromQuery();
  bindEvents();
  syncUi();
  updateShortLinkPreview();
  await loadEntries().catch(err => showMessage(String(err.message || err), "err"));
}

init().catch(err => showMessage(String(err.message || err), "err"));
