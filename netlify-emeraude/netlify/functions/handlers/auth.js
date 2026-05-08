// netlify/functions/handlers/auth.js
import { ok, err, signToken, verifyToken } from '../_shared/db.js';

export async function handleAuth({ method, id: resource, event, body, headers }) {
  // Récupérer le nom de la ressource depuis l'URL
  const path = event.path.replace(/^\/.netlify\/functions\/api\/?/, '');
  const endpoint = path.split('/')[0];

  // POST /api/login
  if (endpoint === 'login' && method === 'POST') {
    const { username, password } = body;
    const expectedUser = process.env.ADMIN_USERNAME || 'admin';
    const expectedPass = process.env.ADMIN_PASSWORD || 'emeraude2026';

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
