const config = window.APP_CONFIG;
const list = document.querySelector('#transactions');
const statusText = document.querySelector('#status');
const userStatus = document.querySelector('#user-status');
const portal = document.querySelector('#portal');
const signInButton = document.querySelector('#sign-in');
const signOutButton = document.querySelector('#sign-out');

const base64Url = bytes => btoa(String.fromCharCode(...bytes))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomValue = () => base64Url(crypto.getRandomValues(new Uint8Array(32)));

async function sha256(value) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

function parseJwt(token) {
  const value = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(atob(value).split('').map(c => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')));
}

function tokens() {
  const value = sessionStorage.getItem('tokens');
  return value ? JSON.parse(value) : null;
}

function sessionIsValid() {
  const value = tokens();
  if (!value?.access_token) return false;
  return parseJwt(value.access_token).exp * 1000 > Date.now();
}

function renderSession() {
  const signedIn = sessionIsValid();
  portal.hidden = !signedIn;
  signInButton.hidden = signedIn;
  signOutButton.hidden = !signedIn;
  const value = tokens();
  userStatus.textContent = signedIn ? `Signed in as ${parseJwt(value.id_token).email || 'demo user'}.` : 'You are signed out.';
  if (!signedIn) sessionStorage.removeItem('tokens');
}

async function signIn() {
  const verifier = randomValue();
  const challenge = base64Url(await sha256(verifier));
  const state = randomValue();
  sessionStorage.setItem('pkce_verifier', verifier);
  sessionStorage.setItem('oauth_state', state);
  const params = new URLSearchParams({
    response_type: 'code', client_id: config.clientId,
    redirect_uri: config.redirectUri, scope: 'openid email profile',
    state, code_challenge: challenge, code_challenge_method: 'S256'
  });
  location.assign(`${config.cognitoDomain}/oauth2/authorize?${params}`);
}

async function handleCallback() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  if (!code) return;
  if (params.get('state') !== sessionStorage.getItem('oauth_state')) throw new Error('Invalid sign-in state');
  const body = new URLSearchParams({
    grant_type: 'authorization_code', client_id: config.clientId,
    code, redirect_uri: config.redirectUri,
    code_verifier: sessionStorage.getItem('pkce_verifier')
  });
  const response = await fetch(`${config.cognitoDomain}/oauth2/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body
  });
  if (!response.ok) throw new Error('Token exchange failed');
  sessionStorage.setItem('tokens', JSON.stringify(await response.json()));
  sessionStorage.removeItem('pkce_verifier');
  sessionStorage.removeItem('oauth_state');
  history.replaceState({}, document.title, config.redirectUri);
}

function signOut() {
  sessionStorage.clear();
  const params = new URLSearchParams({ client_id: config.clientId, logout_uri: config.logoutUri });
  location.assign(`${config.cognitoDomain}/logout?${params}`);
}

async function apiFetch(path, options = {}) {
  if (!sessionIsValid()) { renderSession(); throw new Error('Please sign in again'); }
  const value = tokens();
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${value.access_token}` };
  const response = await fetch(`${config.apiUrl}${path}`, { ...options, headers });
  if (response.status === 401) { sessionStorage.removeItem('tokens'); renderSession(); }
  return response;
}

async function loadTransactions() {
  statusText.textContent = 'Loading...';
  try {
    const response = await apiFetch('/transactions');
    if (!response.ok) throw new Error('Request failed');
    const data = await response.json();
    list.innerHTML = '';
    data.transactions.forEach(item => {
      const row = document.createElement('li');
      row.textContent = `${item.type}: R${item.amount} - ${item.description || 'Demo'}`;
      list.appendChild(row);
    });
    statusText.textContent = `${data.transactions.length} demo transaction(s) loaded.`;
  } catch (error) { statusText.textContent = error.message; }
}

async function addDeposit() {
  statusText.textContent = 'Adding demo deposit...';
  try {
    const response = await apiFetch('/transactions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'Deposit', amount: 100, description: 'Demo deposit' })
    });
    if (!response.ok) throw new Error('Request failed');
    await loadTransactions();
  } catch (error) { statusText.textContent = error.message; }
}

signInButton.addEventListener('click', signIn);
signOutButton.addEventListener('click', signOut);
document.querySelector('#load').addEventListener('click', loadTransactions);
document.querySelector('#deposit').addEventListener('click', addDeposit);

(async () => {
  try { await handleCallback(); }
  catch (error) { userStatus.textContent = `Sign-in failed: ${error.message}`; }
  renderSession();
})();
