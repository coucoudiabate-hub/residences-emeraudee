-- ================================================================
-- LES RÉSIDENCES D'ÉMERAUDE — Schéma Supabase (PostgreSQL)
-- À exécuter dans : Supabase Dashboard > SQL Editor > New Query
-- ================================================================

-- Activer l'extension UUID (déjà active par défaut sur Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── ROOMS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,
  price       NUMERIC(12,2) NOT NULL,
  capacity    INTEGER NOT NULL DEFAULT 1,
  status      TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','occupied','maintenance')),
  image       TEXT DEFAULT '',
  images      TEXT DEFAULT '[]',
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── RESERVATIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservations (
  id            SERIAL PRIMARY KEY,
  client_name   TEXT NOT NULL,
  client_email  TEXT DEFAULT '',
  phone         TEXT NOT NULL,
  room_id       INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  checkin_date  DATE NOT NULL,
  checkout_date DATE NOT NULL,
  total_price   NUMERIC(12,2) NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── SETTINGS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- ── AMENITIES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS amenities (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  icon        TEXT DEFAULT '',
  description TEXT DEFAULT ''
);

-- ── TESTIMONIALS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS testimonials (
  id          SERIAL PRIMARY KEY,
  client_name TEXT NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT NOT NULL,
  date        TIMESTAMPTZ DEFAULT now()
);

-- ── CONTACTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id      SERIAL PRIMARY KEY,
  name    TEXT NOT NULL,
  email   TEXT NOT NULL,
  subject TEXT DEFAULT '',
  message TEXT NOT NULL,
  date    TIMESTAMPTZ DEFAULT now()
);

-- ── GALLERY ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery (
  id            SERIAL PRIMARY KEY,
  title         TEXT DEFAULT '',
  image         TEXT NOT NULL,
  category      TEXT DEFAULT '',
  display_order INTEGER DEFAULT 0
);

-- ── SERVICES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  icon          TEXT DEFAULT '',
  description   TEXT DEFAULT '',
  price         TEXT DEFAULT '',
  display_order INTEGER DEFAULT 0
);

-- ── NEWSLETTER ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter (
  id    SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  date  TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- DONNÉES PAR DÉFAUT (settings + seed)
-- ================================================================

INSERT INTO settings (key, value) VALUES
  ('logo',              'https://cdn-icons-png.flaticon.com/512/3009/3009712.png'),
  ('hotel_name',        'Les Résidences d''Émeraude Chez Bodoro'),
  ('hotel_tagline',     'L''élégance et le confort au cœur de la ville'),
  ('hotel_description', 'Situées au cœur de Yamoussoukro, les Résidences d''Émeraude Chez Bodoro vous offrent un cadre exceptionnel alliant luxe, confort et authenticité.'),
  ('address',           'Yamoussoukro, Quartier Bellevue, 500m après Carrefour Chèck Cissé'),
  ('phone1',            '07 47 04 83 11'),
  ('phone2',            '05 76 76 76 35'),
  ('email',             'contact@residences-emeraude.ci'),
  ('facebook',          'https://facebook.com/residencesemeraude'),
  ('instagram',         'https://instagram.com/residencesemeraude'),
  ('whatsapp',          '+2250747048311'),
  ('checkin_time',      '14:00'),
  ('checkout_time',     '12:00'),
  ('currency',          'FCFA'),
  ('google_maps',       'https://maps.google.com/?q=Yamoussoukro+Quartier+Bellevue'),
  ('hero_image',        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920'),
  ('hero_title',        'Les Résidences d''Émeraude'),
  ('hero_subtitle',     'Chez Bodoro')
ON CONFLICT (key) DO NOTHING;

INSERT INTO rooms (name, type, price, capacity, status, image, images, description) VALUES
  ('Suite Émeraude','Suite',150000,2,'available',
   'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
   '["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200","https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1200"]',
   'Suite luxueuse avec vue panoramique, salon séparé et cuisine équipée.'),
  ('Chambre Or','Standard',75000,2,'available',
   'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
   '["https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200"]',
   'Chambre élégante aux tons dorés avec balcon privé.'),
  ('Chambre Jade','Deluxe',100000,3,'available',
   'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800',
   '["https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200"]',
   'Espace spacieux avec salon et salle de bain moderne.'),
  ('Studio Bodoro','Studio',50000,1,'available',
   'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
   '["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200"]',
   'Studio moderne et fonctionnel.')
ON CONFLICT DO NOTHING;

INSERT INTO amenities (name, icon, description) VALUES
  ('Wi-Fi Haut Débit','wifi','Connexion fibre gratuite dans toutes les chambres'),
  ('Climatisation','snowflake','Air conditionné réversible'),
  ('Piscine','water','Piscine extérieure chauffée'),
  ('Parking Sécurisé','car','Parking privé surveillé 24h/24'),
  ('Petit-Déjeuner','coffee','Buffet continental inclus'),
  ('Room Service','concierge-bell','Service en chambre 24h/24'),
  ('Télévision HD','tv','Smart TV Netflix inclus'),
  ('Coffre-Fort','lock','Sécurité optimale')
ON CONFLICT DO NOTHING;

INSERT INTO testimonials (client_name, rating, comment, date) VALUES
  ('Marie Kone',5,'Séjour exceptionnel ! Service impeccable et cadre magnifique.','2026-04-15'),
  ('Jean Dupont',5,'Résidences magnifiques. Un cadre idyllique au cœur de la ville.','2026-04-10'),
  ('Aminata Traore',4,'Très bon rapport qualité-prix. Je recommande vivement.','2026-03-28')
ON CONFLICT DO NOTHING;

INSERT INTO gallery (title, image, category, display_order) VALUES
  ('Piscine de luxe','https://images.unsplash.com/photo-1572331165267-854da2b10ccc?w=800','espaces',1),
  ('Restaurant','https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800','restauration',2),
  ('Salon d''accueil','https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800','espaces',3),
  ('Spa','https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800','services',4)
ON CONFLICT DO NOTHING;

INSERT INTO services (name, icon, description, price, display_order) VALUES
  ('Navette Aéroport','plane','Transfert depuis l''aéroport d''Abidjan ou Yamoussoukro','25 000 FCFA',1),
  ('Location Voiture','car','Véhicules avec chauffeur disponibles 24h/24','Sur devis',2),
  ('Excursions','map','Guides touristiques pour découvrir la région','Sur devis',3),
  ('Blanchisserie','shirt','Pressing et repassage 7j/7','5 000 FCFA',4)
ON CONFLICT DO NOTHING;

-- ================================================================
-- RLS (Row Level Security) — optionnel mais recommandé
-- Désactiver le RLS pour les tables accessibles publiquement
-- ================================================================

-- Tables publiques en lecture
ALTER TABLE rooms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE amenities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials   ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery        ENABLE ROW LEVEL SECURITY;
ALTER TABLE services       ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings       ENABLE ROW LEVEL SECURITY;

-- Accès lecture public (la clé service côté Functions bypass le RLS de toute façon)
CREATE POLICY "public read rooms"        ON rooms        FOR SELECT USING (true);
CREATE POLICY "public read amenities"    ON amenities    FOR SELECT USING (true);
CREATE POLICY "public read testimonials" ON testimonials FOR SELECT USING (true);
CREATE POLICY "public read gallery"      ON gallery      FOR SELECT USING (true);
CREATE POLICY "public read services"     ON services     FOR SELECT USING (true);
CREATE POLICY "public read settings"     ON settings     FOR SELECT USING (true);

-- Écriture uniquement via service_role (nos Functions utilisent la clé service)
CREATE POLICY "service write rooms"        ON rooms        FOR ALL USING (true);
CREATE POLICY "service write amenities"    ON amenities    FOR ALL USING (true);
CREATE POLICY "service write testimonials" ON testimonials FOR ALL USING (true);
CREATE POLICY "service write gallery"      ON gallery      FOR ALL USING (true);
CREATE POLICY "service write services"     ON services     FOR ALL USING (true);
CREATE POLICY "service write settings"     ON settings     FOR ALL USING (true);
CREATE POLICY "service write reservations" ON reservations FOR ALL USING (true);
CREATE POLICY "service write contacts"     ON contacts     FOR ALL USING (true);
CREATE POLICY "service write newsletter"   ON newsletter   FOR ALL USING (true);
