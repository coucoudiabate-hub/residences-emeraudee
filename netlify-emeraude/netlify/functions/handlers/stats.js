// netlify/functions/handlers/stats.js
import { getSupabase, ok, err } from '../_shared/db.js';

export async function handleStats({ method }) {
  if (method !== 'GET') return err('Méthode non autorisée', 405);
  const sb = getSupabase();

  const [rooms, reservations, contacts, newsletter, testimonials] = await Promise.all([
    sb.from('rooms').select('id, status'),
    sb.from('reservations').select('id, status'),
    sb.from('contacts').select('id', { count: 'exact', head: true }),
    sb.from('newsletter').select('id', { count: 'exact', head: true }),
    sb.from('testimonials').select('id', { count: 'exact', head: true }),
  ]);

  const roomsData = rooms.data || [];
  const resData = reservations.data || [];

  return ok({
    rooms_total: roomsData.length,
    rooms_available: roomsData.filter(r => r.status === 'available').length,
    reservations_total: resData.length,
    reservations_pending: resData.filter(r => r.status === 'pending').length,
    contacts_total: contacts.count || 0,
    newsletter_total: newsletter.count || 0,
    testimonials_total: testimonials.count || 0,
  });
}
