// netlify/functions/handlers/newsletter.js
import { getSupabase, ok, err, requireAuth, isValidEmail } from '../_shared/db.js';

export async function handleNewsletter({ method, id, body, headers }) {
  const sb = getSupabase();
  if (method === 'GET') {
    requireAuth(headers);
    const { data } = await sb.from('newsletter').select('*').order('date', { ascending: false });
    return ok(data || []);
  }
  if (method === 'POST') {
    if (!body.email) return err('Email manquant', 400);
    if (!isValidEmail(body.email)) return err('Email invalide', 400);
    const { data, error } = await sb.from('newsletter').insert({ email: body.email }).select().single();
    if (error) {
      if (error.code === '23505') return err('Email déjà inscrit', 409);
      return err('Erreur inscription', 500);
    }
    return ok({ success: true, id: data.id }, 201);
  }
  if (method === 'DELETE' && id) {
    requireAuth(headers);
    await sb.from('newsletter').delete().eq('id', id);
    return ok({ success: true });
  }
  return err('Méthode non autorisée', 405);
}
