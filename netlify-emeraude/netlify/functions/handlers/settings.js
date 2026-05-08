// netlify/functions/handlers/settings.js
import { getSupabase, ok, err, requireAuth } from '../_shared/db.js';

const ALLOWED_KEYS = new Set([
  'logo','hotel_name','hotel_tagline','hotel_description','address',
  'phone1','phone2','email','facebook','instagram','whatsapp',
  'google_maps','checkin_time','checkout_time','currency',
  'hero_image','hero_title','hero_subtitle',
]);

export async function handleSettings({ method, body, headers }) {
  const sb = getSupabase();

  // GET /api/settings — public
  if (method === 'GET') {
    const { data, error } = await sb.from('settings').select('key, value');
    if (error) return err('Erreur BDD', 500);
    const map = {};
    (data || []).forEach(r => { map[r.key] = r.value; });
    return ok(map);
  }

  // PUT /api/settings — admin requis
  if (method === 'PUT') {
    requireAuth(headers);
    const entries = Object.entries(body).filter(([k]) => ALLOWED_KEYS.has(k));
    if (!entries.length) return err('Aucune clé valide', 400);

    const upserts = entries.map(([key, value]) => ({ key, value: String(value) }));
    const { error } = await sb.from('settings').upsert(upserts, { onConflict: 'key' });
    if (error) return err('Erreur mise à jour', 500);
    return ok({ success: true });
  }

  return err('Méthode non autorisée', 405);
}
