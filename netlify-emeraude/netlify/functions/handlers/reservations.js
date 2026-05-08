// netlify/functions/handlers/reservations.js
import { getSupabase, ok, err, requireAuth, isValidEmail } from '../_shared/db.js';

export async function handleReservations({ method, id, sub, body, headers }) {
  const sb = getSupabase();

  // GET /api/reservations — admin
  if (method === 'GET' && !id) {
    requireAuth(headers);
    const { data, error } = await sb
      .from('reservations')
      .select('*, rooms(name)')
      .order('created_at', { ascending: false });
    if (error) return err('Erreur BDD', 500);
    return ok((data || []).map(r => ({ ...r, room_name: r.rooms?.name || '' })));
  }

  // POST /api/reservations — public
  if (method === 'POST') {
    const { client_name, client_email, phone, room_id, checkin_date, checkout_date } = body;
    for (const [k, v] of [['client_name', client_name], ['phone', phone], ['room_id', room_id], ['checkin_date', checkin_date], ['checkout_date', checkout_date]]) {
      if (!v) return err(`Champ manquant: ${k}`, 400);
    }
    if (client_email && !isValidEmail(client_email)) return err('Email invalide', 400);

    const ci = new Date(checkin_date);
    const co = new Date(checkout_date);
    const nights = Math.round((co - ci) / 86400000);
    if (nights <= 0) return err('La date de départ doit être après l\'arrivée', 400);
    if (ci < new Date(new Date().toDateString())) return err('Date d\'arrivée passée', 400);

    const { data: room, error: re } = await sb.from('rooms').select('price, status').eq('id', room_id).single();
    if (re || !room) return err('Chambre non trouvée', 404);
    if (room.status !== 'available') return err('Chambre indisponible', 409);

    // Vérifier chevauchement
    const { data: overlap } = await sb.from('reservations')
      .select('id')
      .eq('room_id', room_id)
      .neq('status', 'cancelled')
      .lt('checkin_date', checkout_date)
      .gt('checkout_date', checkin_date)
      .limit(1);
    if (overlap && overlap.length > 0) return err('Ces dates sont déjà réservées', 409);

    const total_price = nights * room.price;
    const { data, error } = await sb.from('reservations').insert({
      client_name, client_email: client_email || '', phone,
      room_id: parseInt(room_id), checkin_date, checkout_date, total_price, status: 'pending',
    }).select().single();
    if (error) return err('Erreur création réservation', 500);
    return ok({ success: true, id: data.id, total_price }, 201);
  }

  // PUT /api/reservations/:id/status — admin
  if (method === 'PUT' && id && sub === 'status') {
    requireAuth(headers);
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(body.status)) return err('Statut invalide', 400);
    const { error } = await sb.from('reservations').update({ status: body.status }).eq('id', id);
    if (error) return err('Erreur mise à jour', 500);
    return ok({ success: true });
  }

  // DELETE /api/reservations/:id — admin
  if (method === 'DELETE' && id) {
    requireAuth(headers);
    const { error } = await sb.from('reservations').delete().eq('id', id);
    if (error) return err('Erreur suppression', 500);
    return ok({ success: true });
  }

  return err('Méthode non autorisée', 405);
}
