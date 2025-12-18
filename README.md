# Nord Bati Planning - Version IA

Application de planning intelligent avec IA Claude intégrée.

## 🚀 Mise à jour depuis la version précédente

Cette version intègre l'IA Claude pour comprendre tes demandes en langage naturel.

### Pour mettre à jour ton app existante:

1. **Sur GitHub**, supprime les anciens fichiers et uploade ceux de ce ZIP
2. **Sur Vercel**, configure la clé API (voir ci-dessous)
3. Vercel va automatiquement redéployer

---

## 🔑 Configuration de la clé API Claude

### Étape 1: Créer un compte Anthropic

1. Va sur **https://console.anthropic.com**
2. Clique sur **"Sign Up"** (ou connecte-toi si tu as déjà un compte)
3. Vérifie ton email

### Étape 2: Obtenir une clé API

1. Une fois connecté, va dans **"API Keys"** (menu de gauche)
2. Clique sur **"Create Key"**
3. Donne un nom à ta clé (ex: "Nord Bati")
4. **COPIE LA CLÉ** (elle ne sera plus visible après !)
   - Elle ressemble à: `sk-ant-api03-xxxxxxxxxxxx...`

### Étape 3: Ajouter la clé dans Vercel

1. Va sur **https://vercel.com** et connecte-toi
2. Clique sur ton projet **nord-bati-planning**
3. Va dans **"Settings"** (onglet en haut)
4. Dans le menu de gauche, clique sur **"Environment Variables"**
5. Ajoute une nouvelle variable:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: Colle ta clé API (sk-ant-api03-xxxx...)
   - **Environment**: Coche "Production", "Preview", "Development"
6. Clique sur **"Save"**
7. Va dans **"Deployments"** et clique sur **"Redeploy"** sur le dernier déploiement

---

## 💬 Exemples de commandes vocales/texte

L'IA comprend maintenant le langage naturel ! Tu peux dire:

**Créer un chantier:**
- "Crée un chantier Durand à Lille"
- "Nouveau projet rénovation Lefebvre rue de la Gare"

**Ajouter des lots:**
- "Ajoute un lot démolition sur le chantier Dupont du 15 au 28 janvier"
- "Mets de l'électricité sur Durand pendant 2 semaines avec l'équipe d'Erwan"

**Modifier des lots:**
- "Décale la couverture sur Dupont d'une semaine"
- "Change l'équipe du placo sur Martin, mets Roger"
- "Marque la démolition comme terminée sur Dupont"

**Informations:**
- "Qu'est-ce qu'on a aujourd'hui ?"
- "Montre-moi le planning"
- "Qui est dispo la semaine prochaine ?"
- "C'est quoi l'équipe Placo 1 ?"

**Livreur:**
- "Ajoute une tâche pour Alex: livrer le sable chez Dupont demain"

---

## 💰 Coût de l'API

- ~3€ pour 1 million de tokens
- En usage normal: **5-15€/mois** environ
- Tu peux suivre ta consommation sur https://console.anthropic.com

---

## 📁 Structure du projet

```
nord-bati-ia/
├── api/
│   └── interpret.js    <- Fonction qui appelle Claude
├── src/
│   ├── App.jsx         <- Application React
│   └── main.jsx
├── public/
│   └── favicon.svg
├── index.html
├── package.json
├── vercel.json
└── README.md
```

---

Développé pour Nord Bati Construction 🏗️
