import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSupabaseData } from './useSupabaseData';
import PlanningGantt from './PlanningGantt';

// ============================================
// CONFIGURATION MÉTIER NORD BATI
// ============================================

const CORPS_DE_METIER = [
  'Démolition',
  'Maçonnerie', 
  'Couverture',
  'Charpente',
  'Placo',
  'Électricité',
  'Plomberie',
  'Chauffage',
  'Menuiseries ext.',
  'Faïence',
  'Façade',
  'Peinture',
  'Enduit',
  'Nettoyage'
];

const CONFIG_RAPPELS = {
  'Démolition': {
    type: 'avant_debut',
    delaiJours: 21,
    message: "Arrêté de voirie à demander (benne)",
    alerte: "Il te reste 1 semaine pour demander l'arrêté de voirie !"
  },
  'Couverture': {
    type: 'avant_debut',
    delaiJours: 21,
    message: "Arrêté de voirie à demander (échafaudage)",
    alerte: "Il te reste 1 semaine pour demander l'arrêté de voirie !"
  },
  'Électricité': {
    type: 'avant_fin',
    delaiJours: 14,
    message: "Demander le Consuel",
    alerte: "Pense à demander le Consuel !"
  },
  'Plomberie': {
    type: 'avant_fin',
    delaiJours: 14,
    message: "Demander le Qualigaz (si gaz)",
    alerte: "Pense au Qualigaz si installation gaz !"
  },
  'Chauffage': {
    type: 'avant_fin',
    delaiJours: 14,
    message: "Demander le Qualigaz (si gaz)",
    alerte: "Pense au Qualigaz si installation gaz !"
  },
  'Menuiseries ext.': {
    type: 'apres_demol',
    recurrent: true,
    intervalleJours: 2,
    message: "Prendre les côtes menuiseries",
    alerte: "N'oublie pas de prendre les côtes menuiseries !"
  }
};

const TYPES_DOCUMENTS = [
  { id: 'plan', label: 'Plan', icon: '📐' },
  { id: 'devis', label: 'Devis', icon: '📄' },
  { id: 'photo', label: 'Photo', icon: '📷' },
  { id: 'permis', label: 'Permis/Autorisation', icon: '📋' },
  { id: 'facture', label: 'Facture', icon: '🧾' },
  { id: 'autre', label: 'Autre', icon: '📎' },
];

// ============================================
// DONNÉES EMPLOYÉS NORD BATI
// ============================================

const EMPLOYES = [
  { id: 1, nom: 'Marius', competences: ['Démolition'], type: 'salarie' },
  { id: 2, nom: 'Vijai', competences: ['Démolition'], type: 'salarie' },
  { id: 3, nom: 'Gianni', competences: ['Démolition'], type: 'salarie' },
  { id: 4, nom: 'Laura', competences: ['Démolition'], type: 'salarie' },
  { id: 5, nom: 'Jean-Claude Van Damme', competences: ['Démolition'], type: 'salarie' },
  { id: 6, nom: 'Daniel', competences: ['Démolition'], type: 'salarie' },
  { id: 7, nom: 'Câlin', competences: ['Maçonnerie'], type: 'salarie' },
  { id: 8, nom: 'Laurent', competences: ['Maçonnerie'], type: 'salarie' },
  { id: 9, nom: 'Paul', competences: ['Maçonnerie'], type: 'salarie' },
  { id: 10, nom: 'Tony', competences: ['Couverture', 'Charpente'], type: 'salarie' },
  { id: 11, nom: 'Romain', competences: ['Couverture', 'Charpente'], type: 'salarie' },
  { id: 12, nom: 'David', competences: ['Placo'], type: 'salarie' },
  { id: 13, nom: 'Peggy', competences: ['Placo'], type: 'salarie' },
  { id: 14, nom: 'Roger', competences: ['Placo'], type: 'salarie' },
  { id: 15, nom: 'Adrien', competences: ['Placo'], type: 'salarie' },
  { id: 16, nom: 'Alexeï', competences: ['Placo'], type: 'salarie' },
  { id: 17, nom: 'Erwan', competences: ['Électricité', 'Plomberie'], type: 'salarie' },
  { id: 18, nom: 'Mamadou', competences: ['Électricité', 'Plomberie'], type: 'salarie' },
  { id: 19, nom: 'Patrice', competences: ['Électricité', 'Plomberie'], type: 'salarie' },
  { id: 20, nom: 'Matisse', competences: ['Électricité', 'Plomberie'], type: 'salarie' },
  { id: 21, nom: 'Saco', competences: ['Façade'], type: 'salarie' },
  { id: 22, nom: 'Kamaté', competences: ['Façade'], type: 'salarie' },
  { id: 23, nom: 'Jean-Claude', competences: ['Menuiseries ext.'], type: 'salarie' },
  { id: 24, nom: 'Céline', competences: ['Menuiseries ext.'], type: 'salarie' },
  { id: 25, nom: 'Stéphane', competences: ['Menuiseries ext.'], type: 'salarie' },
  { id: 26, nom: 'Philippe', competences: ['Faïence'], type: 'salarie' },
  { id: 27, nom: 'Momo', competences: ['Polyvalent'], type: 'salarie' },
  { id: 28, nom: 'Ludo', competences: ['Polyvalent'], type: 'salarie' },
  { id: 29, nom: 'Timothée', competences: ['Polyvalent'], type: 'salarie' },
  { id: 30, nom: 'Alex', competences: ['Livraison'], type: 'livreur' },
  { id: 101, nom: 'Sabert', competences: ['Peinture', 'Sols souples'], type: 'sous-traitant' },
  { id: 102, nom: 'Johnny', competences: ['Peinture'], type: 'sous-traitant' },
  { id: 103, nom: '1000D', competences: ['Enduit'], type: 'sous-traitant' },
  { id: 104, nom: 'Mathieu', competences: ['Nettoyage'], type: 'sous-traitant' },
];

const EQUIPES = [
  { id: 1, nom: 'Démol 1', membres: [1, 2], couleur: '#ef4444', specialite: 'Démolition' },
  { id: 2, nom: 'Démol 2', membres: [3, 4], couleur: '#f97316', specialite: 'Démolition' },
  { id: 3, nom: 'Démol 3', membres: [5, 6], couleur: '#fb923c', specialite: 'Démolition' },
  { id: 4, nom: 'Maçons 1', membres: [7, 8], couleur: '#eab308', specialite: 'Maçonnerie' },
  { id: 5, nom: 'Maçons 2', membres: [9], couleur: '#ca8a04', specialite: 'Maçonnerie' },
  { id: 6, nom: 'Couvreurs', membres: [10, 11], couleur: '#22c55e', specialite: 'Couverture' },
  { id: 7, nom: 'Placo 1', membres: [12, 13], couleur: '#14b8a6', specialite: 'Placo' },
  { id: 8, nom: 'Placo 2', membres: [14, 15], couleur: '#06b6d4', specialite: 'Placo' },
  { id: 9, nom: 'Placo 3', membres: [16], couleur: '#0891b2', specialite: 'Placo' },
  { id: 10, nom: 'Élec/Plomb 1', membres: [17, 18], couleur: '#3b82f6', specialite: 'Électricité' },
  { id: 11, nom: 'Élec/Plomb 2', membres: [19, 20], couleur: '#6366f1', specialite: 'Électricité' },
  { id: 12, nom: 'Façadiers', membres: [21, 22], couleur: '#8b5cf6', specialite: 'Façade' },
  { id: 13, nom: 'Menuisiers 1', membres: [23, 24], couleur: '#a855f7', specialite: 'Menuiseries ext.' },
  { id: 14, nom: 'Menuisiers 2', membres: [25], couleur: '#d946ef', specialite: 'Menuiseries ext.' },
  { id: 15, nom: 'Faïencier', membres: [26], couleur: '#ec4899', specialite: 'Faïence' },
];

const POLYVALENTS = [27, 28, 29];

const INITIAL_TACHES_LIVREUR = [
  { id: 1, description: 'Livrer matériaux chantier Dupont', date: '2025-01-20', fait: false },
  { id: 2, description: 'Récupérer échafaudage chez Loxam', date: '2025-01-20', fait: false },
];

const INITIAL_CHANTIERS = [
  {
    id: 1,
    nom: 'Rénovation Dupont',
    adresse: '15 rue des Lilas, Tourcoing',
    client: 'M. Dupont',
    telephone: '06 12 34 56 78',
    type: 'TCE',
    lots: [
      { corps: 'Démolition', dateDebut: '2025-01-06', dateFin: '2025-01-10', equipeId: 1, statut: 'termine' },
      { corps: 'Maçonnerie', dateDebut: '2025-01-13', dateFin: '2025-01-24', equipeId: 4, statut: 'en_cours' },
      { corps: 'Couverture', dateDebut: '2025-01-27', dateFin: '2025-02-07', equipeId: 6, statut: 'planifie' },
      { corps: 'Électricité', dateDebut: '2025-02-10', dateFin: '2025-02-21', equipeId: 10, statut: 'planifie' },
      { corps: 'Placo', dateDebut: '2025-02-24', dateFin: '2025-03-07', equipeId: 7, statut: 'planifie' },
    ],
    documents: [
      { id: 1, nom: 'Plan RDC', type: 'plan', dateAjout: '2025-01-02', url: '#' },
      { id: 2, nom: 'Devis travaux', type: 'devis', dateAjout: '2025-01-03', url: '#' },
    ],
    notes: 'Rénovation complète maison années 70',
    statut: 'en_cours'
  },
  {
    id: 2,
    nom: 'Extension Martin',
    adresse: '8 avenue Foch, Roubaix',
    client: 'Mme Martin',
    telephone: '06 98 76 54 32',
    type: 'Partiel',
    lots: [
      { corps: 'Maçonnerie', dateDebut: '2025-01-20', dateFin: '2025-02-14', equipeId: 5, statut: 'planifie' },
    ],
    documents: [],
    notes: 'Extension 40m²',
    statut: 'planifie'
  }
];

// ============================================
// UTILITAIRES
// ============================================

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
};

const formatDateCourt = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

const isToday = (date) => {
  const today = new Date();
  const d = new Date(date);
  return d.toDateString() === today.toDateString();
};

const getDaysArray = (start, end) => {
  const arr = [];
  const dt = new Date(start);
  const endDate = new Date(end);
  while (dt <= endDate) {
    arr.push(new Date(dt).toISOString().split('T')[0]);
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
};

const diffDays = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
};

const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const isWeekend = (jour) => {
  const d = new Date(jour);
  return d.getDay() === 0 || d.getDay() === 6;
};

const getTodayStr = () => new Date().toISOString().split('T')[0];

// ============================================
// GÉNÉRATION DES RAPPELS
// ============================================

const genererRappels = (chantiers) => {
  const rappels = [];
  const today = getTodayStr();
  
  chantiers.forEach(chantier => {
    chantier.lots.forEach((lot, lotIndex) => {
      const config = CONFIG_RAPPELS[lot.corps];
      if (!config) return;
      
      if (config.type === 'avant_debut') {
        const dateLimite = addDays(lot.dateDebut, -15);
        const joursRestants = diffDays(today, dateLimite);
        
        if (joursRestants > 0 && joursRestants <= 21 && lot.statut !== 'termine') {
          rappels.push({
            id: `${chantier.id}-${lot.corps}-${lotIndex}-voirie`,
            chantierId: chantier.id,
            chantier: chantier.nom,
            lot: lot.corps,
            lotIndex,
            type: 'voirie',
            message: config.message,
            alerte: joursRestants <= 7 ? config.alerte : null,
            dateEcheance: dateLimite,
            joursRestants,
            urgent: joursRestants <= 7
          });
        }
      }
      
      if (config.type === 'avant_fin') {
        const dateRappel = addDays(lot.dateFin, -config.delaiJours);
        const joursRestants = diffDays(today, dateRappel);
        
        if (joursRestants >= -7 && joursRestants <= 14 && lot.statut !== 'termine') {
          rappels.push({
            id: `${chantier.id}-${lot.corps}-${lotIndex}-fin`,
            chantierId: chantier.id,
            chantier: chantier.nom,
            lot: lot.corps,
            lotIndex,
            type: 'administratif',
            message: config.message,
            alerte: joursRestants <= 3 ? config.alerte : null,
            dateEcheance: dateRappel,
            joursRestants,
            urgent: joursRestants <= 3
          });
        }
      }
      
      if (config.type === 'apres_demol' && config.recurrent) {
        const lotDemol = chantier.lots.find(l => l.corps === 'Démolition');
        if (lotDemol && lotDemol.statut === 'termine' && lot.statut !== 'termine') {
          rappels.push({
            id: `${chantier.id}-menuiseries-${lotIndex}-cotes`,
            chantierId: chantier.id,
            chantier: chantier.nom,
            lot: lot.corps,
            lotIndex,
            type: 'recurrent',
            message: config.message,
            alerte: config.alerte,
            recurrent: true,
            urgent: true
          });
        }
      }
    });
  });
  
  return rappels.sort((a, b) => (a.joursRestants || 0) - (b.joursRestants || 0));
};

// ============================================
// ICÔNES SVG
// ============================================

const Icons = {
  Mic: ({ active }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "#ff6b35" : "currentColor"} strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Home: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9,22 9,12 15,12 15,22"/>
    </svg>
  ),
  Alert: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="3">
      <polyline points="20,6 9,17 4,12"/>
    </svg>
  ),
  Truck: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="3" width="15" height="13"/>
      <polygon points="16,8 20,8 23,11 23,16 16,16 16,8"/>
      <circle cx="5.5" cy="18.5" r="2.5"/>
      <circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
  Building: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <line x1="9" y1="6" x2="9" y2="6.01"/>
      <line x1="15" y1="6" x2="15" y2="6.01"/>
      <line x1="9" y1="10" x2="9" y2="10.01"/>
      <line x1="15" y1="10" x2="15" y2="10.01"/>
      <line x1="9" y1="14" x2="9" y2="14.01"/>
      <line x1="15" y1="14" x2="15" y2="14.01"/>
      <path d="M9 18h6v4H9z"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15,18 9,12 15,6"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9,6 15,12 9,18"/>
    </svg>
  ),
  Plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Tool: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  Sparkles: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" strokeWidth="2">
      <path d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z"/>
      <path d="M19 15L19.5 17L21.5 17.5L19.5 18L19 20L18.5 18L16.5 17.5L18.5 17L19 15Z"/>
    </svg>
  )
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function NordBatiPlanning() {
  const [employes] = useState(EMPLOYES);
  const [equipes, setEquipes] = useState(EQUIPES);
  
  // ============================================
  // DONNÉES PERSISTÉES SUPABASE
  // ============================================
  const {
    chantiers,
    tachesLivreur,
    userInstructions,
    rappelsValides,
    isLoading: isLoadingData,
    error: dataError,
    isOnline,
    chantiersRef,
    userInstructionsRef,
    creerChantier,
    modifierChantier,
    supprimerChantier,
    ajouterLot,
    modifierLot,
    supprimerLot: supprimerLotDB,
    decalerLots,
    ajouterDocument: ajouterDocumentDB,
    uploadDocument,
    supprimerDocument: supprimerDocumentDB,
    ajouterTacheLivreur: ajouterTacheLivreurDB,
    toggleTacheLivreur,
    modifierTacheLivreur,
    supprimerTacheLivreur,
    ajouterInstruction,
    effacerInstructions,
    validerRappel,
    setChantiers,
    setTachesLivreur,
    setUserInstructions,
    setRappelsValides,
    reloadData
  } = useSupabaseData();
  
  const [rappels, setRappels] = useState([]);
  
  const [activeTab, setActiveTab] = useState('aujourdhui');
  const [selectedChantier, setSelectedChantier] = useState(null);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [newDocument, setNewDocument] = useState({ nom: '', type: 'plan' });
  const [viewStartDate, setViewStartDate] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff)).toISOString().split('T')[0];
  });
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [iaResponse, setIaResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [nouvelleTache, setNouvelleTache] = useState('');
  const [iaConnected, setIaConnected] = useState(true);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentChantierContext, setCurrentChantierContext] = useState(null);
  const [sessionActions, setSessionActions] = useState([]);
  
  // Refs pour éviter les problèmes de closure (sauf ceux gérés par useSupabaseData)
  const conversationHistoryRef = useRef([]);
  const currentChantierContextRef = useRef(null);
  
  // Synchroniser les refs avec les states
  useEffect(() => {
    conversationHistoryRef.current = conversationHistory;
  }, [conversationHistory]);
  
  useEffect(() => {
    currentChantierContextRef.current = currentChantierContext;
  }, [currentChantierContext]);
  
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const silenceTimerRef = useRef(null);
  const traiterCommandeRef = useRef(null);
  
  // Générer les rappels
  useEffect(() => {
    const nouveauxRappels = genererRappels(chantiers).filter(r => !rappelsValides.has(r.id));
    setRappels(nouveauxRappels);
  }, [chantiers, rappelsValides]);
  
  // Synchroniser le chantier sélectionné
  useEffect(() => {
    if (selectedChantier) {
      const updated = chantiers.find(c => c.id === selectedChantier.id);
      if (updated) setSelectedChantier(updated);
    }
  }, [chantiers]);
  
  // Init reconnaissance vocale
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; // Continue d'écouter
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'fr-FR';
      recognitionRef.current.maxAlternatives = 1;
      
      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += transcript + ' ';
          } else {
            interimTranscript = transcript;
          }
        }
        
        // Afficher ce qu'on entend en temps réel
        setTranscript(finalTranscriptRef.current + interimTranscript);
        
        // Reset le timer à chaque nouvelle parole détectée
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        
        // Attendre 2.5 secondes de silence avant de traiter la commande
        silenceTimerRef.current = setTimeout(() => {
          if (finalTranscriptRef.current.trim()) {
            recognitionRef.current?.stop();
          }
        }, 2500); // 2.5 secondes de silence = fin de phrase
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        
        // Traiter la commande si on a du texte
        const textToProcess = finalTranscriptRef.current.trim();
        if (textToProcess && traiterCommandeRef.current) {
          traiterCommandeRef.current(textToProcess);
        }
        finalTranscriptRef.current = '';
      };
      
      recognitionRef.current.onerror = (e) => {
        console.error('Erreur reconnaissance vocale:', e);
        setIsListening(false);
        finalTranscriptRef.current = '';
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        
        if (e.error === 'no-speech') {
          setIaResponse('Je n\'ai rien entendu. Réessaie.');
        } else if (e.error === 'audio-capture') {
          setIaResponse('Problème de micro. Vérifie les autorisations.');
        } else if (e.error !== 'aborted') {
          setIaResponse('Erreur micro. Utilise le champ texte.');
        }
      };
    }
  }, []);
  
  // ============================================
  // APPEL API CLAUDE
  // ============================================
  
  const appelAPI = useCallback(async (commande) => {
    // Utiliser les refs pour avoir les valeurs à jour
    const currentHistory = conversationHistoryRef.current;
    const currentChantier = currentChantierContextRef.current;
    const currentInstructions = userInstructionsRef.current;
    const currentChantiers = chantiersRef.current;
    
    // Debug
    console.log('=== ENVOI À L\'IA ===');
    console.log('Commande:', commande);
    console.log('Historique:', currentHistory.length, 'messages');
    if (currentHistory.length > 0) {
      console.log('Derniers messages:', currentHistory.slice(-4).map(m => `${m.role}: ${m.content.substring(0, 30)}...`));
    }
    console.log('Chantier courant:', currentChantier?.nom || 'aucun');
    console.log('Instructions:', currentInstructions.length);
    
    // Créer le contexte avec les chantiers actuels
    const contexteActuel = {
      chantiers: currentChantiers.map(c => ({
        id: c.id,
        nom: c.nom,
        adresse: c.adresse,
        client: c.client,
        type: c.type,
        statut: c.statut,
        lots: c.lots
      })),
      tachesLivreur: tachesLivreur,
      rappelsEnCours: rappels.map(r => ({ id: r.id, chantier: r.chantier, message: r.message })),
      chantierCourant: currentChantier,
      historiqueSession: sessionActions,
      instructionsUtilisateur: currentInstructions
    };
    
    try {
      const response = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          commande, 
          contexte: contexteActuel,
          historique: currentHistory.slice(-20)
        })
      });
      
      if (!response.ok) {
        throw new Error('Erreur API');
      }
      
      const resultat = await response.json();
      console.log('Réponse IA:', resultat.message?.substring(0, 50));
      
      // Mettre à jour l'historique
      const newHistory = [
        ...currentHistory, 
        { role: 'user', content: commande },
        { role: 'assistant', content: resultat.message || "OK" }
      ].slice(-20);
      
      setConversationHistory(newHistory);
      // Aussi mettre à jour la ref immédiatement
      conversationHistoryRef.current = newHistory;
      
      return resultat;
    } catch (error) {
      console.error('Erreur appel API:', error);
      setIaConnected(false);
      return {
        message: "Erreur de connexion à l'IA. Vérifie que la clé API est configurée dans Vercel.",
        actions: []
      };
    }
  }, [tachesLivreur, rappels, sessionActions]); // Moins de dépendances car on utilise les refs
  
  // ============================================
  // EXÉCUTION DES ACTIONS (avec Supabase)
  // ============================================
  
  const executerAction = useCallback(async (action, params) => {
    try {
      switch (action) {
        // ============================================
        // ACTIONS CHANTIERS
        // ============================================
        case 'creer_chantier': {
          const nouveauChantier = await creerChantier({
            nom: params.nom || 'Nouveau chantier',
            adresse: params.adresse || '',
            client: params.client || '',
            telephone: params.telephone || '',
            type: params.type || 'TCE',
            lotsAuto: params.lotsAuto
          });
          
          const newContext = { id: nouveauChantier.id, nom: nouveauChantier.nom };
          setCurrentChantierContext(newContext);
          currentChantierContextRef.current = newContext;
          break;
        }
        
        case 'modifier_chantier': {
          const updates = {};
          if (params.nom !== undefined) updates.nom = params.nom;
          if (params.adresse !== undefined) updates.adresse = params.adresse;
          if (params.client !== undefined) updates.client = params.client;
          if (params.telephone !== undefined) updates.telephone = params.telephone;
          if (params.notes !== undefined) updates.notes = params.notes;
          if (params.statut !== undefined) updates.statut = params.statut;
          
          await modifierChantier(params.chantierId, updates);
          break;
        }
        
        case 'supprimer_chantier': {
          if (params.confirmation) {
            await supprimerChantier(params.chantierId);
            // Reset le contexte si c'était le chantier courant
            if (currentChantierContextRef.current?.id === params.chantierId) {
              setCurrentChantierContext(null);
              currentChantierContextRef.current = null;
            }
            // Reset la sélection si c'était le chantier sélectionné
            if (selectedChantier?.id === params.chantierId) {
              setSelectedChantier(null);
            }
          }
          break;
        }
        
        case 'selectionner_chantier': {
          const chantier = chantiersRef.current.find(c => c.id === params.chantierId);
          if (chantier) {
            setSelectedChantier(chantier);
            setActiveTab('chantiers');
            const newContext = { id: chantier.id, nom: chantier.nom };
            setCurrentChantierContext(newContext);
            currentChantierContextRef.current = newContext;
          }
          break;
        }
        
        case 'rechercher_chantier': {
          // La recherche est gérée côté IA, elle retourne juste les résultats dans le message
          break;
        }
        
        case 'resume_chantier': {
          // Le résumé est généré par l'IA dans son message texte
          const chantier = chantiersRef.current.find(c => c.id === params.chantierId);
          if (chantier) {
            const newContext = { id: chantier.id, nom: chantier.nom };
            setCurrentChantierContext(newContext);
            currentChantierContextRef.current = newContext;
          }
          break;
        }
        
        // ============================================
        // ACTIONS LOTS
        // ============================================
        case 'ajouter_lot': {
          const chantierId = params.chantierId;
          const chantier = chantiersRef.current.find(c => c.id === chantierId);
          
          await ajouterLot(chantierId, {
            corps: params.corps,
            dateDebut: params.dateDebut,
            dateFin: params.dateFin,
            equipeId: params.equipeId || null
          });
          
          if (chantier) {
            const newContext = { id: chantier.id, nom: chantier.nom };
            setCurrentChantierContext(newContext);
            currentChantierContextRef.current = newContext;
          }
          break;
        }
        
        case 'modifier_lot': {
          const chantier = chantiersRef.current.find(c => c.id === params.chantierId);
          if (chantier) {
            // Trouver le lot par ID ou par index
            let lotId = params.lotId;
            if (!lotId && params.lotIndex !== undefined && chantier.lots[params.lotIndex]) {
              lotId = chantier.lots[params.lotIndex].id;
            }
            
            if (lotId) {
              const updates = {};
              if (params.corps) updates.corps = params.corps;
              if (params.dateDebut) updates.dateDebut = params.dateDebut;
              if (params.dateFin) updates.dateFin = params.dateFin;
              if (params.equipeId !== undefined) updates.equipeId = params.equipeId;
              if (params.statut) updates.statut = params.statut;
              
              await modifierLot(params.chantierId, lotId, updates);
            }
          }
          break;
        }
        
        case 'supprimer_lot': {
          const chantier = chantiersRef.current.find(c => c.id === params.chantierId);
          if (chantier) {
            let lotId = params.lotId;
            if (!lotId && params.lotIndex !== undefined && chantier.lots[params.lotIndex]) {
              lotId = chantier.lots[params.lotIndex].id;
            }
            if (lotId) {
              await supprimerLotDB(params.chantierId, lotId);
            }
          }
          break;
        }
        
        case 'decaler_lots': {
          await decalerLots(params.chantierId, params.jours, params.aPartirDe);
          break;
        }
        
        // ============================================
        // ACTIONS TACHES LIVREUR
        // ============================================
        case 'ajouter_tache_livreur': {
          await ajouterTacheLivreurDB({
            description: params.description,
            date: params.date || getTodayStr(),
            fait: false
          });
          break;
        }
        
        case 'modifier_tache_livreur': {
          const updates = {};
          if (params.description !== undefined) updates.description = params.description;
          if (params.date !== undefined) updates.date = params.date;
          if (params.fait !== undefined) updates.fait = params.fait;
          
          await modifierTacheLivreur(params.tacheId, updates);
          break;
        }
        
        case 'supprimer_tache_livreur': {
          await supprimerTacheLivreur(params.tacheId);
          break;
        }
        
        // ============================================
        // ACTIONS DOCUMENTS
        // ============================================
        case 'ajouter_document': {
          await ajouterDocumentDB(params.chantierId, {
            nom: params.nom,
            type: params.type || 'autre',
            url: ''
          });
          break;
        }
        
        case 'supprimer_document': {
          await supprimerDocumentDB(params.chantierId, params.documentId);
          break;
        }
        
        // ============================================
        // ACTIONS NAVIGATION
        // ============================================
        case 'naviguer': {
          const vueMap = {
            'aujourdhui': 'aujourdhui',
            'planning': 'planning',
            'chantiers': 'chantiers',
            'equipes': 'equipes',
            'livreur': 'livreur'
          };
          if (vueMap[params.vue]) {
            setActiveTab(vueMap[params.vue]);
            if (params.vue !== 'chantiers') {
              setSelectedChantier(null);
            }
          }
          break;
        }
        
        case 'aller_a_date': {
          if (params.date) {
            // Calculer le lundi de la semaine contenant cette date
            const d = new Date(params.date);
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(d.setDate(diff));
            setViewStartDate(monday.toISOString().split('T')[0]);
            setActiveTab('planning');
          }
          break;
        }
        
        case 'planning_equipe': {
          // On pourrait filtrer l'affichage par équipe, pour l'instant on navigue juste vers équipes
          setActiveTab('equipes');
          break;
        }
        
        // ============================================
        // ACTIONS RAPPELS
        // ============================================
        case 'valider_rappel': {
          if (params.rappelId) {
            await validerRappel(params.rappelId);
          }
          break;
        }
        
        // ============================================
        // ACTIONS MÉMOIRE IA
        // ============================================
        case 'memoriser_instruction': {
          if (params.instruction) {
            await ajouterInstruction(params.instruction);
          }
          break;
        }
        
        case 'oublier_instructions': {
          await effacerInstructions();
          break;
        }
        
        default:
          console.log('Action non gérée:', action);
          break;
      }
    } catch (error) {
      console.error('Erreur exécution action:', error);
    }
  }, [
    creerChantier, modifierChantier, supprimerChantier,
    ajouterLot, modifierLot, supprimerLotDB, decalerLots,
    ajouterTacheLivreurDB, modifierTacheLivreur, supprimerTacheLivreur,
    ajouterDocumentDB, supprimerDocumentDB,
    validerRappel, ajouterInstruction, effacerInstructions,
    selectedChantier
  ]);
  
  // ============================================
  // TRAITEMENT COMMANDE
  // ============================================
  
  const traiterCommande = useCallback(async (texte) => {
    setIsProcessing(true);
    setTranscript('');
    
    // DEBUG VISIBLE
    const debugHistorique = conversationHistoryRef.current;
    const debugChantier = currentChantierContextRef.current;
    console.log('🔴 TRAITEMENT:', texte);
    console.log('🔴 Historique avant appel:', debugHistorique.length, 'messages');
    console.log('🔴 Chantier courant:', debugChantier?.nom || 'aucun');
    
    try {
      const resultat = await appelAPI(texte);
      
      // DEBUG: Voir ce qui revient
      console.log('🟢 RÉPONSE:', resultat.message);
      console.log('🟢 Actions:', resultat.actions?.length || 0);
      console.log('🟢 Historique après appel:', conversationHistoryRef.current.length, 'messages');
      
      // Afficher le message de l'IA
      setIaResponse(resultat.message || "");
      
      // Exécuter toutes les actions retournées
      if (resultat.actions && resultat.actions.length > 0) {
        for (const actionObj of resultat.actions) {
          executerAction(actionObj.action, actionObj.params);
        }
        // Ajouter à l'historique des actions
        setSessionActions(prev => [...prev, {
          details: resultat.message,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('🔴 ERREUR:', error);
      setIaResponse("Erreur lors du traitement de la commande.");
    }
    
    setIsProcessing(false);
  }, [appelAPI, executerAction]);
  
  // Garder la ref à jour avec la dernière version de traiterCommande
  useEffect(() => {
    traiterCommandeRef.current = traiterCommande;
  }, [traiterCommande]);
  
  const toggleListening = () => {
    if (isListening) {
      // Arrêter l'écoute - ça va déclencher onend qui traitera la commande
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      recognitionRef.current?.stop();
    } else {
      // Réinitialiser
      finalTranscriptRef.current = '';
      setTranscript('');
      setIaResponse('');
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error('Erreur démarrage micro:', e);
        setIaResponse('Erreur démarrage micro. Réessaie.');
      }
    }
  };
  
  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (textInput.trim()) {
      setTranscript(textInput);
      traiterCommande(textInput);
      setTextInput('');
    }
  };
  
  const naviguerSemaine = (dir) => {
    const d = new Date(viewStartDate);
    d.setDate(d.getDate() + (dir * 7));
    setViewStartDate(d.toISOString().split('T')[0]);
  };
  
  // Décaler un seul lot (pour le drag & drop du Gantt)
  const decalerUnLot = useCallback(async (chantierId, lotId, jours) => {
    try {
      const chantier = chantiersRef.current.find(c => c.id === chantierId);
      if (!chantier) return;
      
      const lot = chantier.lots.find(l => l.id === lotId);
      if (!lot) return;
      
      const newDateDebut = new Date(lot.dateDebut);
      newDateDebut.setDate(newDateDebut.getDate() + jours);
      
      const newDateFin = new Date(lot.dateFin);
      newDateFin.setDate(newDateFin.getDate() + jours);
      
      await modifierLot(chantierId, lotId, {
        dateDebut: newDateDebut.toISOString().split('T')[0],
        dateFin: newDateFin.toISOString().split('T')[0]
      });
    } catch (err) {
      console.error('Erreur décalage lot:', err);
    }
  }, [modifierLot]);
  
  // Modifier un lot depuis le Gantt
  const modifierLotGantt = useCallback(async (chantierId, lotId, updates) => {
    try {
      await modifierLot(chantierId, lotId, updates);
    } catch (err) {
      console.error('Erreur modification lot Gantt:', err);
    }
  }, [modifierLot]);
  
  const ajouterTacheLivreurLocal = async () => {
    if (nouvelleTache.trim()) {
      try {
        await ajouterTacheLivreurDB({
          description: nouvelleTache,
          date: getTodayStr(),
          fait: false
        });
        setNouvelleTache('');
      } catch (err) {
        console.error('Erreur ajout tâche:', err);
      }
    }
  };
  
  const ajouterDocumentLocal = async (chantierId) => {
    if (newDocument.nom.trim()) {
      try {
        await ajouterDocumentDB(chantierId, {
          nom: newDocument.nom,
          type: newDocument.type,
          url: '#'
        });
        setNewDocument({ nom: '', type: 'plan' });
        setShowAddDocument(false);
      } catch (err) {
        console.error('Erreur ajout document:', err);
      }
    }
  };
  
  const supprimerDocumentLocal = async (chantierId, docId) => {
    try {
      await supprimerDocumentDB(chantierId, docId);
    } catch (err) {
      console.error('Erreur suppression document:', err);
    }
  };
  
  const getDocumentIcon = (type) => {
    const typeDoc = TYPES_DOCUMENTS.find(t => t.id === type);
    return typeDoc ? typeDoc.icon : '📎';
  };
  
  // Données calculées
  const getLotsAujourdhui = () => {
    const today = getTodayStr();
    const lots = [];
    
    chantiers.forEach(chantier => {
      chantier.lots.forEach(lot => {
        if (today >= lot.dateDebut && today <= lot.dateFin && lot.statut !== 'termine') {
          const equipe = equipes.find(e => e.id === lot.equipeId);
          const membresEquipe = equipe ? equipe.membres.map(mid => employes.find(e => e.id === mid)).filter(Boolean) : [];
          
          lots.push({
            chantier: chantier.nom,
            chantierId: chantier.id,
            adresse: chantier.adresse,
            lot: lot.corps,
            equipe,
            membres: membresEquipe,
            dateDebut: lot.dateDebut,
            dateFin: lot.dateFin
          });
        }
      });
    });
    
    return lots;
  };
  
  const lotsAujourdhui = getLotsAujourdhui();
  const joursAffiches = getDaysArray(viewStartDate, addDays(viewStartDate, 13));
  const rappelsUrgents = rappels.filter(r => r.urgent);
  const tachesAujourdhui = tachesLivreur.filter(t => t.date === getTodayStr());
  
  const salaries = employes.filter(e => e.type === 'salarie');
  const polyvalents = employes.filter(e => POLYVALENTS.includes(e.id));
  const sousTraitants = employes.filter(e => e.type === 'sous-traitant');

  // ============================================
  // RENDU
  // ============================================

  // Écran de chargement initial
  if (isLoadingData) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        color: '#e2e8f0'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '800',
          fontSize: '1.5rem',
          color: '#0f172a',
          animation: 'pulse 1.5s infinite'
        }}>
          NB
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>Chargement des données...</div>
        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Connexion à Supabase</div>
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  // Écran d'erreur si pas de connexion
  if (dataError && !isOnline) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        color: '#e2e8f0',
        padding: '2rem'
      }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <div style={{ fontSize: '1.3rem', fontWeight: '600', color: '#ff6b35' }}>Erreur de connexion</div>
        <div style={{ fontSize: '0.9rem', color: '#94a3b8', textAlign: 'center', maxWidth: '400px' }}>
          {dataError}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1rem' }}>
          Vérifie ta connexion internet et les variables d'environnement Supabase.
        </div>
        <button
          onClick={reloadData}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
            border: 'none',
            borderRadius: '8px',
            color: '#0f172a',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          🔄 Réessayer
        </button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#e2e8f0'
    }}>
      {/* HEADER */}
      <header style={{
        background: 'rgba(255, 107, 53, 0.08)',
        borderBottom: '1px solid rgba(255, 107, 53, 0.3)',
        padding: '0.5rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '800',
            fontSize: '0.9rem',
            color: '#0f172a'
          }}>
            NB
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#ff6b35' }}>NORD BATI</h1>
            <p style={{ margin: 0, fontSize: '0.6rem', color: '#64748b', letterSpacing: '1px' }}>
              {salaries.length} salariés • {sousTraitants.length} sous-traitants • {chantiers.length} chantiers
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Indicateur Supabase */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.25rem 0.5rem',
            background: isOnline ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            borderRadius: '4px',
            border: `1px solid ${isOnline ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isOnline ? '#22c55e' : '#ef4444'
            }} />
            <span style={{ fontSize: '0.6rem', color: isOnline ? '#22c55e' : '#ef4444' }}>
              {isOnline ? 'Sync' : 'Offline'}
            </span>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Aujourd'hui</div>
            <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          
          {rappelsUrgents.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.35rem 0.7rem',
              background: 'rgba(255, 107, 53, 0.15)',
              borderRadius: '6px',
              border: '1px solid rgba(255, 107, 53, 0.4)'
            }}>
              <Icons.Alert />
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#ff6b35' }}>
                {rappelsUrgents.length}
              </span>
            </div>
          )}
        </div>
      </header>

      <div style={{ display: 'flex', height: 'calc(100vh - 58px)' }}>
        {/* SIDEBAR */}
        <aside style={{
          width: '280px',
          background: 'rgba(0,0,0,0.2)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          overflowY: 'auto'
        }}>
          {/* Zone IA */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,107,53,0.15) 0%, rgba(255,107,53,0.05) 100%)',
            borderRadius: '12px',
            padding: '0.85rem',
            border: '1px solid rgba(255,107,53,0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
              <Icons.Sparkles />
              <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#ff6b35', letterSpacing: '0.5px' }}>
                ASSISTANT IA CLAUDE
              </span>
            </div>
            
            <button
              onClick={toggleListening}
              disabled={isProcessing}
              style={{
                width: '100%',
                padding: '0.7rem',
                background: isListening 
                  ? 'linear-gradient(135deg, #ff6b35, #f7931e)' 
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isListening ? '#ff6b35' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '8px',
                color: isListening ? '#0f172a' : '#e2e8f0',
                cursor: isProcessing ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              <Icons.Mic active={isListening} />
              {isListening ? '🔴 Parle... (clique pour envoyer)' : isProcessing ? 'Traitement...' : 'Parler'}
            </button>
            
            <form onSubmit={handleTextSubmit} style={{ marginTop: '0.5rem' }}>
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Ou écris ta demande ici..."
                disabled={isProcessing}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '6px',
                  color: '#e2e8f0',
                  fontSize: '0.8rem'
                }}
              />
            </form>
            
            {(transcript || iaResponse || conversationHistory.length > 0) && (
              <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', maxHeight: '200px', overflowY: 'auto' }}>
                {/* Afficher les derniers échanges de l'historique */}
                {conversationHistory.slice(-4).map((msg, idx) => (
                  <div key={idx} style={{ 
                    padding: '0.4rem', 
                    background: msg.role === 'user' ? 'rgba(0,0,0,0.2)' : 'rgba(255,107,53,0.1)', 
                    borderRadius: '6px', 
                    marginBottom: '0.3rem',
                    borderLeft: msg.role === 'assistant' ? '3px solid #ff6b35' : 'none'
                  }}>
                    <span style={{ color: msg.role === 'user' ? '#94a3b8' : '#ff6b35' }}>
                      {msg.role === 'user' ? 'Toi:' : 'IA:'}
                    </span> {msg.content}
                  </div>
                ))}
                
                {/* Message en cours de saisie */}
                {transcript && !conversationHistory.find(h => h.content === transcript) && (
                  <div style={{ 
                    padding: '0.5rem', 
                    background: 'rgba(0,0,0,0.2)', 
                    borderRadius: '6px', 
                    color: '#94a3b8', 
                    marginBottom: '0.4rem' 
                  }}>
                    <span style={{ color: '#ff6b35' }}>Toi:</span> {transcript}
                  </div>
                )}
                
                {/* Réponse en cours */}
                {isProcessing && (
                  <div style={{ 
                    padding: '0.6rem', 
                    background: 'rgba(255,107,53,0.1)', 
                    borderRadius: '6px', 
                    borderLeft: '3px solid #ff6b35'
                  }}>
                    <span style={{ color: '#ff6b35' }}>IA:</span> Réflexion en cours...
                  </div>
                )}
                
                {/* Bouton Répondre après une question */}
                {iaResponse && !isProcessing && !isListening && (
                  <button
                    onClick={toggleListening}
                    style={{
                      marginTop: '0.5rem',
                      width: '100%',
                      padding: '0.6rem',
                      background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#0f172a',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    🎤 Répondre
                  </button>
                )}
              </div>
            )}
            
            <div style={{ 
              marginTop: '0.5rem', 
              fontSize: '0.6rem', 
              color: '#64748b',
              padding: '0.4rem',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '4px',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              <span>💡 Je me souviens de la conversation</span>
              <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                {conversationHistory.length > 0 && (
                  <span style={{ color: '#3b82f6', fontSize: '0.5rem' }}>
                    💬{conversationHistory.length}
                  </span>
                )}
                {currentChantierContext && (
                  <span style={{ color: '#ff6b35', fontWeight: '600' }}>
                    📍{currentChantierContext.nom}
                  </span>
                )}
                {userInstructions.length > 0 && (
                  <span style={{ color: '#22c55e', fontWeight: '600', fontSize: '0.55rem' }}>
                    🎯{userInstructions.length}
                  </span>
                )}
                {conversationHistory.length > 0 && (
                  <button
                    onClick={() => { 
                      setConversationHistory([]); 
                      conversationHistoryRef.current = [];
                      setCurrentChantierContext(null); 
                      currentChantierContextRef.current = null;
                      setSessionActions([]); 
                    }}
                    style={{
                      padding: '0.15rem 0.3rem',
                      background: 'rgba(255,100,100,0.2)',
                      border: 'none',
                      borderRadius: '3px',
                      color: '#f87171',
                      cursor: 'pointer',
                      fontSize: '0.5rem'
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            
            {/* DEBUG - Historique visible */}
            <div style={{ 
              marginTop: '0.5rem', 
              padding: '0.5rem', 
              background: '#1e40af', 
              borderRadius: '6px',
              fontSize: '0.6rem',
              color: 'white',
              border: '2px solid yellow'
            }}>
              <strong>🔍 DEBUG MÉMOIRE:</strong><br/>
              Historique: <strong>{conversationHistory.length}</strong> messages<br/>
              Chantier: <strong>{currentChantierContext?.nom || 'aucun'}</strong><br/>
              {conversationHistory.length > 0 && (
                <div style={{ marginTop: '0.3rem', background: 'rgba(0,0,0,0.3)', padding: '0.3rem', borderRadius: '4px' }}>
                  {conversationHistory.slice(-4).map((m, i) => (
                    <div key={i} style={{ marginBottom: '2px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                      <strong>{m.role === 'user' ? '👤' : '🤖'}:</strong> {(m.content || '').substring(0, 60)}...
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Navigation */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {[
              { id: 'aujourdhui', label: "Aujourd'hui", icon: <Icons.Home />, badge: lotsAujourdhui.length },
              { id: 'planning', label: 'Planning', icon: <Icons.Calendar /> },
              { id: 'chantiers', label: 'Chantiers', icon: <Icons.Building />, badge: chantiers.length },
              { id: 'equipes', label: 'Équipes', icon: <Icons.Users /> },
              { id: 'livreur', label: 'Alex (Livreur)', icon: <Icons.Truck />, badge: tachesAujourdhui.filter(t => !t.fait).length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedChantier(null); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.7rem',
                  background: activeTab === tab.id ? 'rgba(255,107,53,0.15)' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: activeTab === tab.id ? '#ff6b35' : '#64748b',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: activeTab === tab.id ? '600' : '400',
                  borderLeft: activeTab === tab.id ? '3px solid #ff6b35' : '3px solid transparent'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {tab.icon}
                  {tab.label}
                </span>
                {tab.badge > 0 && (
                  <span style={{
                    background: activeTab === tab.id ? 'rgba(255,107,53,0.3)' : 'rgba(255,255,255,0.1)',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '8px',
                    fontSize: '0.65rem'
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
          
          {/* Rappels */}
          {rappels.length > 0 && (
            <div>
              <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.4rem', letterSpacing: '1px' }}>
                RAPPELS ({rappels.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '160px', overflowY: 'auto' }}>
                {rappels.slice(0, 4).map((rappel) => (
                  <div
                    key={rappel.id}
                    style={{
                      padding: '0.5rem',
                      background: rappel.urgent ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0.03)',
                      borderRadius: '6px',
                      borderLeft: `2px solid ${rappel.urgent ? '#ff6b35' : '#475569'}`,
                      fontSize: '0.7rem'
                    }}
                  >
                    <div style={{ fontWeight: '600', color: rappel.urgent ? '#ff6b35' : '#e2e8f0' }}>
                      {rappel.message}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.65rem' }}>
                      {rappel.chantier}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Polyvalents dispo */}
          <div>
            <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.4rem', letterSpacing: '1px' }}>
              POLYVALENTS DISPO
            </div>
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {polyvalents.map(p => (
                <span key={p.id} style={{
                  padding: '0.25rem 0.5rem',
                  background: 'rgba(34, 197, 94, 0.15)',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  color: '#4ade80',
                  border: '1px solid rgba(34, 197, 94, 0.3)'
                }}>
                  {p.nom}
                </span>
              ))}
            </div>
          </div>
        </aside>

        {/* CONTENU PRINCIPAL */}
        <main style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
          
          {/* AUJOURD'HUI */}
          {activeTab === 'aujourdhui' && (
            <div>
              <h2 style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Icons.Home /> Aujourd'hui — {lotsAujourdhui.length} chantier{lotsAujourdhui.length !== 1 ? 's' : ''}
              </h2>
              
              {lotsAujourdhui.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '10px',
                  border: '1px dashed rgba(255,255,255,0.1)'
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>🎉</div>
                  <div style={{ color: '#64748b' }}>Rien de prévu aujourd'hui !</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {lotsAujourdhui.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '10px',
                        padding: '1rem',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderLeft: `4px solid ${item.equipe?.couleur || '#64748b'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                        <div>
                          <h3 style={{ margin: '0 0 0.15rem 0', fontSize: '0.95rem', color: '#ff6b35' }}>{item.chantier}</h3>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.adresse || 'Adresse non renseignée'}</div>
                        </div>
                        <span style={{
                          padding: '0.2rem 0.6rem',
                          background: 'rgba(255,107,53,0.15)',
                          borderRadius: '5px',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          color: '#ff6b35'
                        }}>
                          {item.lot}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: '0.2rem' }}>ÉQUIPE</div>
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {item.membres.length > 0 ? item.membres.map(m => (
                              <span key={m.id} style={{
                                padding: '0.2rem 0.5rem',
                                background: `${item.equipe?.couleur}22`,
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                border: `1px solid ${item.equipe?.couleur}44`
                              }}>
                                {m.nom}
                              </span>
                            )) : (
                              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Non affectée</span>
                            )}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {formatDateCourt(item.dateDebut)} → {formatDateCourt(item.dateFin)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Rappels urgents */}
              {rappelsUrgents.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.85rem', color: '#ff6b35', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Icons.Alert /> Rappels urgents
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {rappelsUrgents.map(r => (
                      <div key={r.id} style={{
                        padding: '0.6rem 0.8rem',
                        background: 'rgba(255,107,53,0.1)',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,107,53,0.3)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.8rem' }}>{r.alerte || r.message}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{r.chantier}</div>
                        </div>
                        <button
                          onClick={() => setRappelsValides(prev => new Set([...prev, r.id]))}
                          style={{
                            padding: '0.3rem 0.6rem',
                            background: 'rgba(46, 204, 113, 0.2)',
                            border: '1px solid rgba(46, 204, 113, 0.4)',
                            borderRadius: '4px',
                            color: '#2ecc71',
                            cursor: 'pointer',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}
                        >
                          <Icons.Check /> Fait
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Tâches livreur aujourd'hui */}
              {tachesAujourdhui.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Icons.Truck /> Tâches Alex aujourd'hui
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {tachesAujourdhui.map(t => (
                      <div key={t.id} style={{
                        padding: '0.5rem 0.7rem',
                        background: t.fait ? 'rgba(46,204,113,0.1)' : 'rgba(255,255,255,0.03)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        opacity: t.fait ? 0.6 : 1
                      }}>
                        <input
                          type="checkbox"
                          checked={t.fait}
                          onChange={() => toggleTacheLivreur(t.id)}
                          style={{ accentColor: '#ff6b35' }}
                        />
                        <span style={{ fontSize: '0.8rem', textDecoration: t.fait ? 'line-through' : 'none' }}>
                          {t.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* PLANNING GANTT AMÉLIORÉ */}
          {activeTab === 'planning' && (
            <div style={{ height: 'calc(100vh - 140px)' }}>
              <PlanningGantt
                chantiers={chantiers}
                equipes={equipes}
                employes={employes}
                onModifierLot={modifierLotGantt}
                onDecalerLot={decalerUnLot}
              />
            </div>
          )}
          
          {/* CHANTIERS */}
          {activeTab === 'chantiers' && !selectedChantier && (
            <div>
              <h2 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Icons.Building /> Chantiers ({chantiers.length})
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {chantiers.map(chantier => (
                  <div 
                    key={chantier.id} 
                    onClick={() => setSelectedChantier(chantier)}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '10px',
                      padding: '1rem',
                      border: '1px solid rgba(255,255,255,0.06)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div>
                        <h3 style={{ margin: '0 0 0.15rem 0', fontSize: '0.95rem', color: '#ff6b35' }}>{chantier.nom}</h3>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{chantier.adresse || 'Adresse non renseignée'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'flex-start' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          background: chantier.type === 'TCE' ? 'rgba(147, 51, 234, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          color: chantier.type === 'TCE' ? '#a78bfa' : '#60a5fa'
                        }}>{chantier.type}</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      {chantier.lots.map((lot, idx) => (
                        <span key={idx} style={{
                          padding: '0.15rem 0.4rem',
                          background: lot.statut === 'termine' ? 'rgba(34,197,94,0.15)' : lot.statut === 'en_cours' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                          borderRadius: '3px',
                          fontSize: '0.65rem',
                          color: lot.statut === 'termine' ? '#4ade80' : lot.statut === 'en_cours' ? '#60a5fa' : '#64748b'
                        }}>
                          {lot.corps}
                        </span>
                      ))}
                    </div>
                    
                    {chantier.documents && chantier.documents.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: '#64748b' }}>
                        📎 {chantier.documents.length} document{chantier.documents.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* DÉTAIL CHANTIER */}
          {activeTab === 'chantiers' && selectedChantier && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  onClick={() => setSelectedChantier(null)}
                  style={{
                    padding: '0.4rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#e2e8f0',
                    cursor: 'pointer'
                  }}
                >
                  <Icons.ChevronLeft />
                </button>
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#ff6b35' }}>{selectedChantier.nom}</h2>
              </div>
              
              {/* Infos générales */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1rem',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.2rem' }}>ADRESSE</div>
                    <div style={{ fontSize: '0.85rem' }}>{selectedChantier.adresse || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.2rem' }}>CLIENT</div>
                    <div style={{ fontSize: '0.85rem' }}>{selectedChantier.client || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.2rem' }}>TÉLÉPHONE</div>
                    <div style={{ fontSize: '0.85rem' }}>{selectedChantier.telephone || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.2rem' }}>TYPE</div>
                    <div style={{ fontSize: '0.85rem' }}>{selectedChantier.type}</div>
                  </div>
                </div>
              </div>
              
              {/* Lots */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1rem',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <h3 style={{ margin: '0 0 0.6rem 0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Icons.Tool /> Lots ({selectedChantier.lots.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {selectedChantier.lots.map((lot, idx) => {
                    const equipe = equipes.find(e => e.id === lot.equipeId);
                    return (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.7rem',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '5px',
                        borderLeft: `3px solid ${equipe?.couleur || '#475569'}`,
                        fontSize: '0.8rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                          <span style={{ fontWeight: '600' }}>{lot.corps}</span>
                          <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                            {formatDateCourt(lot.dateDebut)} → {formatDateCourt(lot.dateFin)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {equipe && <span style={{ fontSize: '0.7rem', color: equipe.couleur }}>{equipe.nom}</span>}
                          <span style={{
                            padding: '0.15rem 0.4rem',
                            background: lot.statut === 'termine' ? 'rgba(34,197,94,0.2)' : lot.statut === 'en_cours' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                            borderRadius: '3px',
                            fontSize: '0.65rem',
                            color: lot.statut === 'termine' ? '#4ade80' : lot.statut === 'en_cours' ? '#60a5fa' : '#64748b'
                          }}>
                            {lot.statut === 'termine' ? '✓ Terminé' : lot.statut === 'en_cours' ? '▶ En cours' : '○ Planifié'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Documents */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '10px',
                padding: '1rem',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <h3 style={{ margin: 0, fontSize: '0.85rem' }}>
                    📁 Documents ({selectedChantier.documents?.length || 0})
                  </h3>
                  <button
                    onClick={() => setShowAddDocument(!showAddDocument)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      background: 'rgba(255,107,53,0.2)',
                      border: '1px solid #ff6b35',
                      borderRadius: '5px',
                      color: '#ff6b35',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Icons.Plus /> Ajouter
                  </button>
                </div>
                
                {showAddDocument && (
                  <div style={{
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    marginBottom: '0.6rem'
                  }}>
                    {/* Zone de drop / upload fichier */}
                    <div 
                      style={{
                        border: '2px dashed rgba(255,107,53,0.4)',
                        borderRadius: '8px',
                        padding: '1rem',
                        textAlign: 'center',
                        marginBottom: '0.75rem',
                        cursor: 'pointer',
                        background: 'rgba(255,107,53,0.05)',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => document.getElementById('file-upload').click()}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = 'rgba(255,107,53,0.15)'; }}
                      onDragLeave={(e) => { e.currentTarget.style.background = 'rgba(255,107,53,0.05)'; }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.currentTarget.style.background = 'rgba(255,107,53,0.05)';
                        const file = e.dataTransfer.files[0];
                        if (file) {
                          try {
                            setIsUploadingDoc(true);
                            await uploadDocument(selectedChantier.id, file);
                            setShowAddDocument(false);
                          } catch (err) {
                            alert('Erreur upload: ' + err.message);
                          } finally {
                            setIsUploadingDoc(false);
                          }
                        }
                      }}
                    >
                      <input
                        id="file-upload"
                        type="file"
                        style={{ display: 'none' }}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.dwg,.dxf"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            try {
                              setIsUploadingDoc(true);
                              await uploadDocument(selectedChantier.id, file);
                              setShowAddDocument(false);
                            } catch (err) {
                              alert('Erreur upload: ' + err.message);
                            } finally {
                              setIsUploadingDoc(false);
                            }
                          }
                          e.target.value = '';
                        }}
                      />
                      {isUploadingDoc ? (
                        <div style={{ color: '#ff6b35' }}>
                          ⏳ Upload en cours...
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>📤</div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            Glisse un fichier ici ou <span style={{ color: '#ff6b35', textDecoration: 'underline' }}>clique pour choisir</span>
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.3rem' }}>
                            PDF, Images, Word, Excel...
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* OU séparateur */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      margin: '0.5rem 0',
                      color: '#64748b',
                      fontSize: '0.7rem'
                    }}>
                      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                      <span>OU ajouter une référence</span>
                      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    </div>
                    
                    {/* Ajout manuel (référence) */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.2rem' }}>NOM</div>
                        <input
                          type="text"
                          value={newDocument.nom}
                          onChange={(e) => setNewDocument({ ...newDocument, nom: e.target.value })}
                          placeholder="Ex: Plan RDC"
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            color: '#e2e8f0',
                            fontSize: '0.8rem'
                          }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.2rem' }}>TYPE</div>
                        <select
                          value={newDocument.type}
                          onChange={(e) => setNewDocument({ ...newDocument, type: e.target.value })}
                          style={{
                            padding: '0.5rem',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            color: '#e2e8f0',
                            fontSize: '0.8rem'
                          }}
                        >
                          {TYPES_DOCUMENTS.map(t => (
                            <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => ajouterDocumentLocal(selectedChantier.id)}
                        style={{
                          padding: '0.5rem 0.8rem',
                          background: '#22c55e',
                          border: 'none',
                          borderRadius: '4px',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}
                      >
                        OK
                      </button>
                    </div>
                  </div>
                )}
                
                {selectedChantier.documents && selectedChantier.documents.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {selectedChantier.documents.map(doc => (
                      <div key={doc.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.7rem',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '5px',
                        fontSize: '0.8rem'
                      }}>
                        <div 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            cursor: doc.url && doc.url !== '#' ? 'pointer' : 'default',
                            flex: 1
                          }}
                          onClick={() => {
                            if (doc.url && doc.url !== '#') {
                              window.open(doc.url, '_blank');
                            }
                          }}
                        >
                          <span style={{ fontSize: '1rem' }}>{getDocumentIcon(doc.type)}</span>
                          <div>
                            <div style={{ 
                              fontWeight: '500',
                              color: doc.url && doc.url !== '#' ? '#3b82f6' : '#e2e8f0',
                              textDecoration: doc.url && doc.url !== '#' ? 'underline' : 'none'
                            }}>
                              {doc.nom}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                              {TYPES_DOCUMENTS.find(t => t.id === doc.type)?.label}
                              {doc.url && doc.url !== '#' && ' • 📎 Fichier joint'}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); supprimerDocumentLocal(selectedChantier.id, doc.id); }}
                          style={{
                            padding: '0.3rem 0.5rem',
                            background: 'rgba(239,68,68,0.2)',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '0.7rem'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    padding: '1.5rem',
                    textAlign: 'center',
                    color: '#64748b',
                    background: 'rgba(0,0,0,0.15)',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}>
                    Aucun document
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* ÉQUIPES */}
          {activeTab === 'equipes' && (
            <div>
              <h2 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Icons.Users /> Équipes ({equipes.length})
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.6rem' }}>
                {equipes.map(equipe => {
                  const membres = equipe.membres.map(mid => employes.find(e => e.id === mid)).filter(Boolean);
                  return (
                    <div key={equipe.id} style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '10px',
                      padding: '1rem',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderTop: `3px solid ${equipe.couleur}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                        <h3 style={{ margin: 0, fontSize: '0.9rem' }}>{equipe.nom}</h3>
                        <span style={{ fontSize: '0.65rem', color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                          {equipe.specialite}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {membres.map(m => (
                          <div key={m.id} style={{
                            padding: '0.4rem 0.6rem',
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '4px',
                            fontSize: '0.8rem'
                          }}>
                            {m.nom}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Sous-traitants */}
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Sous-traitants ({sousTraitants.length})</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.4rem' }}>
                  {sousTraitants.map(st => (
                    <div key={st.id} style={{
                      padding: '0.5rem 0.7rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.05)',
                      fontSize: '0.8rem'
                    }}>
                      <div style={{ fontWeight: '500' }}>{st.nom}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{st.competences.join(', ')}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* LIVREUR */}
          {activeTab === 'livreur' && (
            <div>
              <h2 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Icons.Truck /> Planning Alex (Livreur)
              </h2>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  value={nouvelleTache}
                  onChange={(e) => setNouvelleTache(e.target.value)}
                  placeholder="Nouvelle tâche..."
                  onKeyDown={(e) => e.key === 'Enter' && ajouterTacheLivreurLocal()}
                  style={{
                    flex: 1,
                    padding: '0.6rem 0.8rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#e2e8f0',
                    fontSize: '0.85rem'
                  }}
                />
                <button
                  onClick={ajouterTacheLivreurLocal}
                  style={{
                    padding: '0.6rem 1rem',
                    background: 'rgba(255,107,53,0.2)',
                    border: '1px solid #ff6b35',
                    borderRadius: '6px',
                    color: '#ff6b35',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.85rem',
                    fontWeight: '600'
                  }}
                >
                  <Icons.Plus /> Ajouter
                </button>
              </div>
              
              {tachesLivreur.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {tachesLivreur.map(t => (
                    <div key={t.id} style={{
                      padding: '0.6rem 0.8rem',
                      background: t.fait ? 'rgba(46,204,113,0.1)' : 'rgba(255,255,255,0.03)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <input
                        type="checkbox"
                        checked={t.fait}
                        onChange={() => toggleTacheLivreur(t.id)}
                        style={{ accentColor: '#ff6b35', width: '16px', height: '16px' }}
                      />
                      <span style={{
                        flex: 1,
                        fontSize: '0.85rem',
                        textDecoration: t.fait ? 'line-through' : 'none',
                        opacity: t.fait ? 0.6 : 1
                      }}>
                        {t.description}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {formatDateCourt(t.date)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '10px',
                  border: '1px dashed rgba(255,255,255,0.1)'
                }}>
                  <Icons.Truck />
                  <div style={{ color: '#64748b', marginTop: '0.5rem' }}>Aucune tâche</div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
