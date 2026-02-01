# BrainGuard - Roadmap

## Vision

BrainGuard évolue vers un système de santé cognitive intelligent qui utilise l'IA pour analyser en profondeur les patterns comportementaux, pas juste les compter.

---

## v0.1 - MVP (Actuel)

- [x] Storage JSONL (migration depuis SQLite)
- [x] Embeddings pour similarité sémantique
- [x] Tool `brain_guard` (record/search)
- [x] Commande `/brain` avec stats
- [x] System prompt avec méthodologie
- [x] Détection de patterns similaires
- [x] Rapport markdown basique

---

## v0.2 - Agent-Driven Reports

### Problème actuel
Le rapport est généré par du code (`report.ts`) - rigide et limité.

### Solution
L'agent génère le rapport via instructions, pas du code.

**Changements :**
- [ ] Remplacer `report.ts` par un prompt dans `/brain report`
- [ ] L'agent query `brain_guard({ action: "search" })` lui-même
- [ ] Rapport personnalisé selon le contexte
- [ ] Format adaptatif (court/détaillé selon demande)

**Exemple de flow :**
```
User: /brain report

Agent reçoit instruction:
"Génère un rapport de santé cognitive. Utilise brain_guard pour récupérer
les patterns des 7 derniers jours. Analyse les tendances, identifie les
clusters, et formule des recommandations personnalisées."

Agent:
1. brain_guard({ action: "search", days: 7 })
2. Analyse les résultats
3. Génère un rapport adapté
```

---

## v0.3 - Cross-Memory Analysis

### Vision
Croiser les patterns BrainGuard avec les conversations stockées en memory pour un rapport enrichi.

**Fonctionnalités :**
- [ ] Query memory plugin pour contexte des patterns
- [ ] Identifier les sujets qui déclenchent les patterns
- [ ] Timeline des patterns avec contexte conversationnel
- [ ] Corrélations : "Tu délègues souvent quand tu parles de X"

**Architecture :**
```
/brain report --deep

Agent:
1. brain_guard({ action: "search", days: 30 })
2. Pour chaque pattern trouvé:
   - memory_search({ query: pattern.context })
   - Récupérer la conversation complète
3. Analyse croisée
4. Rapport avec insights profonds
```

---

## v0.4 - Proactive Interventions

### Vision
L'agent intervient proactivement quand il détecte un pattern récurrent.

**Fonctionnalités :**
- [ ] Seuils configurables (alerter après N occurrences)
- [ ] Interventions douces ("Je remarque que...")
- [ ] Suggestions de reformulation
- [ ] Mode coaching optionnel

---

## v0.5 - Visualizations

### Vision
Dashboard visuel de santé cognitive.

**Fonctionnalités :**
- [ ] Graphiques de tendance (canvas HTML)
- [ ] Heatmap des patterns par jour/heure
- [ ] Comparaison semaine/mois
- [ ] Export PDF du rapport

---

## Ideas Backlog

- **Gamification** : Badges pour progrès cognitifs
- **Multi-user** : Comparaison anonymisée entre utilisateurs
- **Integration journal** : Lier patterns à l'humeur/énergie
- **Voice patterns** : Analyser tonalité via voice-call
- **Self-assessment** : L'utilisateur peut valider/invalider les patterns détectés

---

## Non-Goals

- Juger ou bloquer l'utilisateur
- Remplacer un suivi psychologique professionnel
- Collecter des données pour des tiers
- Créer de l'anxiété autour des patterns

---

## Contributing

Les PRs sont bienvenues. Focus sur :
1. Améliorer la détection de patterns
2. Rendre les rapports plus utiles
3. Réduire les faux positifs
