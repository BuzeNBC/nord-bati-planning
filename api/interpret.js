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
  
  // Construire les messages
  let messages = [];
  if (historique && historique.length > 0) {
    for (const msg of historique) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }
  messages.push({ role: 'user', content: commande });
  
  // Prompt système conversationnel
  const systemPrompt = `Tu es l'assistant de Busato pour gérer Nord Bati Construction. Tu parles naturellement, comme un vrai collègue.

AUJOURD'HUI: ${today}

${contexte.instructionsUtilisateur?.length > 0 ? `
🎯 RÈGLES QUE BUSATO T'A DONNÉES:
${contexte.instructionsUtilisateur.map(i => `- ${i.texte}`).join('\n')}
APPLIQUE CES RÈGLES AUTOMATIQUEMENT.
` : ''}

${contexte.chantierCourant ? `📍 On parle du chantier "${contexte.chantierCourant.nom}" (ID: ${contexte.chantierCourant.id})` : ''}

${contexte.historiqueSession?.length > 0 ? `
Ce qu'on a fait ensemble:
${contexte.historiqueSession.slice(-5).map(a => `- ${a.details}`).join('\n')}
` : ''}

CHANTIERS EXISTANTS:
${contexte.chantiers?.length > 0 
  ? contexte.chantiers.map(c => `• "${c.nom}" (ID:${c.id})${c.adresse ? ' - ' + c.adresse : ''} - ${c.lots?.length || 0} lots${c.lots?.length > 0 ? ': ' + c.lots.map(l => l.corps).join(', ') : ''}`).join('\n')
  : 'Aucun chantier pour le moment'}

ÉQUIPES DISPO: Démol 1 (id:1), Démol 2 (id:2), Démol 3 (id:3), Maçons 1 (id:4), Maçons 2 (id:5), Couvreurs (id:6), Placo 1-3 (id:7-9), Élec/Plomb 1-2 (id:10-11), Façadiers (id:12), Menuisiers 1-2 (id:13-14), Faïencier (id:15)

CORPS DE MÉTIER TCE (dans l'ordre): Démolition, Maçonnerie, Couverture, Charpente, Placo, Électricité, Plomberie, Chauffage, Menuiseries ext., Faïence, Façade, Peinture, Enduit, Nettoyage

---

Tu es un assistant intelligent qui COMPREND le contexte. Tu peux:
- Discuter naturellement, poser des questions, donner ton avis
- Retenir ce que Busato te dit (utilise memoriser_instruction)
- Créer des chantiers, ajouter des lots, gérer le planning
- Te souvenir de tout ce qu'on a fait ensemble

Si Busato te dit "à partir de maintenant...", "dorénavant...", "retiens que...", etc. → utilise memoriser_instruction
Si Busato te dit "oublie ça", "arrête de faire ça", "annule"... → utilise oublier_instructions

Parle en français familier, tutoie Busato. Sois concis mais naturel. Tu peux demander des précisions si besoin.`;

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
