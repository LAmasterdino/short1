window.SHORTENER_CONFIG = {
  siteName: "QR Shortener",
  mode: "github", // "github" oder "worker"

  github: {
    dataRepoOwner: "DEIN_GITHUB_USERNAME",
    dataRepoName: "qr-shortener-data",
    branch: "main",
    codesFolder: "codes",
    cdnBase: "https://cdn.jsdelivr.net/gh/DEIN_GITHUB_USERNAME/qr-shortener-data@main/codes"
  },

  worker: {
    apiBase: "https://DEIN-WORKER.DEIN-ACCOUNT.workers.dev"
  },

  ui: {
    rememberTokenByDefault: false
  }
};
