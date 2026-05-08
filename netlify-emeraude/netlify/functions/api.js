// netlify/functions/api.js
// Route principale — reçoit TOUT le trafic /api/* via netlify.toml redirect
// Dispatcher vers les handlers selon le chemin et la méthode

import { corsHeaders, err } from './_shared/db.js';

// Import de tous les handlers
import { handleAuth }         from './handlers/auth.js';
import { handleSettings }     from './handlers/settings.js';
import { handleRooms }        from './handlers/rooms.js';
import { handleReservations } from './handlers/reservations.js';
import { handleAmenities }    from './handlers/amenities.js';
import { handleTestimonials } from './handlers/testimonials.js';
import { handleContacts }     from './handlers/contacts.js';
import { handleGallery }      from './handlers/gallery.js';
import { handleServices }     from './handlers/services.js';
import { handleNewsletter }   from './handlers/newsletter.js';
import { handleUpload }       from './handlers/upload.js';
import { handleStats }        from './handlers/stats.js';

export const handler = async (event) => {
  // Preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  // Extraire le chemin après /api/
  // event.path sera /.netlify/functions/api/rooms, /.netlify/functions/api/login, etc.
  const rawPath = event.path.replace(/^\/.netlify\/functions\/api\/?/, '').replace(/^\//, '');
  const segments = rawPath.split('/').filter(Boolean);
  const resource = segments[0] || '';
  const id       = segments[1] || null;
  const sub      = segments[2] || null;
  const method   = event.httpMethod;

  // Body JSON
  let body = {};
  if (event.body) {
    try {
      body = JSON.parse(event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf-8')
        : event.body);
    } catch { /* multipart ou vide */ }
  }

  const ctx = { event, method, id, sub, body, headers: event.headers, qs: event.queryStringParameters || {} };

  try {
    switch (resource) {
      case 'login':
      case 'logout':
      case 'check-auth':
        return await handleAuth(ctx);

      case 'settings':
        return await handleSettings(ctx);

      case 'rooms':
        return await handleRooms(ctx);

      case 'reservations':
        return await handleReservations(ctx);

      case 'amenities':
        return await handleAmenities(ctx);

      case 'testimonials':
        return await handleTestimonials(ctx);

      case 'contacts':
        return await handleContacts(ctx);

      case 'gallery':
        return await handleGallery(ctx);

      case 'services':
        return await handleServices(ctx);

      case 'newsletter':
        return await handleNewsletter(ctx);

      case 'upload':
        return await handleUpload(ctx);

      case 'stats':
        return await handleStats(ctx);

      default:
        return err('Route non trouvée', 404);
    }
  } catch (e) {
    if (e.status) return err(e.message, e.status);
    console.error('API Error:', e);
    return err('Erreur serveur interne', 500);
  }
};
