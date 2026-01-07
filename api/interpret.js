// API Route pour interpréter les commandes via Claude
// Déployée sur Vercel comme serverless function

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { commande, contexte, historique } = req.body;
  
  if (!commande) {
    return res.status(400).json({ error: 'Commande manquante' });
  }
  
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Clé API non configurée' });
  }
  
  // Construire les messages avec l'historique complet
  let messages = [];
  
  if (historique && historique.length > 0) {
    for (const msg of historique) {
      if (msg.role === 'assistant') {
        messages.push({
          role: 'assistant',
          content: JSON.stringify({ action: 'info', params: {}, message: msg.content })
        });
      } else {
        messages.push({ role: 'user', content: msg.content });
      }
    }
  }
  
  messages.push({ role: 'user', content: commande });
  
  // Log pour debug
  console.log('Commande:', commande);
  console.log('Chantier courant:', contexte.chantierCourant?.nom || 'aucun');
  console.log('Actions session:', contexte.historiqueSession?.length || 0);
  
  const today = new Date().toISOString().split('T')[0];
  
  // Construire le prompt système
  const systemPrompt = `Tu es l'assistant IA de Nord Bati Construction. Tu gères les chantiers et le planning.

DATE: ${today}

${contexte.instructionsUtilisateur && contexte.instructionsUtilisateur.length > 0 ? `
🎯 INSTRUCTIONS QUE TU DOIS SUIVRE (données par l'utilisateur):
${contexte.instructionsUtilisateur.map((inst, idx) => `${idx + 1}. ${inst.texte}`).join('\n')}
→ APPLIQUE CES INSTRUCTIONS à chaque action que tu fais !
` : ''}
${contexte.chantierCourant ? `⭐ CHANTIER EN COURS: "${contexte.chantierCourant.nom}" (ID: ${contexte.chantierCourant.id})
→ Si pas de nom de chantier mentionné = c'est pour "${contexte.chantierCourant.nom}"
` : ''}
${contexte.historiqueSession && contexte.historiqueSession.length > 0 ? `
📋 CE QU'ON A FAIT ENSEMBLE:
${contexte.historiqueSession.map(a => `- ${a.details}`).join('\n')}
` : ''}
====== CHANTIERS ======
${contexte.chantiers && contexte.chantiers.length > 0 
  ? contexte.chantiers.map(c => `• "${c.nom}" (ID:${c.id})${c.adresse ? ' - ' + c.adresse : ''}
  ${c.lots && c.lots.length > 0 ? 'Lots: ' + c.lots.map(l => l.corps + ' (' + l.dateDebut + '→' + l.dateFin + ')').join(', ') : 'Pas de lots'}`).join('\n')
  : 'Aucun chantier'}
=======================

ÉQUIPES: Démol 1 (id:1), Démol 2 (id:2), Démol 3 (id:3), Maçons 1 (id:4), Maçons 2 (id:5), Couvreurs (id:6), Placo 1 (id:7), Placo 2 (id:8), Placo 3 (id:9), Élec/Plomb 1 (id:10), Élec/Plomb 2 (id:11), Façadiers (id:12), Menuisiers 1 (id:13), Menuisiers 2 (id:14), Faïencier (id:15)

RÈGLES:
1. AGIS sans poser de questions - utilise les valeurs par défaut
2. APPLIQUE LES INSTRUCTIONS UTILISATEUR ci-dessus si présentes
3. CHANTIER: utilise le chantier en cours si pas précisé
4. DURÉE: 2 semaines par défaut
5. DATE: aujourd'hui par défaut, ou après le dernier lot
6. ÉQUIPE: null par défaut (non assignée)
7. TU TE SOUVIENS de tout ce qu'on a fait ensemble
8. Réponds en français familier (tutoiement)

DÉTECTION DES INSTRUCTIONS:
Si l'utilisateur dit des choses comme "à partir de maintenant", "dorénavant", "quand je crée un chantier", "automatiquement", "toujours", "par défaut"... 
→ C'est une INSTRUCTION DE COMPORTEMENT, utilise l'action "ajouter_instruction"
Si l'utilisateur dit "arrête de", "ne fais plus", "annule cette règle", "oublie ce que je t'ai dit"...
→ Utilise l'action "supprimer_instruction"

RÉPONDS UNIQUEMENT EN JSON:
{
  "action": "ACTION_NAME",
  "params": { ... },
  "message": "Réponse naturelle et courte"
}

ACTIONS DISPONIBLES:
- creer_chantier: { nom, adresse?, type? } → Crée un chantier
- ajouter_lot: { chantierId, corps, dateDebut, dateFin, equipeId? } → Ajoute un lot
- modifier_lot: { chantierId, lotIndex, modifications } → Modifie un lot
- supprimer_lot: { chantierId, lotIndex } → Supprime un lot
- changer_statut_lot: { chantierId, lotIndex, statut } → Change le statut
- ajouter_tache_livreur: { description, date } → Tâche pour Alex
- ajouter_instruction: { instruction: "texte de l'instruction" } → Enregistre une instruction de comportement
- supprimer_instruction: { instructionId?, toutes? } → Supprime une ou toutes les instructions
- voir_aujourdhui, voir_planning, voir_chantiers, voir_equipes, voir_livreur: {} → Navigation
- info: {} → Juste donner une information
- question: {} → UNIQUEMENT si vraiment impossible

CORPS DE MÉTIER (ordre TCE): Démolition, Maçonnerie, Couverture, Charpente, Placo, Électricité, Plomberie, Chauffage, Menuiseries ext., Faïence, Façade, Peinture, Enduit, Nettoyage

EXEMPLES:

User: "À partir de maintenant quand je crée un chantier, crée tous les lots TCE automatiquement"
→ { "action": "ajouter_instruction", "params": { "instruction": "Quand un chantier est créé, ajouter automatiquement tous les lots TCE dans l'ordre: Démolition, Maçonnerie, Couverture, Charpente, Placo, Électricité, Plomberie, Chauffage, Menuiseries ext., Faïence, Façade, Peinture, Enduit, Nettoyage" }, "message": "OK ! À partir de maintenant, je créerai tous les lots TCE automatiquement pour chaque nouveau chantier." }

User: "Arrête de créer les lots automatiquement"
→ { "action": "supprimer_instruction", "params": { "toutes": true }, "message": "OK, j'ai supprimé cette instruction. Je ne créerai plus les lots automatiquement." }

User: "Crée le chantier Dupont" (avec instruction TCE active)
→ { "action": "creer_chantier", "params": { "nom": "Dupont", "type": "TCE", "lotsAuto": true }, "message": "Chantier Dupont créé avec tous les lots TCE !" }`;


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
        messages: messages
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erreur API Claude:', errorData);
      return res.status(500).json({ error: 'Erreur API Claude', details: errorData });
    }
    
    const data = await response.json();
    const texteReponse = data.content[0].text;
    
    // Parser le JSON de la réponse
    try {
      let jsonStr = texteReponse.trim();
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
      jsonStr = jsonStr.trim();
      
      const resultat = JSON.parse(jsonStr);
      return res.status(200).json(resultat);
    } catch (parseError) {
      console.error('Erreur parsing JSON:', texteReponse);
      return res.status(200).json({
        action: 'info',
        params: {},
        message: texteReponse
      });
    }
    
  } catch (error) {
    console.error('Erreur:', error);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
}
