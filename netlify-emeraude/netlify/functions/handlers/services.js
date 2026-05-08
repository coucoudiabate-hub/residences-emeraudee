// netlify/functions/handlers/services.js
import { getSupabase, ok, err, requireAuth } from '../_shared/db.js';

export async function handleServices({ method, id, body, headers }) {
  const sb = getSupabase();
  if (method === 'GET') {
    const { data } = await sb.from('services').select('*').order('display_order');
    return ok(data || []);
  }
  if (method === 'POST') {
    requireAuth(headers);
    if (!body.name) return err('Nom manquant', 400);
    const { data, error } = await sb.from('services').insert({
      name: body.name, icon: body.icon || '', description: body.description || '',
      price: body.price || '', display_order: body.display_order || 0,
    }).select().single();
    if (error) return err('Erreur création', 500);
    return ok({ success: true, id: data.id }, 201);
  }
  if (method === 'DELETE' && id) {
    requireAuth(headers);
    await sb.from('services').delete().eq('id', id);
    return ok({ success: true });
  }
  return err('Méthode non autorisée', 405);
}
