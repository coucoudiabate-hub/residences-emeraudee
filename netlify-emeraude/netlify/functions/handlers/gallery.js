// netlify/functions/handlers/gallery.js
import { getSupabase, ok, err, requireAuth } from '../_shared/db.js';

export async function handleGallery({ method, id, body, headers }) {
  const sb = getSupabase();
  if (method === 'GET') {
    const { data } = await sb.from('gallery').select('*').order('display_order');
    return ok(data || []);
  }
  if (method === 'POST') {
    requireAuth(headers);
    if (!body.image) return err('Image manquante', 400);
    const { data, error } = await sb.from('gallery').insert({
      title: body.title || '', image: body.image, category: body.category || '', display_order: body.display_order || 0,
    }).select().single();
    if (error) return err('Erreur création', 500);
    return ok({ success: true, id: data.id }, 201);
  }
  if (method === 'DELETE' && id) {
    requireAuth(headers);
    await sb.from('gallery').delete().eq('id', id);
    return ok({ success: true });
  }
  return err('Méthode non autorisée', 405);
}
