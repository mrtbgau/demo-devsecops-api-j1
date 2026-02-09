# Exercices DevSecOps - Jour 1

## 🎯 Exercice 1 : Lecture de code (30 min)

### Mission
Parcourez les fichiers suivants et listez TOUTES les vulnérabilités que vous trouvez :

#### Fichier 1 : `src/auth/login.js`
- [ ] Quelle est la vulnérabilité principale ?
- [ ] Comment l'exploiter ?
- [ ] Quelles sont les autres failles ?
- [ ] Comment corriger ?

#### Fichier 2 : `src/config/database.js`
- [ ] Quels sont les 3 problèmes majeurs ?
- [ ] Pourquoi est-ce dangereux ?
- [ ] Quelle est la bonne pratique ?

#### Fichier 3 : `src/api/files.js`
- [ ] Quelle attaque est possible ?
- [ ] Donnez 3 exemples d'exploitation
- [ ] Comment sécuriser ce code ?

#### Fichier 4 : `src/api/users.js` (CHALLENGE)
- [ ] Trouvez les 7 vulnérabilités
- [ ] Classez-les par ordre de gravité
- [ ] Proposez des corrections

---

## 🔨 Exercice 2 : Exploitation (30 min)

### 2.1 SQL Injection

**Objectif :** Connectez-vous sans connaître le mot de passe

```bash
# Votre commande curl ici :
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"???","password":"???"}'
```

**Questions :**
1. Quelle payload avez-vous utilisée ?
2. Pourquoi ça fonctionne ?
3. Quelles autres payloads sont possibles ?

### 2.2 Path Traversal

**Objectif :** Accédez au fichier `package.json` à la racine du projet

```bash
# Votre commande curl ici :
curl http://localhost:3000/api/files?name=???
```

**Questions :**
1. Combien de `../` avez-vous utilisés ?
2. Pouvez-vous accéder à `.env` (s'il existe) ?
3. Quels autres fichiers sensibles pouvez-vous lire ?

### 2.3 Privilege Escalation

**Objectif :** Créez un compte avec le rôle "admin"

```bash
# Votre commande curl ici :
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"???","password":"???","role":"???"}'
```

**Questions :**
1. Pourquoi pouvez-vous définir votre propre rôle ?
2. Comment empêcher ça ?

### 2.4 SQL Injection avancée (Bonus)

**Objectif :** Injectez du SQL dans l'endpoint `/api/users`

Essayez d'injecter une commande SQL dans le champ `role` :

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test","role":"admin'\'''); DROP TABLE users; --"}'
```

**Attention :** Ceci détruirait la table `users` (si la DB existait) !

---

## 🔒 Exercice 3 : Configuration git-secrets (30 min)

### Étape 1 : Installation

```bash
# macOS
brew install git-secrets

# Linux (Debian/Ubuntu)
sudo apt-get install git-secrets

# Ou depuis les sources
git clone https://github.com/awslabs/git-secrets.git
cd git-secrets
sudo make install
```

### Étape 2 : Configuration du repository

```bash
cd demo-devsecops-api-j1

# Installer les hooks
git secrets --install

# Ajouter les patterns AWS
git secrets --register-aws

# Ajouter des patterns personnalisés
git secrets --add 'sk_live_[a-zA-Z0-9]{24}'      # Stripe
git secrets --add 'pk_live_[a-zA-Z0-9]{24}'      # Stripe Public
git secrets --add 'ghp_[a-zA-Z0-9]{36}'          # GitHub Token
git secrets --add 'gho_[a-zA-Z0-9]{36}'          # GitHub OAuth
git secrets --add 'JWT_SECRET.*=.*(secret|password|123|key)'
git secrets --add 'BEGIN.*PRIVATE KEY'           # Clés privées

# Lister les patterns configurés
git secrets --list
```

### Étape 3 : Tests

Créez un fichier avec un secret et essayez de le commiter :

```bash
# Test 1 : AWS Key
echo "const AWS_KEY = 'AKIAIOSFODNN7EXAMPLE';" > test-aws.js
git add test-aws.js
git commit -m "test aws key"
# ❌ Devrait être bloqué !

# Test 2 : Stripe Key
echo "const STRIPE_KEY = 'sk_live_abcdefghijklmnopqrstuvwx';" > test-stripe.js
git add test-stripe.js
git commit -m "test stripe key"
# ❌ Devrait être bloqué !

# Test 3 : GitHub Token
echo "const GITHUB_TOKEN = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz';" > test-github.js
git add test-github.js
git commit -m "test github token"
# ❌ Devrait être bloqué !

# Nettoyage
rm test-*.js
git reset
```

### Étape 4 : Scanner l'historique

```bash
# Scanner tout l'historique du repo
git secrets --scan-history

# Scanner un fichier spécifique
git secrets --scan src/config/database.js
```

**Question :** Des secrets ont-ils été trouvés ?

### Étape 5 : Configuration globale (optionnel)

Pour appliquer git-secrets à TOUS vos futurs repos :

```bash
# Configuration globale
git secrets --register-aws --global
git secrets --install ~/.git-templates/git-secrets
git config --global init.templateDir ~/.git-templates/git-secrets
```

Maintenant, tous les nouveaux repos créés auront git-secrets activé !

---

## 📊 Exercice 4 : Checklist de sécurité (15 min)

Pour chaque vulnérabilité identifiée, remplissez le tableau :

| Fichier | Vulnérabilité | OWASP Top 10 | Gravité (1-5) | Correction proposée |
|---------|---------------|--------------|---------------|---------------------|
| login.js | SQL Injection | A05 | 5 | Requêtes préparées |
| login.js | ... | ... | ... | ... |
| database.js | ... | ... | ... | ... |
| files.js | ... | ... | ... | ... |
| users.js | ... | ... | ... | ... |

---

## 🏆 Challenge final : Sécurisation complète (1h)

### Mission
Créez des versions sécurisées de tous les endpoints vulnérables.

### Contraintes
- ✅ Utiliser des requêtes préparées (prepared statements)
- ✅ Hash des mots de passe avec bcrypt
- ✅ JWT pour les tokens d'authentification
- ✅ Validation stricte des inputs (express-validator)
- ✅ Rate limiting (express-rate-limit)
- ✅ Gestion d'erreurs sans fuite d'information
- ✅ Variables d'environnement pour la configuration

### Fichiers à créer
- `src/auth/login-secure.js`
- `src/api/files-secure.js`
- `src/api/users-secure.js`

### Tests
Vérifiez que les attaques précédentes ne fonctionnent plus !

---

## 📝 Livrables

À la fin de l'exercice, vous devez avoir :

- [x] Identifié toutes les vulnérabilités
- [x] Exploité au moins 3 vulnérabilités
- [x] Configuré git-secrets
- [x] Testé le blocage de secrets
- [x] (Bonus) Créé des versions sécurisées

---

## 💡 Ressources

- [OWASP Top 10 - 2025](https://owasp.org/Top10/2025/)
- [SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

---

**Bon courage ! 🚀**
