// ============================================
// CLIENT SUPABASE - NORD BATI PLANNING
// ============================================

import { createClient } from '@supabase/supabase-js';

// Variables d'environnement Vite (préfixées VITE_)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Vérification des variables d'environnement
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Variables Supabase manquantes!');
  console.error('Crée un fichier .env.local avec:');
  console.error('VITE_SUPABASE_URL=https://xxx.supabase.co');
  console.error('VITE_SUPABASE_ANON_KEY=eyJhb...');
}

// Création du client Supabase
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// ============================================
// FONCTIONS CRUD - CHANTIERS
// ============================================

export const chantiersService = {
  // Récupérer tous les chantiers avec leurs lots et documents
  async getAll() {
    const { data, error } = await supabase
      .from('chantiers')
      .select(`
        *,
        lots (*),
        documents (*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erreur getAll chantiers:', error);
      throw error;
    }
    
    // Transformer pour correspondre au format existant
    return data.map(ch => ({
      id: ch.id,
      nom: ch.nom,
      adresse: ch.adresse,
      client: ch.client,
      telephone: ch.telephone,
      type: ch.type,
      notes: ch.notes,
      statut: ch.statut,
      lots: (ch.lots || []).map(lot => ({
        id: lot.id,
        corps: lot.corps,
        dateDebut: lot.date_debut,
        dateFin: lot.date_fin,
        equipeId: lot.equipe_id,
        statut: lot.statut,
        notes: lot.notes
      })).sort((a, b) => a.id - b.id),
      documents: (ch.documents || []).map(doc => ({
        id: doc.id,
        nom: doc.nom,
        type: doc.type,
        url: doc.url,
        dateAjout: doc.date_ajout
      }))
    }));
  },

  // Créer un nouveau chantier
  async create(chantier) {
    const { data, error } = await supabase
      .from('chantiers')
      .insert({
        nom: chantier.nom,
        adresse: chantier.adresse || '',
        client: chantier.client || '',
        telephone: chantier.telephone || '',
        type: chantier.type || 'TCE',
        notes: chantier.notes || '',
        statut: chantier.statut || 'planifie'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Erreur create chantier:', error);
      throw error;
    }
    
    return {
      id: data.id,
      nom: data.nom,
      adresse: data.adresse,
      client: data.client,
      telephone: data.telephone,
      type: data.type,
      notes: data.notes,
      statut: data.statut,
      lots: [],
      documents: []
    };
  },

  // Mettre à jour un chantier
  async update(id, updates) {
    const updateData = {};
    if (updates.nom !== undefined) updateData.nom = updates.nom;
    if (updates.adresse !== undefined) updateData.adresse = updates.adresse;
    if (updates.client !== undefined) updateData.client = updates.client;
    if (updates.telephone !== undefined) updateData.telephone = updates.telephone;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.statut !== undefined) updateData.statut = updates.statut;
    
    const { data, error } = await supabase
      .from('chantiers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Erreur update chantier:', error);
      throw error;
    }
    
    return data;
  },

  // Supprimer un chantier (cascade sur lots et documents)
  async delete(id) {
    const { error } = await supabase
      .from('chantiers')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Erreur delete chantier:', error);
      throw error;
    }
  }
};

// ============================================
// FONCTIONS CRUD - LOTS
// ============================================

export const lotsService = {
  // Ajouter un lot à un chantier
  async create(chantierId, lot) {
    const { data, error } = await supabase
      .from('lots')
      .insert({
        chantier_id: chantierId,
        corps: lot.corps,
        date_debut: lot.dateDebut,
        date_fin: lot.dateFin,
        equipe_id: lot.equipeId || null,
        statut: lot.statut || 'planifie',
        notes: lot.notes || ''
      })
      .select()
      .single();
    
    if (error) {
      console.error('Erreur create lot:', error);
      throw error;
    }
    
    return {
      id: data.id,
      corps: data.corps,
      dateDebut: data.date_debut,
      dateFin: data.date_fin,
      equipeId: data.equipe_id,
      statut: data.statut,
      notes: data.notes
    };
  },

  // Mettre à jour un lot
  async update(lotId, updates) {
    const updateData = {};
    if (updates.corps !== undefined) updateData.corps = updates.corps;
    if (updates.dateDebut !== undefined) updateData.date_debut = updates.dateDebut;
    if (updates.dateFin !== undefined) updateData.date_fin = updates.dateFin;
    if (updates.equipeId !== undefined) updateData.equipe_id = updates.equipeId;
    if (updates.statut !== undefined) updateData.statut = updates.statut;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    
    const { error } = await supabase
      .from('lots')
      .update(updateData)
      .eq('id', lotId);
    
    if (error) {
      console.error('Erreur update lot:', error);
      throw error;
    }
  },

  // Supprimer un lot
  async delete(lotId) {
    const { error } = await supabase
      .from('lots')
      .delete()
      .eq('id', lotId);
    
    if (error) {
      console.error('Erreur delete lot:', error);
      throw error;
    }
  },

  // Créer plusieurs lots en batch (pour TCE auto)
  async createBatch(chantierId, lots) {
    const lotsToInsert = lots.map((lot, index) => ({
      chantier_id: chantierId,
      corps: lot.corps,
      date_debut: lot.dateDebut,
      date_fin: lot.dateFin,
      equipe_id: lot.equipeId || null,
      statut: lot.statut || 'planifie',
      ordre: index
    }));
    
    const { data, error } = await supabase
      .from('lots')
      .insert(lotsToInsert)
      .select();
    
    if (error) {
      console.error('Erreur createBatch lots:', error);
      throw error;
    }
    
    return data.map(lot => ({
      id: lot.id,
      corps: lot.corps,
      dateDebut: lot.date_debut,
      dateFin: lot.date_fin,
      equipeId: lot.equipe_id,
      statut: lot.statut
    }));
  }
};

// ============================================
// FONCTIONS CRUD - DOCUMENTS
// ============================================

export const documentsService = {
  async create(chantierId, doc) {
    const { data, error } = await supabase
      .from('documents')
      .insert({
        chantier_id: chantierId,
        nom: doc.nom,
        type: doc.type || 'autre',
        url: doc.url || ''
      })
      .select()
      .single();
    
    if (error) {
      console.error('Erreur create document:', error);
      throw error;
    }
    
    return {
      id: data.id,
      nom: data.nom,
      type: data.type,
      url: data.url,
      dateAjout: data.date_ajout
    };
  },

  async delete(docId) {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', docId);
    
    if (error) {
      console.error('Erreur delete document:', error);
      throw error;
    }
  }
};

// ============================================
// FONCTIONS CRUD - TACHES LIVREUR
// ============================================

export const tachesLivreurService = {
  async getAll() {
    const { data, error } = await supabase
      .from('taches_livreur')
      .select('*')
      .order('date', { ascending: true })
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Erreur getAll taches:', error);
      throw error;
    }
    
    return data.map(t => ({
      id: t.id,
      description: t.description,
      date: t.date,
      fait: t.fait
    }));
  },

  async create(tache) {
    const { data, error } = await supabase
      .from('taches_livreur')
      .insert({
        description: tache.description,
        date: tache.date,
        fait: tache.fait || false
      })
      .select()
      .single();
    
    if (error) {
      console.error('Erreur create tache:', error);
      throw error;
    }
    
    return {
      id: data.id,
      description: data.description,
      date: data.date,
      fait: data.fait
    };
  },

  async update(id, updates) {
    const { error } = await supabase
      .from('taches_livreur')
      .update(updates)
      .eq('id', id);
    
    if (error) {
      console.error('Erreur update tache:', error);
      throw error;
    }
  },

  async delete(id) {
    const { error } = await supabase
      .from('taches_livreur')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Erreur delete tache:', error);
      throw error;
    }
  }
};

// ============================================
// FONCTIONS CRUD - INSTRUCTIONS IA
// ============================================

export const instructionsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('instructions_utilisateur')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Erreur getAll instructions:', error);
      throw error;
    }
    
    return data.map(i => ({
      id: i.id,
      texte: i.texte,
      dateAjout: i.created_at
    }));
  },

  async create(instruction) {
    const { data, error } = await supabase
      .from('instructions_utilisateur')
      .insert({
        texte: instruction.texte || instruction
      })
      .select()
      .single();
    
    if (error) {
      console.error('Erreur create instruction:', error);
      throw error;
    }
    
    return {
      id: data.id,
      texte: data.texte,
      dateAjout: data.created_at
    };
  },

  async deleteAll() {
    const { error } = await supabase
      .from('instructions_utilisateur')
      .update({ active: false })
      .eq('active', true);
    
    if (error) {
      console.error('Erreur deleteAll instructions:', error);
      throw error;
    }
  }
};

// ============================================
// FONCTIONS CRUD - RAPPELS VALIDÉS
// ============================================

export const rappelsValidesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('rappels_valides')
      .select('id');
    
    if (error) {
      console.error('Erreur getAll rappels_valides:', error);
      throw error;
    }
    
    return new Set(data.map(r => r.id));
  },

  async add(rappelId) {
    const { error } = await supabase
      .from('rappels_valides')
      .upsert({ id: rappelId });
    
    if (error) {
      console.error('Erreur add rappel_valide:', error);
      throw error;
    }
  },

  async remove(rappelId) {
    const { error } = await supabase
      .from('rappels_valides')
      .delete()
      .eq('id', rappelId);
    
    if (error) {
      console.error('Erreur remove rappel_valide:', error);
      throw error;
    }
  }
};

export default supabase;
