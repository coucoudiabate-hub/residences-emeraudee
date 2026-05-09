// netlify/functions/handlers/auth.js
import { ok, err, signToken, verifyToken } from '../_shared/db.js';

export async function handleAuth({ method, event, body, headers }) {
  const fullPath = event.path || '';

  // Extraire le endpoint final : login, logout, check-auth
  const endpoint = fullPath
    .replace(/^\/.netlify\/functions\/api\//, '')
    .replace(/^\/api\//, '')
    .replace(/^\//, '')
    .split('/')[0];

  console.log(`[AUTH] method=${method} endpoint="${endpoint}" path="${fullPath}"`);
  console.log(`[AUTH] ADMIN_USERNAME env = "${process.env.ADMIN_USERNAME || '(non défini)'}"`);

  // POST /api/login
  if (endpoint === 'login' && method === 'POST') {
    const { username, password } = body;

    const expectedUser = process.env.ADMIN_USERNAME || 'bodoro2026';
    const expectedPass = process.env.ADMIN_PASSWORD || 'Emeraude@2026!';

    console.log(`[AUTH] login attempt: "${username}" vs expected "${expectedUser}"`);

    if (username === expectedUser && password === expectedPass) {
      const token = signToken();
      return ok({ success: true, token });
    }
    return err('Identifiants incorrects', 401);
  }

  // POST /api/logout
  if (endpoint === 'logout' && method === 'POST') {
    return ok({ success: true });
  }

  // GET /api/check-auth
  if (endpoint === 'check-auth' && method === 'GET') {
    const payload = verifyToken(headers['authorization'] || headers['Authorization'] || '');
    if (payload) return ok({ authenticated: true });
    return err('Non authentifié', 401);
  }

  return err('Méthode non autorisée', 405);
}
