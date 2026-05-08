// netlify/functions/handlers/rooms.js
import { getSupabase, ok, err, requireAuth } from '../_shared/db.js';

function parseRoom(r) {
  try { r.images = JSON.parse(r.images || '[]'); } catch { r.images = []; }
  return r;
}

export async function handleRooms({ method, id, body, headers }) {
  const sb = getSupabase();

  // GET /api/rooms
  if (method === 'GET' && !id) {
    const { data, error } = await sb.from('rooms').select('*').order('id');
    if (error) return err('Erreur BDD', 500);
    return ok((data || []).map(parseRoom));
  }

  // GET /api/rooms/:id
  if (method === 'GET' && id) {
    const { data, error } = await sb.from('rooms').select('*').eq('id', id).single();
    if (error || !data) return err('Chambre non trouvée', 404);
    return ok(parseRoom(data));
  }

  // POST /api/rooms
  if (method === 'POST') {
    requireAuth(headers);
    const { name, type, price, capacity = 1, status = 'available', image = '', images = [], description = '' } = body;
    if (!name || !type || price === undefined) return err('Champs manquants: name, type, price', 400);
    const pf = parseFloat(price);
    const ci = parseInt(capacity);
    if (isNaN(pf) || isNaN(ci)) return err('Prix ou capacité invalide', 400);

    const { data, error } = await sb.from('rooms').insert({
      name, type, price: pf, capacity: ci, status, image, images: JSON.stringify(images), description,
    }).select().single();
    if (error) return err('Erreur création', 500);
    return ok({ success: true, id: data.id }, 201);
  }

  // PUT /api/rooms/:id
  if (method === 'PUT' && id) {
    requireAuth(headers);
    const { name, type, price, capacity = 1, status = 'available', image = '', images = [], description = '' } = body;
    if (!name) return err('Nom manquant', 400);
    const pf = parseFloat(price);
    if (isNaN(pf)) return err('Prix invalide', 400);

    const { error } = await sb.from('rooms').update({
      name, type, price: pf, capacity: parseInt(capacity), status, image, images: JSON.stringify(images), description,
    }).eq('id', id);
    if (error) return err('Erreur mise à jour', 500);
    return ok({ success: true });
  }

  // DELETE /api/rooms/:id
  if (method === 'DELETE' && id) {
    requireAuth(headers);
    const { error } = await sb.from('rooms').delete().eq('id', id);
    if (error) return err('Erreur suppression', 500);
    return ok({ success: true });
  }

  return err('Méthode non autorisée', 405);
}
