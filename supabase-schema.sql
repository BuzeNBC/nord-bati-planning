-- ============================================
-- SCHEMA SUPABASE POUR NORD BATI PLANNING
-- ============================================
-- À exécuter dans l'éditeur SQL de Supabase (supabase.com > SQL Editor)

-- 1. TABLE CHANTIERS
CREATE TABLE IF NOT EXISTS chantiers (
  id BIGSERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  adresse TEXT DEFAULT '',
  client TEXT DEFAULT '',
  telephone TEXT DEFAULT '',
  type TEXT DEFAULT 'TCE' CHECK (type IN ('TCE', 'Partiel')),
  notes TEXT DEFAULT '',
  statut TEXT DEFAULT 'planifie' CHECK (statut IN ('planifie', 'en_cours', 'termine', 'annule')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLE LOTS (corps de métier par chantier)
CREATE TABLE IF NOT EXISTS lots (
  id BIGSERIAL PRIMARY KEY,
  chantier_id BIGINT REFERENCES chantiers(id) ON DELETE CASCADE,
  corps TEXT NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  equipe_id INTEGER,
  statut TEXT DEFAULT 'planifie' CHECK (statut IN ('planifie', 'en_cours', 'termine')),
  notes TEXT DEFAULT '',
  ordre INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLE DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  chantier_id BIGINT REFERENCES chantiers(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  type TEXT DEFAULT 'autre' CHECK (type IN ('plan', 'devis', 'photo', 'permis', 'facture', 'autre')),
  url TEXT DEFAULT '',
  date_ajout DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLE TACHES LIVREUR
CREATE TABLE IF NOT EXISTS taches_livreur (
  id BIGSERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  fait BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLE INSTRUCTIONS UTILISATEUR (mémoire IA)
CREATE TABLE IF NOT EXISTS instructions_utilisateur (
  id BIGSERIAL PRIMARY KEY,
  texte TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLE RAPPELS VALIDES (pour ne pas répéter les alertes)
CREATE TABLE IF NOT EXISTS rappels_valides (
  id TEXT PRIMARY KEY,
  validated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLE ABSENCES (congés, maladie, formation...)
CREATE TABLE IF NOT EXISTS absences (
  id BIGSERIAL PRIMARY KEY,
  employe_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('conge', 'maladie', 'formation', 'autre')),
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  motif TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les absences
CREATE INDEX IF NOT EXISTS idx_absences_employe ON absences(employe_id);
CREATE INDEX IF NOT EXISTS idx_absences_dates ON absences(date_debut, date_fin);

-- ============================================
-- INDEX POUR PERFORMANCES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_lots_chantier ON lots(chantier_id);
CREATE INDEX IF NOT EXISTS idx_lots_dates ON lots(date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_documents_chantier ON documents(chantier_id);
CREATE INDEX IF NOT EXISTS idx_taches_date ON taches_livreur(date);

-- ============================================
-- FONCTION UPDATED_AT AUTOMATIQUE
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS chantiers_updated_at ON chantiers;
CREATE TRIGGER chantiers_updated_at
  BEFORE UPDATE ON chantiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS lots_updated_at ON lots;
CREATE TRIGGER lots_updated_at
  BEFORE UPDATE ON lots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS taches_updated_at ON taches_livreur;
CREATE TRIGGER taches_updated_at
  BEFORE UPDATE ON taches_livreur
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- POLICIES RLS (Row Level Security)
-- Pour l'instant, on désactive RLS car pas d'auth
-- À activer plus tard avec l'authentification
-- ============================================

ALTER TABLE chantiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE taches_livreur ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructions_utilisateur ENABLE ROW LEVEL SECURITY;
ALTER TABLE rappels_valides ENABLE ROW LEVEL SECURITY;

-- Policies publiques (temporaire - à sécuriser avec auth plus tard)
CREATE POLICY "Public access chantiers" ON chantiers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access lots" ON lots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access documents" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access taches" ON taches_livreur FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access instructions" ON instructions_utilisateur FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access rappels" ON rappels_valides FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- STORAGE BUCKET POUR LES DOCUMENTS
-- ============================================
-- ATTENTION: Ce bloc doit être exécuté SÉPARÉMENT dans l'interface Supabase
-- Car la création de bucket nécessite des permissions admin
-- 
-- Alternative: Créer le bucket manuellement dans Storage > New bucket
-- Nom: documents
-- Public: Oui (pour permettre l'accès aux fichiers)

-- Si vous avez accès à l'API admin, décommentez:
/*
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policy pour permettre l'upload public (temporaire)
CREATE POLICY "Public upload documents" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Public read documents" ON storage.objects
FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY "Public delete documents" ON storage.objects
FOR DELETE USING (bucket_id = 'documents');
*/

-- ============================================
-- DONNÉES DE TEST (optionnel)
-- ============================================

-- Décommenter pour insérer des données de test
/*
INSERT INTO chantiers (nom, adresse, client, telephone, type, notes, statut) VALUES
  ('Rénovation Dupont', '15 rue des Lilas, Tourcoing', 'M. Dupont', '06 12 34 56 78', 'TCE', 'Rénovation complète maison années 70', 'en_cours'),
  ('Extension Martin', '8 avenue Foch, Roubaix', 'Mme Martin', '06 98 76 54 32', 'Partiel', 'Extension 40m²', 'planifie');

INSERT INTO lots (chantier_id, corps, date_debut, date_fin, equipe_id, statut, ordre) VALUES
  (1, 'Démolition', '2025-01-06', '2025-01-10', 1, 'termine', 0),
  (1, 'Maçonnerie', '2025-01-13', '2025-01-24', 4, 'en_cours', 1),
  (1, 'Couverture', '2025-01-27', '2025-02-07', 6, 'planifie', 2),
  (1, 'Électricité', '2025-02-10', '2025-02-21', 10, 'planifie', 3),
  (1, 'Placo', '2025-02-24', '2025-03-07', 7, 'planifie', 4),
  (2, 'Maçonnerie', '2025-01-20', '2025-02-14', 5, 'planifie', 0);

INSERT INTO documents (chantier_id, nom, type) VALUES
  (1, 'Plan RDC', 'plan'),
  (1, 'Devis travaux', 'devis');

INSERT INTO taches_livreur (description, date, fait) VALUES
  ('Livrer matériaux chantier Dupont', '2025-01-20', false),
  ('Récupérer échafaudage chez Loxam', '2025-01-20', false);
*/
