// netlify/functions/handlers/testimonials.js
import { getSupabase, ok, err, requireAuth } from '../_shared/db.js';

export async function handleTestimonials({ method, id, body, headers }) {
  const sb = getSupabase();
  if (method === 'GET') {
    const { data } = await sb.from('testimonials').select('*').order('date', { ascending: false });
    return ok(data || []);
  }
  if (method === 'POST') {
    const { client_name, comment, rating } = body;
    if (!client_name || !comment) return err('Champs manquants', 400);
    const r = parseInt(rating);
    if (isNaN(r) || r < 1 || r > 5) return err('Note invalide (1-5)', 400);
    const { data, error } = await sb.from('testimonials').insert({ client_name, comment, rating: r }).select().single();
    if (error) return err('Erreur création', 500);
    return ok({ success: true, id: data.id }, 201);
  }
  if (method === 'DELETE' && id) {
    requireAuth(headers);
    await sb.from('testimonials').delete().eq('id', id);
    return ok({ success: true });
  }
  return err('Méthode non autorisée', 405);
}
