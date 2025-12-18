# NORD BATI - Configuration Projet

Ce document permet de reprendre le développement de l'application dans une nouvelle conversation avec Claude.

## Contexte

- **Entreprise**: Nord Bati Construction (Belgique)
- **Gérant**: Busato (+ associé)
- **Activité**: Rénovation TCE (Tous Corps d'État)
- **Effectif**: ~40 personnes

## Employés

### Équipes configurées

| Équipe | Membres | Spécialité |
|--------|---------|------------|
| Démol 1 | Marius, Vijai | Démolition |
| Démol 2 | Gianni, Laura | Démolition |
| Démol 3 | Jean-Claude Van Damme, Daniel | Démolition |
| Maçons 1 | Câlin, Laurent | Maçonnerie |
| Maçons 2 | Paul | Maçonnerie |
| Couvreurs | Tony, Romain | Couverture, Charpente |
| Placo 1 | David, Peggy | Placo |
| Placo 2 | Roger, Adrien | Placo |
| Placo 3 | Alexeï | Placo |
| Élec/Plomb 1 | Erwan, Mamadou | Électricité, Plomberie |
| Élec/Plomb 2 | Patrice, Matisse | Électricité, Plomberie |
| Façadiers | Saco, Kamaté | Façade |
| Menuisiers 1 | Jean-Claude, Céline | Pose menuiseries |
| Menuisiers 2 | Stéphane | Pose menuiseries |
| Faïencier | Philippe | Faïence/Carrelage |

### Autres

- **Polyvalents** (dispo en renfort): Momo, Ludo, Timothée
- **Livreur**: Alex (planning séparé avec tâches)
- **Sous-traitants**: Sabert (peinture, sols), Johnny (peinture), 1000D (enduit), Mathieu (nettoyage)

## Binômes

- Les équipes fonctionnent en binômes par défaut
- Possibilité de changer temporairement (absence) ou définitivement
- Pas de hiérarchie dans les binômes (égalitaire)
- Un binôme peut être 2 ou 3 personnes

## Corps de métier

Démolition, Maçonnerie, Couverture, Charpente, Placo, Électricité, Plomberie, Chauffage, Menuiseries ext., Faïence, Façade, Peinture, Enduit, Nettoyage

## Rappels automatiques

| Déclencheur | Rappel | Délai |
|-------------|--------|-------|
| Démolition (début) | Arrêté de voirie (benne) | 3 semaines avant |
| Couverture (début) | Arrêté de voirie (échafaudage) | 3 semaines avant |
| Électricité (fin) | Demande Consuel | 2 semaines avant |
| Plomberie/Chauffage (fin) | Qualigaz si gaz | 2 semaines avant |
| Après fin démol | Prendre côtes menuiseries | Récurrent jusqu'à validation |

## Fonctionnalités implémentées

- [x] Vue "Aujourd'hui" (chantiers du jour)
- [x] Planning équipes 2 semaines
- [x] Gestion chantiers avec lots multiples
- [x] Gestion équipes/binômes
- [x] Planning livreur Alex (tâches à cocher)
- [x] Rappels automatiques avec validation
- [x] Documents par chantier (plans, devis, photos...)
- [x] Commandes vocales/texte
- [x] Polyvalents affichés comme dispo

## À faire (évoqué)

- [ ] Gestion absences/congés avec alertes conflits
- [ ] Vue charge équipes (qui est dispo)
- [ ] Météo (alertes couverture/façade)
- [ ] Appel client direct depuis fiche
- [ ] Notes/journal de chantier
- [ ] Export PDF planning
- [ ] Connexion Supabase (persistance données)
- [ ] Upload vrais fichiers documents

## Stack technique

- React 18 + Vite
- Déploiement: Vercel
- Base de données: À connecter (Supabase prévu)
- Voix: Web Speech API (fonctionne en HTTPS)

## Notes importantes

- L'utilisateur veut interagir le moins possible avec le code/terminal
- Il dicte ses besoins, Claude fait les modifs
- Priorité: simplicité d'utilisation, flexibilité
- 2 utilisateurs: Busato + son associé
