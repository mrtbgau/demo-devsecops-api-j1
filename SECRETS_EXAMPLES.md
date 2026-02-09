# Exemples de secrets à détecter

> ⚠️ Ce fichier contient des exemples de secrets **factices** pour tester git-secrets.
> Ces secrets ne sont PAS réels et ne donnent accès à rien.

## 🔑 AWS Keys

```javascript
// Exemple 1 : AWS Access Key
const AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
const AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

// Exemple 2 : Dans un fichier de configuration
const awsConfig = {
  accessKeyId: 'AKIAI44QH8DHBEXAMPLE',
  secretAccessKey: 'je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY',
  region: 'us-east-1'
};
```

## 💳 Stripe Keys

```javascript
// Stripe Secret Key (live)
const STRIPE_SECRET_KEY = 'sk_live_4eC39HqLyjWDarjtT1zdp7dc';

// Stripe Public Key (live)
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51H1234567890abcdefghij';

// Stripe Webhook Secret
const STRIPE_WEBHOOK_SECRET = 'whsec_abcdefghijklmnopqrstuvwxyz123456';
```

## 🐙 GitHub Tokens

```javascript
// GitHub Personal Access Token
const GITHUB_TOKEN = 'ghp_1234567890abcdefghijklmnopqrstuvw';

// GitHub OAuth Token
const GITHUB_OAUTH_TOKEN = 'gho_abcdefghijklmnopqrstuvwxyz123456';

// GitHub Fine-grained Token
const GITHUB_FINE_GRAINED_TOKEN = 'github_pat_11AAAAAA0aBcDeFgHiJkLmNoPqRsTuVwXyZ';
```

## 🔐 JWT Secrets

```javascript
// Secrets faibles (à éviter)
const JWT_SECRET = 'secret';
const JWT_SECRET_2 = 'password123';
const JWT_SECRET_3 = 'myapp_secret_key';

// Secrets dans les variables d'environnement (pattern dangereux)
process.env.JWT_SECRET = 'super_secret_key';
```

## 🔑 Clés privées

```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdefghijklmnopqrstuvwxyz...
-----END RSA PRIVATE KEY-----
```

```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----
```

## 🗝️ API Keys diverses

```javascript
// SendGrid
const SENDGRID_API_KEY = 'SG.1234567890abcdefghijklmnopqrstuvwxyz.ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Twilio
const TWILIO_AUTH_TOKEN = 'abcdef1234567890abcdef1234567890';
const TWILIO_ACCOUNT_SID = 'AC1234567890abcdefghijklmnopqrstuv';

// Google Cloud
const GOOGLE_API_KEY = 'AIzaSyD1234567890abcdefghijklmnopqrstu';

// OpenAI
const OPENAI_API_KEY = 'sk-1234567890abcdefghijklmnopqrstuvwxyz';
```

## 🗃️ Credentials de base de données

```javascript
// MongoDB
const MONGO_URI = 'mongodb://admin:P@ssw0rd123@cluster0.mongodb.net/mydb';

// PostgreSQL
const DATABASE_URL = 'postgresql://user:MySecretP@ss@db.example.com:5432/mydb';

// MySQL
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: 'Admin123!',
  database: 'production_db'
};
```

## 🔔 Webhooks & Tokens

```javascript
// Slack Webhook
const SLACK_WEBHOOK = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX';

// Discord Webhook
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz';
```

## 🎯 Comment détecter ces secrets ?

### Avec git-secrets

```bash
# Scanner ce fichier
git secrets --scan SECRETS_EXAMPLES.md

# Résultat attendu : plusieurs secrets détectés !
```

### Patterns à ajouter

```bash
# AWS
git secrets --add 'AKIA[0-9A-Z]{16}'

# Stripe
git secrets --add 'sk_live_[a-zA-Z0-9]{24}'
git secrets --add 'pk_live_[a-zA-Z0-9]{24}'

# GitHub
git secrets --add 'ghp_[a-zA-Z0-9]{36}'
git secrets --add 'gho_[a-zA-Z0-9]{36}'
git secrets --add 'github_pat_[a-zA-Z0-9_]{22,}'

# Clés privées
git secrets --add 'BEGIN.*PRIVATE KEY'

# JWT faibles
git secrets --add 'JWT_SECRET.*=.*(secret|password|123|key)'
```

---

## ⚠️ Important

1. **Tous ces secrets sont factices** et ne donnent accès à aucun service réel
2. En production, utilisez toujours des variables d'environnement
3. Ne committez JAMAIS de vrais secrets dans Git
4. Si vous committez un secret par erreur :
   - Révoquez-le immédiatement
   - Changez-le
   - Nettoyez l'historique Git (avec BFG Repo Cleaner)

---

## 🔍 Exercice

1. Ajoutez ce fichier au staging : `git add SECRETS_EXAMPLES.md`
2. Essayez de commiter : `git commit -m "add secrets examples"`
3. Observez le blocage de git-secrets
4. C'est normal ! Ce fichier contient des patterns de secrets

Pour permettre ce commit (car ce sont des exemples), vous pouvez :
```bash
git secrets --add --allowed 'SECRETS_EXAMPLES.md'
```

Ou commitez sans git-secrets (à des fins pédagogiques uniquement) :
```bash
git commit -m "add secrets examples" --no-verify
```
