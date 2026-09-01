(() => {
  "use strict";

  const cfg = window.APP_CONFIG;
  const elements = {
    signIn: document.querySelector("#signIn"),
    signOut: document.querySelector("#signOut"),
    load: document.querySelector("#load"),
    deposit: document.querySelector("#deposit"),
    user: document.querySelector("#user"),
    status: document.querySelector("#status"),
    transactions: document.querySelector("#transactions")
  };

  function validateConfig() {
    const required = ["apiUrl", "cognitoDomain", "clientId", "redirectUri", "scopes"];
    for (const key of required) {
      if (!cfg || !cfg[key]) throw new Error(`Missing configuration value: ${key}`);
    }
    if (cfg.apiUrl === "INVOKE_URL") throw new Error("Replace INVOKE_URL in config.js before deployment.");
  }

  function base64Url(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  function randomString() {
    const bytes = new Uint8Array(64);
    crypto.getRandomValues(bytes);
    return base64Url(bytes);
  }

  async function createChallenge(verifier) {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    return base64Url(hash);
  }

  function accessToken() {
    return sessionStorage.getItem("access_token");
  }

  function updateUi() {
    const signedIn = Boolean(accessToken());
    elements.signIn.hidden = signedIn;
    elements.signOut.hidden = !signedIn;
    elements.load.hidden = !signedIn;
    elements.deposit.hidden = !signedIn;
    elements.user.textContent = signedIn ? "Signed in to the lab." : "Not signed in.";
    if (!signedIn) elements.transactions.innerHTML = "";
  }

  async function startLogin() {
    const verifier = randomString();
    sessionStorage.setItem("pkce_verifier", verifier);
    const state = randomString();
    sessionStorage.setItem("oauth_state", state);
    const query = new URLSearchParams({
      client_id: cfg.clientId,
      response_type: "code",
      scope: cfg.scopes,
      redirect_uri: cfg.redirectUri,
      state,
      code_challenge_method: "S256",
      code_challenge: await createChallenge(verifier)
    });
    window.location.assign(`${cfg.cognitoDomain}/oauth2/authorize?${query}`);
  }

  async function finishLogin() {
    const params = new URL(window.location.href).searchParams;
    if (params.get("error")) throw new Error(params.get("error_description") || params.get("error"));
    const code = params.get("code");
    if (!code) return;
    if (params.get("state") !== sessionStorage.getItem("oauth_state")) throw new Error("OAuth state validation failed.");
    const verifier = sessionStorage.getItem("pkce_verifier");
    if (!verifier) throw new Error("Missing PKCE verifier. Start sign-in again.");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: cfg.clientId,
      code,
      redirect_uri: cfg.redirectUri,
      code_verifier: verifier
    });
    const response = await fetch(`${cfg.cognitoDomain}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    if (!response.ok) throw new Error(`Token exchange failed: ${response.status}`);
    const tokens = await response.json();
    sessionStorage.setItem("access_token", tokens.access_token);
    if (tokens.id_token) sessionStorage.setItem("id_token", tokens.id_token);
    if (tokens.refresh_token) sessionStorage.setItem("refresh_token", tokens.refresh_token);
    sessionStorage.removeItem("pkce_verifier");
    sessionStorage.removeItem("oauth_state");
    window.history.replaceState({}, document.title, cfg.redirectUri);
  }

  async function api(path, options = {}) {
    const token = accessToken();
    if (!token) throw new Error("Sign in before calling the API.");
    const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
    const response = await fetch(`${cfg.apiUrl}${path}`, { ...options, headers });
    if (response.status === 401 || response.status === 403) {
      sessionStorage.clear();
      updateUi();
      throw new Error("The session is invalid or expired. Sign in again.");
    }
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Request failed: ${response.status}${message ? ` - ${message}` : ""}`);
    }
    return response.json();
  }

  async function loadTransactions() {
    elements.status.textContent = "Loading transactions...";
    try {
      const data = await api("/transactions");
      elements.transactions.innerHTML = "";
      const items = Array.isArray(data.transactions) ? data.transactions : [];
      for (const item of items) {
        const row = document.createElement("li");
        row.textContent = `${item.type || "Transaction"}: R${item.amount ?? "0"} - ${item.description || "Demo"}`;
        elements.transactions.appendChild(row);
      }
      elements.status.textContent = `${items.length} demo transaction(s) loaded.`;
    } catch (error) {
      elements.status.textContent = error.message;
    }
  }

  async function addDeposit() {
    elements.status.textContent = "Adding demo deposit...";
    try {
      await api("/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "Deposit", amount: 100, description: "Demo deposit" })
      });
      await loadTransactions();
    } catch (error) {
      elements.status.textContent = error.message;
    }
  }

  function signOut() {
    sessionStorage.clear();
    const query = new URLSearchParams({ client_id: cfg.clientId, logout_uri: cfg.redirectUri });
    window.location.assign(`${cfg.cognitoDomain}/logout?${query}`);
  }

  async function init() {
    try {
      validateConfig();
      elements.signIn.addEventListener("click", () => startLogin().catch(error => { elements.status.textContent = error.message; }));
      elements.signOut.addEventListener("click", signOut);
      elements.load.addEventListener("click", loadTransactions);
      elements.deposit.addEventListener("click", addDeposit);
      await finishLogin();
    } catch (error) {
      elements.status.textContent = error.message;
    } finally {
      updateUi();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

