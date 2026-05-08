// netlify/functions/_shared/db.js
// Connexion Supabase (PostgreSQL managé, gratuit jusqu'à 500MB)
// Variables d'environnement à configurer dans Netlify Dashboard > Site settings > Environment variables

import { createClient } from '@supabase/supabase-js';

let _supabase = null;

export function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY; // Service role key (pas anon!)
    if (!url || !key) {
      throw new Error('SUPABASE_URL et SUPABASE_SERVICE_KEY manquants dans les variables d\'environnement');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// ── Helpers réponses HTTP ────────────────────────────────────
export function ok(data, status = 200) {
  return {
    statusCode: status,
    headers: corsHeaders(),
    body: JSON.stringify(data),
  };
}

export function err(message, status = 400) {
  return {
    statusCode: status,
    headers: corsHeaders(),
    body: JSON.stringify({ error: message }),
  };
}

export function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// ── Auth JWT ─────────────────────────────────────────────────
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-prod';
const JWT_EXPIRES = '8h';

export function signToken() {
  return jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.slice(7), JWT_SECRET);
  } catch {
    return null;
  }
}

export function requireAuth(headers) {
  const payload = verifyToken(headers['authorization'] || headers['Authorization']);
  if (!payload) throw { status: 401, message: 'Non authentifié' };
  return payload;
}

// ── Email validation ─────────────────────────────────────────
export function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e));
}
