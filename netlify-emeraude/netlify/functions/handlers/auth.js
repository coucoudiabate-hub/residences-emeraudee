import { ok, err, signToken, verifyToken } from '../_shared/db.js';

const ADMIN_USER = process.env.ADMIN_USERNAME ?? 'bodoro2026';
const ADMIN_PASS = process.env.ADMIN_PASSWORD ?? 'Emeraude@2026!';

export async function handleAuth({ method, event, body, headers }) {
  const fullPath = event.path || '';
  const endpoint = fullPath
    .replace(/^\/.netlify\/functions\/api/, '')
    .replace(/^\/api/, '')
    .replace(/^\/+/, '')
    .split('/')[0];

  if (endpoint === 'login' && method === 'POST') {
    const { username = '', password = '' } = body || {};
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      return ok({ success: true, token: signToken() });
    }
    return err('Identifiants incorrects', 401);
  }

  if (endpoint === 'logout' && method === 'POST') {
    return ok({ success: true });
  }

  if (endpoint === 'check-auth') {
    const auth = headers['authorization'] || headers['Authorization'] || '';
    const payload = verifyToken(auth);
    if (payload) return ok({ authenticated: true });
    return err('Non authentifié', 401);
  }

  return err('Méthode non autorisée', 405);
}
