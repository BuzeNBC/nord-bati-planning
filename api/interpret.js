// API Route pour interpréter les commandes via Claude
// Utilise les TOOLS pour permettre une conversation naturelle

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { commande, contexte, historique } = req.body;
  if (!commande) return res.status(400).json({ error: 'Commande manquante' });
  
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Clé API non configurée' });
  
  const today = new Date().toISOString().split('T')[0];
  
  // DEBUG
  console.log('=== API INTERPRET ===');
  console.log('Commande:', commande);
  console.log('Historique reçu:', historique?.length || 0, 'messages');
  console.log('Chantier courant:', contexte.chantierCourant?.nom || 'aucun');
  
  // Construire les messages avec TOUT l'historique
  let messages = [];
  
  // Ajouter l'historique de conversation
  if (historique && historique.length > 0) {
    console.log('Messages historique:');
    for (const msg of historique) {
      console.log(`  - ${msg.role}: ${msg.content.substring(0, 50)}...`);
      messages.push({ role: msg.role, content: msg.content });
    }
  }
  
  // Ajouter le message actuel
  messages.push({ role: 'user', content: commande });
  
  console.log('Total messages envoyés à Claude:', messages.length);
  console.log('===================');
  
  // Prompt système avec contexte clair
  const systemPrompt = `Tu es l'assistant de Busato pour Nord Bati Construction. Tu parles comme un collègue.

AUJOURD'HUI: ${today}

${contexte.instructionsUtilisateur?.length > 0 ? `
🎯 TES RÈGLES PERSONNALISÉES:
${contexte.instructionsUtilisateur.map(i => `- ${i.texte}`).join('\n')}
` : ''}

${contexte.chantierCourant ? `
📍 CHANTIER EN COURS DE DISCUSSION: "${contexte.chantierCourant.nom}" (ID: ${contexte.chantierCourant.id})
→ Si Busato ne précise pas de chantier, c'est pour "${contexte.chantierCourant.nom}" !
` : ''}

${contexte.historiqueSession?.length > 0 ? `
📋 CE QU'ON A FAIT ENSEMBLE RÉCEMMENT:
${contexte.historiqueSession.slice(-5).map(a => `- ${a.details}`).join('\n')}
` : ''}

CHANTIERS (${contexte.chantiers?.length || 0}):
${contexte.chantiers?.length > 0 
  ? contexte.chantiers.map(c => {
      const lotsInfo = c.lots?.length > 0 
        ? c.lots.map((l, idx) => `  [${idx}] ${l.corps} (${l.dateDebut} → ${l.dateFin}) ${l.statut}`).join('\n')
        : '  (aucun lot)';
      return `• "${c.nom}" (ID:${c.id}) - ${c.adresse || 'pas d\'adresse'} - ${c.statut}
${lotsInfo}`;
    }).join('\n\n')
  : 'Aucun chantier'}

${contexte.tachesLivreur?.length > 0 ? `
📦 TÂCHES ALEX (Livreur):
${contexte.tachesLivreur.map(t => `- [ID:${t.id}] ${t.description} (${t.date}) ${t.fait ? '✅' : '⬜'}`).join('\n')}
` : ''}

${contexte.rappelsEnCours?.length > 0 ? `
⚠️ RAPPELS EN COURS:
${contexte.rappelsEnCours.map(r => `- [${r.id}] ${r.chantier}: ${r.message}`).join('\n')}
` : ''}

ÉQUIPES (avec leurs IDs):
1=Démol 1, 2=Démol 2, 3=Démol 3, 4=Maçons 1, 5=Maçons 2, 6=Couvreurs, 7=Placo 1, 8=Placo 2, 9=Placo 3, 10=Élec/Plomb 1, 11=Élec/Plomb 2, 12=Façadiers, 13=Menuisiers 1, 14=Menuisiers 2, 15=Faïencier

CORPS TCE: Démolition, Maçonnerie, Couverture, Charpente, Placo, Électricité, Plomberie, Chauffage, Menuiseries ext., Faïence, Façade, Peinture, Enduit, Nettoyage

---

IMPORTANT:
- Tu as accès à TOUT l'historique de la conversation ci-dessus
- Quand Busato répond à une de tes questions, UTILISE SA RÉPONSE avec le contexte précédent
- Si tu as demandé "pour quel chantier?" et qu'il répond "Flocon", tu SAIS que c'est pour Flocon
- UTILISE le chantier en cours (📍) si Busato ne précise pas
- Pour modifier/supprimer un lot, utilise l'index du lot [0], [1], [2]... affiché ci-dessus

OUTILS DISPONIBLES:
- Chantiers: creer_chantier, modifier_chantier, supprimer_chantier, selectionner_chantier, rechercher_chantier, resume_chantier
- Lots: ajouter_lot, modifier_lot, supprimer_lot, decaler_lots
- Livreur: ajouter_tache_livreur, modifier_tache_livreur, supprimer_tache_livreur
- Documents: ajouter_document, supprimer_document
- Navigation: naviguer, aller_a_date, planning_equipe
- Rappels: valider_rappel
- Mémoire: memoriser_instruction, oublier_instructions

Si Busato dit "à partir de maintenant...", "dorénavant...", "retiens que..." → utilise memoriser_instruction
Si Busato dit "oublie ça", "arrête", "annule les règles" → utilise oublier_instructions

TRÈS IMPORTANT: Réponds TOUJOURS avec un message texte, même quand tu utilises des outils.
Exemple: Si tu supprimes un chantier, dis "C'est fait ! J'ai supprimé le chantier X." en plus d'utiliser l'outil.

Parle naturellement, tutoie Busato. Sois concis.`;

  // Définir les outils (tools) que l'IA peut utiliser
  const tools = [
    // ============================================
    // OUTILS CHANTIERS
    // ============================================
    {
      name: "creer_chantier",
      description: "Créer un nouveau chantier. Utilise lotsAuto=true si Busato veut tous les lots TCE automatiquement.",
      input_schema: {
        type: "object",
        properties: {
          nom: { type: "string", description: "Nom du chantier" },
          adresse: { type: "string", description: "Adresse du chantier" },
          client: { type: "string", description: "Nom du client" },
          telephone: { type: "string", description: "Téléphone du client" },
          type: { type: "string", enum: ["TCE", "Partiel"], description: "Type de chantier" },
          lotsAuto: { type: "boolean", description: "Si true, crée automatiquement tous les lots TCE" }
        },
        required: ["nom"]
      }
    },
    {
      name: "modifier_chantier",
      description: "Modifier les informations d'un chantier existant (nom, adresse, client, téléphone, notes, statut)",
      input_schema: {
        type: "object",
        properties: {
          chantierId: { type: "number", description: "ID du chantier à modifier" },
          nom: { type: "string", description: "Nouveau nom du chantier" },
          adresse: { type: "string", description: "Nouvelle adresse" },
          client: { type: "string", description: "Nouveau nom du client" },
          telephone: { type: "string", description: "Nouveau téléphone" },
          notes: { type: "string", description: "Notes sur le chantier" },
          statut: { type: "string", enum: ["planifie", "en_cours", "termine", "annule"], description: "Statut du chantier" }
        },
        required: ["chantierId"]
      }
    },
    {
      name: "supprimer_chantier",
      description: "Supprimer complètement un chantier et tous ses lots. ATTENTION: action irréversible!",
      input_schema: {
        type: "object",
        properties: {
          chantierId: { type: "number", description: "ID du chantier à supprimer" },
          confirmation: { type: "boolean", description: "Doit être true pour confirmer la suppression" }
        },
        required: ["chantierId", "confirmation"]
      }
    },
    
    // ============================================
    // OUTILS LOTS
    // ============================================
    {
      name: "ajouter_lot",
      description: "Ajouter un lot (corps de métier) à un chantier existant",
      input_schema: {
        type: "object",
        properties: {
          chantierId: { type: "number", description: "ID du chantier" },
          corps: { type: "string", description: "Corps de métier (Démolition, Maçonnerie, etc.)" },
          dateDebut: { type: "string", description: "Date de début YYYY-MM-DD" },
          dateFin: { type: "string", description: "Date de fin YYYY-MM-DD" },
          equipeId: { type: "number", description: "ID de l'équipe assignée (optionnel)" }
        },
        required: ["chantierId", "corps", "dateDebut", "dateFin"]
      }
    },
    {
      name: "modifier_lot",
      description: "Modifier un lot existant (dates, équipe, statut, corps de métier)",
      input_schema: {
        type: "object",
        properties: {
          chantierId: { type: "number", description: "ID du chantier" },
          lotIndex: { type: "number", description: "Index du lot dans la liste (0, 1, 2...)" },
          lotId: { type: "number", description: "ID du lot (alternative à lotIndex)" },
          corps: { type: "string", description: "Nouveau corps de métier" },
          dateDebut: { type: "string", description: "Nouvelle date de début YYYY-MM-DD" },
          dateFin: { type: "string", description: "Nouvelle date de fin YYYY-MM-DD" },
          equipeId: { type: "number", description: "ID de la nouvelle équipe" },
          statut: { type: "string", enum: ["planifie", "en_cours", "termine"], description: "Nouveau statut" }
        },
        required: ["chantierId"]
      }
    },
    {
      name: "supprimer_lot",
      description: "Supprimer un lot d'un chantier",
      input_schema: {
        type: "object",
        properties: {
          chantierId: { type: "number", description: "ID du chantier" },
          lotIndex: { type: "number", description: "Index du lot (0, 1, 2...)" },
          lotId: { type: "number", description: "ID du lot (alternative à lotIndex)" }
        },
        required: ["chantierId"]
      }
    },
    {
      name: "decaler_lots",
      description: "Décaler tous les lots d'un chantier d'un certain nombre de jours (positif = vers le futur, négatif = vers le passé)",
      input_schema: {
        type: "object",
        properties: {
          chantierId: { type: "number", description: "ID du chantier" },
          jours: { type: "number", description: "Nombre de jours à décaler (positif ou négatif)" },
          aPartirDe: { type: "string", description: "Date à partir de laquelle décaler (optionnel, format YYYY-MM-DD)" }
        },
        required: ["chantierId", "jours"]
      }
    },
    
    // ============================================
    // OUTILS TACHES LIVREUR
    // ============================================
    {
      name: "ajouter_tache_livreur",
      description: "Ajouter une tâche pour Alex le livreur",
      input_schema: {
        type: "object",
        properties: {
          description: { type: "string", description: "Description de la tâche" },
          date: { type: "string", description: "Date de la tâche YYYY-MM-DD" }
        },
        required: ["description", "date"]
      }
    },
    {
      name: "modifier_tache_livreur",
      description: "Modifier une tâche du livreur (description, date, ou marquer comme faite/non faite)",
      input_schema: {
        type: "object",
        properties: {
          tacheId: { type: "number", description: "ID de la tâche" },
          description: { type: "string", description: "Nouvelle description" },
          date: { type: "string", description: "Nouvelle date YYYY-MM-DD" },
          fait: { type: "boolean", description: "Marquer comme fait (true) ou non fait (false)" }
        },
        required: ["tacheId"]
      }
    },
    {
      name: "supprimer_tache_livreur",
      description: "Supprimer une tâche du livreur",
      input_schema: {
        type: "object",
        properties: {
          tacheId: { type: "number", description: "ID de la tâche à supprimer" }
        },
        required: ["tacheId"]
      }
    },
    
    // ============================================
    // OUTILS NAVIGATION ET AFFICHAGE
    // ============================================
    {
      name: "naviguer",
      description: "Changer de vue dans l'application",
      input_schema: {
        type: "object",
        properties: {
          vue: { type: "string", enum: ["aujourdhui", "planning", "chantiers", "equipes", "livreur"], description: "Vue à afficher" }
        },
        required: ["vue"]
      }
    },
    {
      name: "selectionner_chantier",
      description: "Ouvrir la fiche détaillée d'un chantier",
      input_schema: {
        type: "object",
        properties: {
          chantierId: { type: "number", description: "ID du chantier à afficher" }
        },
        required: ["chantierId"]
      }
    },
    {
      name: "aller_a_date",
      description: "Naviguer vers une date spécifique dans le planning",
      input_schema: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date vers laquelle naviguer YYYY-MM-DD" }
        },
        required: ["date"]
      }
    },
    
    // ============================================
    // OUTILS DOCUMENTS
    // ============================================
    {
      name: "ajouter_document",
      description: "Ajouter un document à un chantier",
      input_schema: {
        type: "object",
        properties: {
          chantierId: { type: "number", description: "ID du chantier" },
          nom: { type: "string", description: "Nom du document" },
          type: { type: "string", enum: ["plan", "devis", "photo", "permis", "facture", "autre"], description: "Type de document" }
        },
        required: ["chantierId", "nom", "type"]
      }
    },
    {
      name: "supprimer_document",
      description: "Supprimer un document d'un chantier",
      input_schema: {
        type: "object",
        properties: {
          chantierId: { type: "number", description: "ID du chantier" },
          documentId: { type: "number", description: "ID du document à supprimer" }
        },
        required: ["chantierId", "documentId"]
      }
    },
    
    // ============================================
    // OUTILS RAPPELS
    // ============================================
    {
      name: "valider_rappel",
      description: "Marquer un rappel comme traité/validé pour ne plus le voir",
      input_schema: {
        type: "object",
        properties: {
          rappelId: { type: "string", description: "ID du rappel à valider" }
        },
        required: ["rappelId"]
      }
    },
    
    // ============================================
    // OUTILS MÉMOIRE IA
    // ============================================
    {
      name: "memoriser_instruction",
      description: "Retenir une instruction/règle que Busato te donne pour l'appliquer automatiquement à l'avenir. Exemples: 'à partir de maintenant...', 'dorénavant...', 'retiens que...'",
      input_schema: {
        type: "object",
        properties: {
          instruction: { type: "string", description: "L'instruction à retenir" }
        },
        required: ["instruction"]
      }
    },
    {
      name: "oublier_instructions",
      description: "Oublier toutes les instructions/règles personnalisées",
      input_schema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    
    // ============================================
    // OUTILS RECHERCHE ET INFO
    // ============================================
    {
      name: "rechercher_chantier",
      description: "Rechercher un chantier par nom, adresse ou client",
      input_schema: {
        type: "object",
        properties: {
          recherche: { type: "string", description: "Terme de recherche" }
        },
        required: ["recherche"]
      }
    },
    {
      name: "resume_chantier",
      description: "Obtenir un résumé complet d'un chantier (lots, documents, avancement)",
      input_schema: {
        type: "object",
        properties: {
          chantierId: { type: "number", description: "ID du chantier" }
        },
        required: ["chantierId"]
      }
    },
    {
      name: "planning_equipe",
      description: "Voir le planning d'une équipe spécifique",
      input_schema: {
        type: "object",
        properties: {
          equipeId: { type: "number", description: "ID de l'équipe" },
          equipeName: { type: "string", description: "Nom de l'équipe (ex: 'Démol 1', 'Maçons 2')" }
        },
        required: []
      }
    }
  ];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
        tools: tools
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erreur API Claude:', errorData);
      return res.status(500).json({ error: 'Erreur API Claude', details: errorData });
    }
    
    const data = await response.json();
    
    console.log('Réponse Claude stop_reason:', data.stop_reason);
    console.log('Contenu:', data.content?.map(b => b.type).join(', '));
    
    // Extraire le texte et les appels d'outils
    let messageTexte = '';
    let actions = [];
    
    for (const block of data.content) {
      if (block.type === 'text') {
        messageTexte = block.text;
      } else if (block.type === 'tool_use') {
        actions.push({
          action: block.name,
          params: block.input
        });
      }
    }
    
    // Si pas de message texte mais des actions, générer un message
    if (!messageTexte && actions.length > 0) {
      const actionNames = actions.map(a => a.action).join(', ');
      messageTexte = `OK, c'est fait ! (${actionNames})`;
    }
    
    console.log('Message final:', messageTexte);
    console.log('Actions:', actions.length);
    
    // Retourner la réponse avec le message ET les actions
    return res.status(200).json({
      message: messageTexte,
      actions: actions
    });
    
  } catch (error) {
    console.error('Erreur:', error);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
}
