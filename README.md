# 📅 Il Mio Planner - Planning App

App di pianificazione personale con integrazione **Google Calendar** e **Google Drive** per gestire progetti, task, routine e abitudini quotidiane.

![Status](https://img.shields.io/badge/status-production-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🌟 Funzionalità

- ✅ **Calendario Settimanale/Giornaliero**: Visualizza la tua settimana con eventi sincronizzati da Google Calendar
- 📊 **Gestione Progetti**: Traccia progetti a lungo termine con allocazione ore settimanale
- 📝 **Task Giornalieri**: Crea e completa task per ogni giorno
- 🏃 **Routine Personalizzate**: Definisci routine quotidiane (sport, lettura, ecc.)
- 💾 **Persistenza su Google Drive**: Tutti i dati salvati automaticamente su Google Drive in formato CSV
- 🔐 **Autenticazione OAuth2**: Login sicuro con Google

## 🏗️ Architettura

```
app_produttività/
├── client/                      # Frontend React + Vite
│   ├── src/
│   │   ├── App.jsx             # Componente principale
│   │   ├── services/
│   │   │   └── api.js          # Chiamate API al backend
│   │   ├── main.jsx            # Entry point
│   │   └── index.css           # Tailwind CSS
│   └── package.json
│
├── server/                      # Backend Node.js + Express
│   ├── src/
│   │   ├── index.js            # Server Express
│   │   ├── routes/
│   │   │   ├── auth.js         # OAuth2 Google
│   │   │   ├── calendar.js     # Google Calendar API
│   │   │   └── drive.js        # Google Drive API
│   │   ├── services/
│   │   │   ├── googleCalendar.js
│   │   │   └── googleDrive.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   └── utils/
│   │       ├── tokenStorage.js  # Salvataggio token su file
│   │       └── csvParser.js     # Parse/Write CSV
│   └── package.json
│
├── railway.json                 # Configurazione Railway
├── package.json                 # Scripts root
└── README.md
```

## 🚀 Setup Locale

### Prerequisiti

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- Account **Google Cloud** con API abilitate

### 1. Clona il Repository

```bash
git clone https://github.com/tuousername/app_produttività.git
cd app_produttività
```

### 2. Configura Google Cloud Console

1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuovo progetto o seleziona uno esistente
3. Abilita le seguenti API:
   - **Google Calendar API**
   - **Google Drive API**
4. Vai su **API & Services > Credentials**
5. Clicca **Create Credentials > OAuth 2.0 Client ID**
6. Seleziona **Web application**
7. Aggiungi gli **Authorized redirect URIs**:
   - `http://localhost:3000/auth/google/callback` (per sviluppo locale)
   - `https://your-app.railway.app/auth/google/callback` (per produzione)
8. Copia **Client ID** e **Client Secret**

### 3. Configura Environment Variables

Crea un file `.env` in `server/`:

```bash
cd server
cp .env.example .env
```

Modifica `server/.env`:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Google OAuth2 Credentials (dalla Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Session Secret (genera una stringa random sicura)
SESSION_SECRET=your-super-secret-session-key-change-this

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### 4. Installa Dipendenze

```bash
# Dalla root del progetto
npm install

# Oppure manualmente
cd server && npm install
cd ../client && npm install
```

### 5. Avvia in Modalità Sviluppo

```bash
# Dalla root - avvia sia backend che frontend
npm run dev

# Oppure separatamente:
# Terminal 1 - Backend
npm run dev:server

# Terminal 2 - Frontend
npm run dev:client
```

L'app sarà disponibile su:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000

### 6. Primo Login

1. Apri http://localhost:5173
2. Clicca su **"Connetti con Google"**
3. Autorizza l'accesso a Google Calendar e Drive
4. Verrai reindirizzato all'app dopo il login

## 📂 Struttura Dati su Google Drive

L'app crea automaticamente una cartella **"Planner"** su Google Drive con 4 file CSV:

### 1. planner-progetti.csv
Progetti a lungo termine con allocazione ore settimanale.

```csv
id,title,description,startDate,endDate,timeAllocation,completedSessions,completed
1234567890,"Sviluppo App","Descrizione progetto","2026-02-03","2026-03-15","1:2|3:4","{}",false
```

**Formato timeAllocation**: `day:hours|day:hours` (day: 0=Dom, 1=Lun, ..., 6=Sab)

### 2. planner-task.csv
Task giornalieri.

```csv
date,taskId,text,completed
2026-02-03,1708704000,"Completare report",true
```

### 3. planner-routine.csv
Routine personalizzate.

```csv
id,name,icon,days
1,"Yoga","🧘","1,3,5"
```

**Formato days**: Giorni della settimana separati da virgola (0=Dom, 1=Lun, ..., 6=Sab)

### 4. planner-progresso.csv
Tracking progresso giornaliero (sport, lettura, ore progetto).

```csv
date,type,projectId,value
2026-02-03,sport,,true
2026-02-03,lettura,,true
2026-02-03,project_hours,1234567890,3
```

## 🚂 Deploy su Railway

### 1. Crea Account Railway

1. Vai su [railway.app](https://railway.app)
2. Registrati/Accedi con GitHub

### 2. Deploy il Progetto

#### Opzione A: Da GitHub (Raccomandato)

1. Push del codice su GitHub:
   ```bash
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/tuousername/app_produttività.git
   git push -u origin main
   ```

2. Su Railway:
   - Clicca **"New Project"**
   - Seleziona **"Deploy from GitHub repo"**
   - Scegli il repository `app_produttività`
   - Railway rileverà automaticamente `railway.json`

#### Opzione B: Railway CLI

```bash
# Installa Railway CLI
npm install -g @railway/cli

# Login
railway login

# Inizializza progetto
railway init

# Deploy
railway up
```

### 3. Configura Environment Variables su Railway

Nel pannello di Railway, vai su **Variables** e aggiungi:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-app.railway.app/auth/google/callback
SESSION_SECRET=your-super-secret-session-key-change-this
NODE_ENV=production
FRONTEND_URL=https://your-app.railway.app
```

**⚠️ IMPORTANTE**: Dopo il deploy, Railway ti fornirà un URL (es. `https://your-app.railway.app`). Devi:
1. Aggiornare `GOOGLE_REDIRECT_URI` con questo URL
2. Aggiungere questo URL come **Authorized redirect URI** nella Google Cloud Console

### 4. Verifica Deploy

1. Apri l'URL fornito da Railway
2. Testa il login con Google
3. Verifica che i dati vengano salvati su Drive

## 🔧 Scripts Disponibili

### Root del Progetto

```bash
npm install           # Installa dipendenze di root
npm run install:all   # Installa dipendenze server + client
npm run dev           # Avvia server + client in parallelo
npm run dev:server    # Avvia solo il server
npm run dev:client    # Avvia solo il client
npm run build         # Build del frontend per produzione
npm start             # Avvia server in modalità produzione
```

### Server (`server/`)

```bash
npm start             # Avvia server (produzione)
npm run dev           # Avvia server con nodemon (sviluppo)
```

### Client (`client/`)

```bash
npm run dev           # Avvia Vite dev server
npm run build         # Build per produzione
npm run preview       # Preview del build
```

## 🔐 Sicurezza

- **OAuth2**: Autenticazione sicura tramite Google
- **Session Cookies**: Cookie HTTP-only con flag secure in produzione
- **Token Storage**: Token salvati in file escluso da git (uso personale)
- **CORS**: Configurato per accettare solo richieste dal frontend
- **Environment Variables**: Credenziali mai hardcoded nel codice

## 🐛 Troubleshooting

### Errore: "Redirect URI mismatch"

**Causa**: L'URL di callback non è configurato correttamente in Google Cloud Console.

**Soluzione**:
1. Vai su Google Cloud Console > Credentials
2. Modifica il tuo OAuth 2.0 Client ID
3. Aggiungi esattamente gli stessi URL che hai in `GOOGLE_REDIRECT_URI`

### Errore: "Token expired" o "Invalid token"

**Causa**: Il token di accesso è scaduto.

**Soluzione**: Il backend gestisce automaticamente il refresh del token. Se persiste:
1. Fai logout dall'app
2. Elimina `server/tokens.json`
3. Rifai il login

### Errore: "Cannot find module"

**Causa**: Dipendenze non installate.

**Soluzione**:
```bash
npm run install:all
```

### L'app non salva i dati

**Causa**: Possibile problema con i permessi di Google Drive.

**Soluzione**:
1. Verifica che lo scope `https://www.googleapis.com/auth/drive.file` sia incluso
2. Revoca l'accesso su https://myaccount.google.com/permissions
3. Rifai il login per riautorizzare

### Errore CORS in produzione

**Causa**: `FRONTEND_URL` non configurato correttamente.

**Soluzione**: Verifica che `FRONTEND_URL` su Railway corrisponda all'URL effettivo dell'app.

## 📱 Utilizzo

### Vista Settimana

- Mostra tutti i 7 giorni della settimana
- Eventi da Google Calendar
- Task per ogni giorno
- Sport/routine programmati
- Clicca su un giorno per vedere i dettagli

### Vista Giorno

- Eventi del giorno da Calendar
- Task da completare
- Progetti in corso con tracking ore
- Routine da completare (sport, lettura, ecc.)
- Aggiungi nuovi task rapidamente

### Vista Progetti

- Lista di tutti i progetti a lungo termine
- Aggiungi nuovi progetti con:
  - Titolo e descrizione
  - Date inizio/fine
  - Allocazione ore per ogni giorno della settimana
- Traccia progresso temporale e ore completate
- Gestisci routine personalizzate

### Auto-Save

L'app salva automaticamente i dati su Google Drive ogni **2 minuti**. Puoi anche forzare il salvataggio cliccando l'icona di refresh nell'header.

## 🤝 Contribuire

Questo è un progetto personale, ma se vuoi contribuire:

1. Fork del repository
2. Crea un branch per la feature (`git checkout -b feature/AmazingFeature`)
3. Commit delle modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📄 Licenza

MIT License - vedi [LICENSE](LICENSE) per dettagli.

## 👤 Autore

**Francesco Daddi**
- Email: francesc.daddi@gmail.com
- Timezone: Europe/Rome

## 🙏 Ringraziamenti

- [React](https://react.dev/) - Framework UI
- [Vite](https://vitejs.dev/) - Build tool
- [Express](https://expressjs.com/) - Backend framework
- [Google APIs](https://developers.google.com/) - Calendar & Drive integration
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide Icons](https://lucide.dev/) - Icone
- [Railway](https://railway.app/) - Hosting

---

**Made with ❤️ for personal productivity**
