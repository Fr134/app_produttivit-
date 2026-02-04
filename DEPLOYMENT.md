# Guida al Deploy su Railway

## Prerequisiti
- Account Railway (registrati su https://railway.app con GitHub)
- Account Google Cloud Console configurato
- Repository GitHub aggiornato

## Step 1: Preparazione (GIÀ FATTO ✅)
Il progetto è già configurato per il deploy con:
- `railway.toml` per la configurazione Railway
- Server configurato per servire il frontend in produzione
- Script di build nel package.json

## Step 2: Deploy su Railway

### Opzione A: Deploy da GitHub (Consigliato)

1. **Vai su Railway Dashboard**
   - Apri https://railway.app
   - Clicca su "New Project"
   - Seleziona "Deploy from GitHub repo"

2. **Seleziona il Repository**
   - Autorizza Railway ad accedere a GitHub se richiesto
   - Seleziona il repository `app_produttivit-`
   - Railway inizierà automaticamente il deploy

3. **Configurazione Variabili d'Ambiente**

   Una volta deployato, vai su "Variables" e aggiungi:

   ```
   NODE_ENV=production
   PORT=3000
   GOOGLE_CLIENT_ID=<il-tuo-google-client-id>
   GOOGLE_CLIENT_SECRET=<il-tuo-google-client-secret>
   GOOGLE_REDIRECT_URI=https://tuo-dominio.railway.app/auth/google/callback
   SESSION_SECRET=<genera-una-stringa-random-sicura>
   FRONTEND_URL=https://tuo-dominio.railway.app
   ```

   **IMPORTANTE**:
   - Sostituisci `tuo-dominio.railway.app` con il dominio che Railway ti assegna
   - Genera una SESSION_SECRET casuale (puoi usare: `openssl rand -base64 32`)

4. **Ottieni il Dominio Railway**
   - Vai su "Settings" nel tuo progetto Railway
   - Nella sezione "Domains" vedrai il dominio assegnato (es: `planning-app-production.up.railway.app`)
   - Copia questo URL

### Opzione B: Deploy da Railway CLI

1. **Installa Railway CLI**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login**
   ```bash
   railway login
   ```

3. **Inizializza il progetto**
   ```bash
   railway init
   ```

4. **Configura le variabili d'ambiente**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set GOOGLE_CLIENT_ID=<il-tuo-google-client-id>
   railway variables set GOOGLE_CLIENT_SECRET=<il-tuo-google-client-secret>
   railway variables set SESSION_SECRET=$(openssl rand -base64 32)
   ```

5. **Deploy**
   ```bash
   railway up
   ```

## Step 3: Configura Google Cloud Console

1. **Vai su Google Cloud Console**
   - Apri https://console.cloud.google.com
   - Seleziona il tuo progetto

2. **Aggiorna gli URI di reindirizzamento OAuth**
   - Vai su "API e servizi" > "Credenziali"
   - Clicca sul tuo OAuth 2.0 Client ID
   - Nella sezione "URI di reindirizzamento autorizzati", aggiungi:
     ```
     https://tuo-dominio.railway.app/auth/google/callback
     ```
   - Clicca "Salva"

3. **Aggiorna gli Origini JavaScript autorizzate**
   - Nella stessa pagina, aggiungi:
     ```
     https://tuo-dominio.railway.app
     ```
   - Clicca "Salva"

## Step 4: Testa il Deploy

1. Apri il dominio Railway nel browser
2. Dovresti vedere l'app caricata
3. Testa il login con Google
4. Verifica che il salvataggio su Google Drive funzioni

## Step 5: Domain Personalizzato (Opzionale)

Se vuoi usare un dominio personalizzato:

1. **Su Railway**
   - Vai su "Settings" > "Domains"
   - Clicca "Add Custom Domain"
   - Inserisci il tuo dominio (es: `planner.tuodominio.com`)
   - Railway ti darà un record CNAME da configurare

2. **Sul tuo provider DNS**
   - Aggiungi un record CNAME che punta a Railway
   - Esempio: `planner.tuodominio.com` → `planning-app.up.railway.app`

3. **Aggiorna Google Cloud Console**
   - Ripeti Step 3 usando il tuo dominio personalizzato

## Monitoring e Debug

### Visualizza i Log
```bash
railway logs
```

O dalla dashboard Railway, vai su "Deployments" > Seleziona il deploy > "Logs"

### Verificare le Variabili d'Ambiente
```bash
railway variables
```

### Redeploy Manuale
```bash
railway up --detach
```

### Rollback a un Deploy Precedente
Dalla dashboard Railway:
1. Vai su "Deployments"
2. Trova il deploy funzionante
3. Clicca sui tre puntini > "Redeploy"

## Troubleshooting

### Errore: OAuth redirect_uri_mismatch
- Verifica che gli URI su Google Cloud Console corrispondano esattamente al dominio Railway
- Assicurati di aver salvato le modifiche su Google Cloud Console

### Errore: Failed to load data from Drive
- Verifica che GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET siano corretti
- Controlla i log per vedere l'errore specifico

### App non si carica
- Controlla i log: `railway logs`
- Verifica che il build sia completato con successo
- Verifica che NODE_ENV=production sia impostato

### Session not persisting
- Assicurati che SESSION_SECRET sia impostato
- Verifica che il cookie secure sia configurato correttamente per HTTPS

## Costi Railway

Railway offre:
- **Piano Hobby**: $5/mese con $5 di credito incluso
- Paghi solo per quello che usi (CPU, RAM, storage, banda)
- L'app dovrebbe costare circa $3-5/mese con traffico moderato

## Deploy Automatici

Railway farà automaticamente il deploy quando:
- Fai push sul branch `main` su GitHub
- La build completa con successo

Per disabilitare i deploy automatici:
1. Vai su "Settings" nel progetto Railway
2. Disabilita "Auto Deploy"
