// ============================================
// HOOK useSupabaseData - Synchronisation données
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, chantiersService, lotsService, documentsService, tachesLivreurService, instructionsService, rappelsValidesService } from './supabaseClient';

export function useSupabaseData() {
  // États des données
  const [chantiers, setChantiers] = useState([]);
  const [tachesLivreur, setTachesLivreur] = useState([]);
  const [userInstructions, setUserInstructions] = useState([]);
  const [rappelsValides, setRappelsValides] = useState(new Set());
  
  // États de chargement et erreur
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  
  // Refs pour éviter les problèmes de closure
  const chantiersRef = useRef([]);
  const userInstructionsRef = useRef([]);
  
  // Synchroniser les refs
  useEffect(() => {
    chantiersRef.current = chantiers;
  }, [chantiers]);
  
  useEffect(() => {
    userInstructionsRef.current = userInstructions;
  }, [userInstructions]);

  // ============================================
  // CHARGEMENT INITIAL
  // ============================================
  
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Charger toutes les données en parallèle
      const [chantiersData, tachesData, instructionsData, rappelsData] = await Promise.all([
        chantiersService.getAll(),
        tachesLivreurService.getAll(),
        instructionsService.getAll(),
        rappelsValidesService.getAll()
      ]);
      
      setChantiers(chantiersData);
      setTachesLivreur(tachesData);
      setUserInstructions(instructionsData);
      setRappelsValides(rappelsData);
      setIsOnline(true);
      
      console.log('✅ Données chargées:', {
        chantiers: chantiersData.length,
        taches: tachesData.length,
        instructions: instructionsData.length
      });
      
    } catch (err) {
      console.error('❌ Erreur chargement données:', err);
      setError('Erreur de connexion à la base de données');
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Charger les données au démarrage
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ============================================
  // REALTIME SUBSCRIPTIONS (optionnel)
  // ============================================
  
  useEffect(() => {
    // Subscription pour les changements en temps réel
    const chantiersSubscription = supabase
      .channel('chantiers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chantiers' }, () => {
        // Recharger les chantiers quand il y a des changements
        chantiersService.getAll().then(setChantiers).catch(console.error);
      })
      .subscribe();
    
    const lotsSubscription = supabase
      .channel('lots-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lots' }, () => {
        chantiersService.getAll().then(setChantiers).catch(console.error);
      })
      .subscribe();
    
    return () => {
      chantiersSubscription.unsubscribe();
      lotsSubscription.unsubscribe();
    };
  }, []);

  // ============================================
  // ACTIONS CHANTIERS
  // ============================================
  
  const creerChantier = useCallback(async (params) => {
    try {
      // Créer le chantier
      const nouveauChantier = await chantiersService.create({
        nom: params.nom || 'Nouveau chantier',
        adresse: params.adresse || '',
        client: params.client || '',
        telephone: params.telephone || '',
        type: params.type || 'TCE',
        notes: '',
        statut: 'planifie'
      });
      
      // Si lotsAuto, créer tous les lots TCE
      if (params.lotsAuto) {
        const lotsTCE = [
          'Démolition', 'Maçonnerie', 'Couverture', 'Charpente', 'Placo',
          'Électricité', 'Plomberie', 'Chauffage', 'Menuiseries ext.',
          'Faïence', 'Façade', 'Peinture', 'Enduit', 'Nettoyage'
        ];
        
        const today = new Date();
        let currentDate = new Date(today);
        
        const lotsToCreate = lotsTCE.map(corps => {
          const dateDebut = currentDate.toISOString().split('T')[0];
          currentDate.setDate(currentDate.getDate() + 14);
          const dateFin = currentDate.toISOString().split('T')[0];
          currentDate.setDate(currentDate.getDate() + 1);
          
          return {
            corps,
            dateDebut,
            dateFin,
            equipeId: null,
            statut: 'planifie'
          };
        });
        
        const lots = await lotsService.createBatch(nouveauChantier.id, lotsToCreate);
        nouveauChantier.lots = lots;
      }
      
      // Mettre à jour le state local
      setChantiers(prev => [...prev, nouveauChantier]);
      
      return nouveauChantier;
    } catch (err) {
      console.error('Erreur création chantier:', err);
      throw err;
    }
  }, []);
  
  const modifierChantier = useCallback(async (chantierId, updates) => {
    try {
      await chantiersService.update(chantierId, updates);
      
      // Mettre à jour le state local
      setChantiers(prev => prev.map(ch => {
        if (ch.id === chantierId) {
          return { ...ch, ...updates };
        }
        return ch;
      }));
    } catch (err) {
      console.error('Erreur modification chantier:', err);
      throw err;
    }
  }, []);
  
  const supprimerChantier = useCallback(async (chantierId) => {
    try {
      await chantiersService.delete(chantierId);
      setChantiers(prev => prev.filter(c => c.id !== chantierId));
    } catch (err) {
      console.error('Erreur suppression chantier:', err);
      throw err;
    }
  }, []);

  // ============================================
  // ACTIONS LOTS
  // ============================================
  
  const ajouterLot = useCallback(async (chantierId, lotData) => {
    try {
      const nouveauLot = await lotsService.create(chantierId, {
        corps: lotData.corps,
        dateDebut: lotData.dateDebut,
        dateFin: lotData.dateFin,
        equipeId: lotData.equipeId || null,
        statut: 'planifie'
      });
      
      // Mettre à jour le state local
      setChantiers(prev => prev.map(ch => {
        if (ch.id === chantierId) {
          return { ...ch, lots: [...ch.lots, nouveauLot] };
        }
        return ch;
      }));
      
      return nouveauLot;
    } catch (err) {
      console.error('Erreur ajout lot:', err);
      throw err;
    }
  }, []);
  
  const modifierLot = useCallback(async (chantierId, lotId, updates) => {
    try {
      await lotsService.update(lotId, updates);
      
      // Mettre à jour le state local
      setChantiers(prev => prev.map(ch => {
        if (ch.id === chantierId) {
          return {
            ...ch,
            lots: ch.lots.map(lot => {
              if (lot.id === lotId) {
                return { ...lot, ...updates };
              }
              return lot;
            })
          };
        }
        return ch;
      }));
    } catch (err) {
      console.error('Erreur modification lot:', err);
      throw err;
    }
  }, []);
  
  const supprimerLot = useCallback(async (chantierId, lotId) => {
    try {
      await lotsService.delete(lotId);
      
      // Mettre à jour le state local
      setChantiers(prev => prev.map(ch => {
        if (ch.id === chantierId) {
          return { ...ch, lots: ch.lots.filter(l => l.id !== lotId) };
        }
        return ch;
      }));
    } catch (err) {
      console.error('Erreur suppression lot:', err);
      throw err;
    }
  }, []);
  
  const decalerLots = useCallback(async (chantierId, jours, aPartirDe = null) => {
    try {
      const chantier = chantiers.find(c => c.id === chantierId);
      if (!chantier) throw new Error('Chantier non trouvé');
      
      // Décaler chaque lot
      const lotsADecaler = aPartirDe 
        ? chantier.lots.filter(l => l.dateDebut >= aPartirDe)
        : chantier.lots;
      
      for (const lot of lotsADecaler) {
        const newDateDebut = new Date(lot.dateDebut);
        newDateDebut.setDate(newDateDebut.getDate() + jours);
        
        const newDateFin = new Date(lot.dateFin);
        newDateFin.setDate(newDateFin.getDate() + jours);
        
        await lotsService.update(lot.id, {
          dateDebut: newDateDebut.toISOString().split('T')[0],
          dateFin: newDateFin.toISOString().split('T')[0]
        });
      }
      
      // Recharger les données
      const chantiersData = await chantiersService.getAll();
      setChantiers(chantiersData);
    } catch (err) {
      console.error('Erreur décalage lots:', err);
      throw err;
    }
  }, [chantiers]);

  // ============================================
  // ACTIONS DOCUMENTS
  // ============================================
  
  const ajouterDocument = useCallback(async (chantierId, docData) => {
    try {
      const nouveauDoc = await documentsService.create(chantierId, docData);
      
      setChantiers(prev => prev.map(ch => {
        if (ch.id === chantierId) {
          return { ...ch, documents: [...(ch.documents || []), nouveauDoc] };
        }
        return ch;
      }));
      
      return nouveauDoc;
    } catch (err) {
      console.error('Erreur ajout document:', err);
      throw err;
    }
  }, []);
  
  const uploadDocument = useCallback(async (chantierId, file) => {
    try {
      // Upload le fichier
      const url = await documentsService.uploadFile(chantierId, file);
      
      // Déterminer le type automatiquement
      const type = documentsService.getTypeFromFile(file.name);
      
      // Créer l'entrée en base
      const nouveauDoc = await documentsService.create(chantierId, {
        nom: file.name,
        type: type,
        url: url
      });
      
      setChantiers(prev => prev.map(ch => {
        if (ch.id === chantierId) {
          return { ...ch, documents: [...(ch.documents || []), nouveauDoc] };
        }
        return ch;
      }));
      
      return nouveauDoc;
    } catch (err) {
      console.error('Erreur upload document:', err);
      throw err;
    }
  }, []);
  
  const supprimerDocument = useCallback(async (chantierId, docId) => {
    try {
      await documentsService.delete(docId);
      
      setChantiers(prev => prev.map(ch => {
        if (ch.id === chantierId) {
          return { ...ch, documents: ch.documents.filter(d => d.id !== docId) };
        }
        return ch;
      }));
    } catch (err) {
      console.error('Erreur suppression document:', err);
      throw err;
    }
  }, []);

  // ============================================
  // ACTIONS TACHES LIVREUR
  // ============================================
  
  const ajouterTacheLivreur = useCallback(async (tacheData) => {
    try {
      const nouvelleTache = await tachesLivreurService.create(tacheData);
      setTachesLivreur(prev => [...prev, nouvelleTache]);
      return nouvelleTache;
    } catch (err) {
      console.error('Erreur ajout tache:', err);
      throw err;
    }
  }, []);
  
  const toggleTacheLivreur = useCallback(async (id) => {
    try {
      const tache = tachesLivreur.find(t => t.id === id);
      if (tache) {
        await tachesLivreurService.update(id, { fait: !tache.fait });
        setTachesLivreur(prev => prev.map(t => 
          t.id === id ? { ...t, fait: !t.fait } : t
        ));
      }
    } catch (err) {
      console.error('Erreur toggle tache:', err);
      throw err;
    }
  }, [tachesLivreur]);
  
  const modifierTacheLivreur = useCallback(async (id, updates) => {
    try {
      await tachesLivreurService.update(id, updates);
      setTachesLivreur(prev => prev.map(t => 
        t.id === id ? { ...t, ...updates } : t
      ));
    } catch (err) {
      console.error('Erreur modification tache:', err);
      throw err;
    }
  }, []);
  
  const supprimerTacheLivreur = useCallback(async (id) => {
    try {
      await tachesLivreurService.delete(id);
      setTachesLivreur(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Erreur suppression tache:', err);
      throw err;
    }
  }, []);

  // ============================================
  // ACTIONS INSTRUCTIONS IA
  // ============================================
  
  const ajouterInstruction = useCallback(async (texte) => {
    try {
      const nouvelleInstruction = await instructionsService.create({ texte });
      setUserInstructions(prev => [...prev, nouvelleInstruction]);
      return nouvelleInstruction;
    } catch (err) {
      console.error('Erreur ajout instruction:', err);
      throw err;
    }
  }, []);
  
  const effacerInstructions = useCallback(async () => {
    try {
      await instructionsService.deleteAll();
      setUserInstructions([]);
    } catch (err) {
      console.error('Erreur effacement instructions:', err);
      throw err;
    }
  }, []);

  // ============================================
  // ACTIONS RAPPELS VALIDÉS
  // ============================================
  
  const validerRappel = useCallback(async (rappelId) => {
    try {
      await rappelsValidesService.add(rappelId);
      setRappelsValides(prev => new Set([...prev, rappelId]));
    } catch (err) {
      console.error('Erreur validation rappel:', err);
      throw err;
    }
  }, []);

  // ============================================
  // RETOUR DU HOOK
  // ============================================
  
  return {
    // Données
    chantiers,
    tachesLivreur,
    userInstructions,
    rappelsValides,
    
    // États
    isLoading,
    error,
    isOnline,
    
    // Refs
    chantiersRef,
    userInstructionsRef,
    
    // Actions chantiers
    creerChantier,
    modifierChantier,
    supprimerChantier,
    setChantiers,
    
    // Actions lots
    ajouterLot,
    modifierLot,
    supprimerLot,
    decalerLots,
    
    // Actions documents
    ajouterDocument,
    uploadDocument,
    supprimerDocument,
    
    // Actions taches livreur
    ajouterTacheLivreur,
    toggleTacheLivreur,
    modifierTacheLivreur,
    supprimerTacheLivreur,
    setTachesLivreur,
    
    // Actions instructions
    ajouterInstruction,
    effacerInstructions,
    setUserInstructions,
    
    // Actions rappels
    validerRappel,
    setRappelsValides,
    
    // Utilitaires
    reloadData: loadAllData
  };
}
