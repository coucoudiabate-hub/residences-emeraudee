// netlify/functions/handlers/contacts.js
import { getSupabase, ok, err, requireAuth, isValidEmail } from '../_shared/db.js';

export async function handleContacts({ method, id, body, headers }) {
  const sb = getSupabase();
  if (method === 'GET') {
    requireAuth(headers);
    const { data } = await sb.from('contacts').select('*').order('date', { ascending: false });
    return ok(data || []);
  }
  if (method === 'POST') {
    const { name, email, subject, message } = body;
    if (!name || !email || !message) return err('Champs manquants', 400);
    if (!isValidEmail(email)) return err('Email invalide', 400);
    const { data, error } = await sb.from('contacts').insert({ name, email, subject: subject || '', message }).select().single();
    if (error) return err('Erreur création', 500);
    return ok({ success: true, id: data.id }, 201);
  }
  if (method === 'DELETE' && id) {
    requireAuth(headers);
    await sb.from('contacts').delete().eq('id', id);
    return ok({ success: true });
  }
  return err('Méthode non autorisée', 405);
}
