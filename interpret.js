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
  
  // Construire les messages avec l'historique
  let messages = [];
  
  // Ajouter l'historique de conversation s'il existe
  if (historique && historique.length > 0) {
    for (const msg of historique) {
      // Pour les messages assistant, on doit simuler une réponse JSON valide
      if (msg.role === 'assistant') {
        messages.push({
          role: 'assistant',
          content: JSON.stringify({
            action: 'info',
            params: {},
            message: msg.content
          })
        });
      } else {
        messages.push({
          role: 'user',
          content: msg.content
        });
      }
    }
  }
  
  // Ajouter la commande actuelle
  messages.push({
    role: 'user',
    content: commande
  });
  
  // Log pour debug
  console.log('=== Commande reçue ===');
  console.log('Commande:', commande);
  console.log('Historique:', historique?.length || 0, 'messages');
  console.log('Messages envoyés:', messages.length);
  console.log('Nombre de chantiers:', contexte.chantiers?.length || 0);
  console.log('Chantiers:', contexte.chantiers?.map(c => c.nom).join(', '));
  console.log('=====================');
  
  const systemPrompt = `Tu es l'assistant IA de Nord Bati Construction, une entreprise de rénovation TCE (Tous Corps d'État) en Belgique.

RÈGLE D'OR: FAIS L'ACTION, NE POSE PAS DE QUESTIONS !
- Si une info manque, utilise une valeur par défaut intelligente
- Ne demande des précisions QUE si c'est absolument impossible de deviner (ex: nom du chantier)
- L'utilisateur veut construire son planning progressivement, pas tout définir d'un coup

VALEURS PAR DÉFAUT À UTILISER:
- Durée d'un lot si non précisée: 2 semaines (14 jours)
- Date de début si non précisée: aujourd'hui ou lendemain du dernier lot
- Équipe si non précisée: ne pas en assigner (null), l'utilisateur la définira plus tard
- Type de chantier si non précisé: "TCE"
- Adresse si non précisée: laisser vide
- Pour une date approximative ("la semaine prochaine", "début janvier"), choisis le lundi de cette semaine

EXEMPLES DE COMPORTEMENT ATTENDU:
- "Ajoute de la démolition sur Flocon le 5 janvier" → Ajoute le lot démolition du 5 au 19 janvier (2 semaines par défaut), sans équipe
- "Crée le chantier Dupont" → Crée le chantier sans adresse, type TCE
- "Mets de la couverture après la maçonnerie sur Flocon" → Regarde la fin de la maçonnerie et commence la couverture le lendemain

AUJOURD'HUI: ${new Date().toISOString().split('T')[0]}

====== CHANTIERS EXISTANTS ======
${contexte.chantiers && contexte.chantiers.length > 0 
  ? contexte.chantiers.map(c => `- ID:${c.id} | "${c.nom}" | ${c.adresse || 'Pas d\'adresse'} | ${c.type} | ${c.statut}
    Lots: ${c.lots && c.lots.length > 0 ? c.lots.map(l => `${l.corps} (${l.dateDebut} → ${l.dateFin}, ${l.statut})`).join(', ') : 'Aucun lot'}`).join('\n')
  : 'Aucun chantier enregistré'}
=================================

====== TÂCHES LIVREUR (Alex) ======
${contexte.tachesLivreur && contexte.tachesLivreur.length > 0
  ? contexte.tachesLivreur.map(t => `- ${t.description} | ${t.date} | ${t.fait ? 'Fait' : 'À faire'}`).join('\n')
  : 'Aucune tâche'}
===================================

ÉQUIPES DISPONIBLES:
- Démol 1 (id:1): Marius + Vijai
- Démol 2 (id:2): Gianni + Laura  
- Démol 3 (id:3): Jean-Claude Van Damme + Daniel
- Maçons 1 (id:4): Câlin + Laurent
- Maçons 2 (id:5): Paul
- Couvreurs (id:6): Tony + Romain (font aussi charpente)
- Placo 1 (id:7): David + Peggy
- Placo 2 (id:8): Roger + Adrien
- Placo 3 (id:9): Alexeï
- Élec/Plomb 1 (id:10): Erwan + Mamadou
- Élec/Plomb 2 (id:11): Patrice + Matisse
- Façadiers (id:12): Saco + Kamaté
- Menuisiers 1 (id:13): Jean-Claude + Céline
- Menuisiers 2 (id:14): Stéphane
- Faïencier (id:15): Philippe

POLYVALENTS (dispo en renfort): Momo (id:27), Ludo (id:28), Timothée (id:29)
LIVREUR: Alex (id:30) - planning séparé avec tâches

CORPS DE MÉTIER: Démolition, Maçonnerie, Couverture, Charpente, Placo, Électricité, Plomberie, Chauffage, Menuiseries ext., Faïence, Façade, Peinture, Enduit, Nettoyage

IMPORTANT: 
- Utilise TOUJOURS les chantiers listés ci-dessus comme référence
- Si l'utilisateur parle d'un chantier, cherche-le dans la liste par son nom (même approximatif)
- Pour ajouter un lot, tu DOIS utiliser l'ID du chantier existant

TU DOIS RÉPONDRE UNIQUEMENT EN JSON avec cette structure:
{
  "action": "nom_action",
  "params": { ... },
  "message": "Message à afficher à l'utilisateur"
}

ACTIONS POSSIBLES:

1. creer_chantier - Créer un nouveau chantier
{
  "action": "creer_chantier",
  "params": {
    "nom": "Nom du chantier",
    "adresse": "Adresse si mentionnée",
    "client": "Nom client si mentionné",
    "type": "TCE" ou "Partiel"
  },
  "message": "Je crée le chantier X..."
}

2. ajouter_lot - Ajouter un lot à un chantier existant
{
  "action": "ajouter_lot",
  "params": {
    "chantierId": 123,
    "corps": "Démolition",
    "dateDebut": "2025-01-20",
    "dateFin": "2025-02-03",
    "equipeId": 1
  },
  "message": "J'ajoute le lot démolition..."
}

3. modifier_lot - Modifier un lot existant
{
  "action": "modifier_lot",
  "params": {
    "chantierId": 123,
    "lotIndex": 0,
    "modifications": { "dateDebut": "2025-01-22", "equipeId": 2 }
  },
  "message": "Je modifie le lot..."
}

4. supprimer_lot - Supprimer un lot
{
  "action": "supprimer_lot",
  "params": { "chantierId": 123, "lotIndex": 0 },
  "message": "Je supprime le lot..."
}

5. changer_statut_lot - Changer le statut d'un lot
{
  "action": "changer_statut_lot",
  "params": { "chantierId": 123, "lotIndex": 0, "statut": "en_cours" ou "termine" ou "planifie" },
  "message": "..."
}

6. ajouter_tache_livreur - Ajouter une tâche pour Alex
{
  "action": "ajouter_tache_livreur",
  "params": { "description": "Livrer matériaux chantier X", "date": "2025-01-20" },
  "message": "J'ajoute la tâche pour Alex..."
}

7. voir_aujourdhui - Afficher la vue aujourd'hui
{
  "action": "voir_aujourdhui",
  "params": {},
  "message": "Voici ce qui est prévu aujourd'hui..."
}

8. voir_planning - Afficher le planning
{
  "action": "voir_planning", 
  "params": {},
  "message": "..."
}

9. voir_chantiers - Afficher les chantiers
{
  "action": "voir_chantiers",
  "params": {},
  "message": "..."
}

10. voir_equipes - Afficher les équipes
{
  "action": "voir_equipes",
  "params": {},
  "message": "..."
}

11. voir_livreur - Afficher le planning d'Alex
{
  "action": "voir_livreur",
  "params": {},
  "message": "..."
}

12. valider_rappel - Valider un rappel (arrêté voirie fait, consuel demandé, etc.)
{
  "action": "valider_rappel",
  "params": { "rappelId": "xxx" },
  "message": "..."
}

13. info - Juste donner une information sans action
{
  "action": "info",
  "params": {},
  "message": "L'équipe Placo 1 est composée de David et Peggy..."
}

14. question - UTILISE UNIQUEMENT si tu ne peux vraiment pas deviner (ex: aucun chantier mentionné et plusieurs existent)
{
  "action": "question",
  "params": {},
  "message": "Sur quel chantier ?"
}

RÈGLES IMPORTANTES:
- Réponds TOUJOURS en JSON valide, rien d'autre
- ÉVITE AU MAXIMUM d'utiliser "question" - préfère AGIR avec des valeurs par défaut
- Si une date n'est pas précisée, utilise aujourd'hui comme date de début
- Si une durée n'est pas précisée, utilise 2 semaines (14 jours)
- Si une équipe n'est pas précisée, mets equipeId: null
- Les dates doivent être au format YYYY-MM-DD
- Sois concis dans tes messages
- Parle en français familier (tutoiement)
- Si un seul chantier existe et que l'utilisateur parle d'un lot, c'est forcément pour ce chantier
- Si l'utilisateur dit "ajoute de la démolition" sans préciser le chantier mais qu'il n'y en a qu'un, ajoute-le sur celui-là

EXEMPLES:

"Ajoute de la démolition sur Flocon":
{
  "action": "ajouter_lot",
  "params": { "chantierId": 12345, "corps": "Démolition", "dateDebut": "2025-01-20", "dateFin": "2025-02-03", "equipeId": null },
  "message": "OK, démolition ajoutée sur Flocon (2 semaines à partir d'aujourd'hui)"
}

"Crée le chantier Martin":
{
  "action": "creer_chantier",
  "params": { "nom": "Martin", "type": "TCE" },
  "message": "Chantier Martin créé !"
}`;

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
      // Nettoyer la réponse (enlever les éventuels backticks markdown)
      let jsonStr = texteReponse.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      }
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
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
