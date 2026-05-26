window.SHORTENER_CONFIG = {
  siteName: "QR Shortener",
  mode: "github", // "github" oder "worker"

  github: {
    dataRepoOwner: "LAmasterdino",
    dataRepoName: "short1data",
    branch: "main",
    codesFolder: "codes",
    cdnBase: "https://cdn.jsdelivr.net/gh/LAmasterdino/short1data@main/codes"
  },

  worker: {
    apiBase: "https://DEIN-WORKER.DEIN-ACCOUNT.workers.dev"
  },

  ui: {
    rememberTokenByDefault: false
  }
};
