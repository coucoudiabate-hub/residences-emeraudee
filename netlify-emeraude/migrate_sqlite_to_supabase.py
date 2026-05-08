#!/usr/bin/env python3
"""
migrate_sqlite_to_supabase.py
Migre les données de l'ancienne BDD SQLite vers Supabase (PostgreSQL).

Usage:
  pip install supabase
  python3 migrate_sqlite_to_supabase.py

Variables à renseigner en haut du fichier.
"""

import sqlite3
import json
import os
from supabase import create_client

# ── CONFIGURATION ───────────────────────────────────────────
SQLITE_PATH   = "database.db"   # chemin vers votre ancien database.db
SUPABASE_URL  = "https://VOTRE-PROJET.supabase.co"
SUPABASE_KEY  = "eyJhbGc..."    # votre clé service_role
# ────────────────────────────────────────────────────────────

sb = create_client(SUPABASE_URL, SUPABASE_KEY)
conn = sqlite3.connect(SQLITE_PATH)
conn.row_factory = sqlite3.Row

def migrate(table, transform=None):
    print(f"\n→ Migration de '{table}'...")
    rows = conn.execute(f"SELECT * FROM {table}").fetchall()
    if not rows:
        print(f"  Aucune donnée dans {table}")
        return
    data = [dict(r) for r in rows]
    if transform:
        data = [transform(r) for r in data]
    # Supprimer id pour laisser PostgreSQL générer (SERIAL)
    for r in data:
        r.pop('id', None)
    result = sb.table(table).insert(data).execute()
    print(f"  ✓ {len(data)} lignes insérées")

def transform_room(r):
    # images était stocké en JSON string ou en colonne séparée
    try:
        r['images'] = json.loads(r.get('images') or '[]')
        r['images'] = json.dumps(r['images'])  # re-stringify pour Supabase
    except:
        r['images'] = '[]'
    return r

migrate('rooms', transform_room)
migrate('reservations')
migrate('amenities')
migrate('testimonials')
migrate('contacts')
migrate('gallery')
migrate('services')
migrate('newsletter')

# Settings — upsert par clé
print("\n→ Migration de 'settings'...")
rows = conn.execute("SELECT key, value FROM settings").fetchall()
for row in rows:
    sb.table('settings').upsert({'key': row['key'], 'value': row['value']}, on_conflict='key').execute()
print(f"  ✓ {len(rows)} settings migrés")

conn.close()
print("\n✅ Migration terminée avec succès !")
