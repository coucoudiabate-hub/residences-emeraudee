// netlify/functions/handlers/amenities.js
import { getSupabase, ok, err, requireAuth } from '../_shared/db.js';

export async function handleAmenities({ method, id, body, headers }) {
  const sb = getSupabase();
  if (method === 'GET') {
    const { data } = await sb.from('amenities').select('*').order('id');
    return ok(data || []);
  }
  if (method === 'POST') {
    requireAuth(headers);
    if (!body.name) return err('Nom manquant', 400);
    const { data, error } = await sb.from('amenities').insert({ name: body.name, icon: body.icon || '', description: body.description || '' }).select().single();
    if (error) return err('Erreur création', 500);
    return ok({ success: true, id: data.id }, 201);
  }
  if (method === 'DELETE' && id) {
    requireAuth(headers);
    await sb.from('amenities').delete().eq('id', id);
    return ok({ success: true });
  }
  return err('Méthode non autorisée', 405);
}
