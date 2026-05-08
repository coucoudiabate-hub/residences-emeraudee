// netlify/functions/handlers/upload.js
// Les fichiers sont envoyés sur Cloudinary (stockage cloud permanent).
// Le filesystem Netlify Functions est éphémère — jamais stocker localement.

import { ok, err, requireAuth } from '../_shared/db.js';
import { v2 as cloudinary } from 'cloudinary';
import Busboy from 'busboy';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function handleUpload({ method, event, headers }) {
  if (method !== 'POST') return err('Méthode non autorisée', 405);
  requireAuth(headers);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  return new Promise((resolve) => {
    const contentType = headers['content-type'] || headers['Content-Type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return resolve(err('Content-Type doit être multipart/form-data', 400));
    }

    const busboy = Busboy({ headers: { 'content-type': contentType } });
    let fileBuffer = null;
    let fileMime = '';
    let fileFound = false;

    busboy.on('file', (fieldname, file, info) => {
      if (fieldname !== 'file') { file.resume(); return; }
      const { mimeType } = info;
      if (!ALLOWED_TYPES.includes(mimeType)) {
        file.resume();
        return resolve(err('Format non supporté. Utilisez JPG, PNG, GIF ou WEBP', 400));
      }
      fileMime = mimeType;
      fileFound = true;
      const chunks = [];
      file.on('data', chunk => chunks.push(chunk));
      file.on('end', () => { fileBuffer = Buffer.concat(chunks); });
    });

    busboy.on('finish', async () => {
      if (!fileFound || !fileBuffer) {
        return resolve(err('Aucun fichier reçu', 400));
      }
      if (fileBuffer.length > 16 * 1024 * 1024) {
        return resolve(err('Fichier trop volumineux (max 16MB)', 400));
      }

      try {
        const dataUri = `data:${fileMime};base64,${fileBuffer.toString('base64')}`;
        const result = await cloudinary.uploader.upload(dataUri, {
          folder: 'residences-emeraude',
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        });
        resolve(ok({
          success: true,
          url: result.secure_url,
          filename: result.public_id,
          width: result.width,
          height: result.height,
        }));
      } catch (e) {
        console.error('Cloudinary upload error:', e);
        resolve(err('Erreur upload image: ' + e.message, 500));
      }
    });

    busboy.on('error', (e) => resolve(err('Erreur parsing: ' + e.message, 400)));

    const body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body || '', 'utf-8');
    busboy.write(body);
    busboy.end();
  });
}
