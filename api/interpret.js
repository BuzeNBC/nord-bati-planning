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

CHANTIERS:
${contexte.chantiers?.length > 0 
  ? contexte.chantiers.map(c => `• "${c.nom}" (ID:${c.id}) - ${c.lots?.length || 0} lots`).join('\n')
  : 'Aucun chantier'}

ÉQUIPES: Démol 1-3, Maçons 1-2, Couvreurs, Placo 1-3, Élec/Plomb 1-2, Façadiers, Menuisiers 1-2, Faïencier

CORPS TCE: Démolition, Maçonnerie, Couverture, Charpente, Placo, Électricité, Plomberie, Chauffage, Menuiseries ext., Faïence, Façade, Peinture, Enduit, Nettoyage

---

IMPORTANT:
- Tu as accès à TOUT l'historique de la conversation ci-dessus
- Quand Busato répond à une de tes questions, UTILISE SA RÉPONSE avec le contexte précédent
- Si tu as demandé "pour quel chantier?" et qu'il répond "Flocon", tu SAIS que c'est pour Flocon
- UTILISE le chantier en cours (📍) si Busato ne précise pas

Si Busato dit "à partir de maintenant...", "dorénavant...", "retiens que..." → utilise memoriser_instruction
Si Busato dit "oublie ça", "arrête", "annule" → utilise oublier_instructions

TRÈS IMPORTANT: Réponds TOUJOURS avec un message texte, même quand tu utilises des outils.
Exemple: Si tu crées un chantier, dis "C'est fait ! J'ai créé le chantier X." en plus d'utiliser l'outil.

Parle naturellement, tutoie Busato. Sois concis.`;

  // Définir les outils (tools) que l'IA peut utiliser
  const tools = [
    {
      name: "creer_chantier",
      description: "Créer un nouveau chantier. Utilise lotsAuto=true si Busato veut tous les lots TCE automatiquement.",
      input_schema: {
        type: "object",
        properties: {
          nom: { type: "string", description: "Nom du chantier" },
          adresse: { type: "string", description: "Adresse du chantier" },
          type: { type: "string", enum: ["TCE", "Partiel"], description: "Type de chantier" },
          lotsAuto: { type: "boolean", description: "Si true, crée automatiquement tous les lots TCE" }
        },
        required: ["nom"]
      }
    },
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
      description: "Modifier un lot existant",
      input_schema: {
        type: "object",
        properties: {
          chantierId: { type: "number" },
          lotIndex: { type: "number", description: "Index du lot (0, 1, 2...)" },
          corps: { type: "string" },
          dateDebut: { type: "string" },
          dateFin: { type: "string" },
          equipeId: { type: "number" },
          statut: { type: "string", enum: ["planifie", "en_cours", "termine"] }
        },
        required: ["chantierId", "lotIndex"]
      }
    },
    {
      name: "supprimer_lot",
      description: "Supprimer un lot d'un chantier",
      input_schema: {
        type: "object",
        properties: {
          chantierId: { type: "number" },
          lotIndex: { type: "number" }
        },
        required: ["chantierId", "lotIndex"]
      }
    },
    {
      name: "ajouter_tache_livreur",
      description: "Ajouter une tâche pour Alex le livreur",
      input_schema: {
        type: "object",
        properties: {
          description: { type: "string" },
          date: { type: "string", description: "Date YYYY-MM-DD" }
        },
        required: ["description", "date"]
      }
    },
    {
      name: "naviguer",
      description: "Changer de vue dans l'application",
      input_schema: {
        type: "object",
        properties: {
          vue: { type: "string", enum: ["aujourdhui", "planning", "chantiers", "equipes", "livreur"] }
        },
        required: ["vue"]
      }
    },
    {
      name: "memoriser_instruction",
      description: "Retenir une instruction/règle que Busato te donne pour l'appliquer automatiquement à l'avenir",
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
