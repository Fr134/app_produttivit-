import { google } from 'googleapis';
import { getAuthenticatedClient } from '../routes/auth.js';
import {
  parseCSV,
  toCSV,
  parseProgettiCSV,
  progettiToCSV,
  parseRoutineCSV,
  routineToCSV
} from '../utils/csvParser.js';

const FOLDER_NAME = 'Planner';

// Nomi dei file CSV
const CSV_FILES = {
  progetti: 'planner-progetti.csv',
  task: 'planner-task.csv',
  routine: 'planner-routine.csv',
  progresso: 'planner-progresso.csv'
};

// Template CSV per file vuoti
const CSV_TEMPLATES = {
  progetti: 'id,title,description,startDate,endDate,timeAllocation,completedSessions,completed\n',
  task: 'date,taskId,text,completed\n',
  routine: 'id,name,icon,days\n',
  progresso: 'date,type,projectId,value\n'
};

/**
 * Trova o crea la cartella Planner su Google Drive
 * @returns {string} ID della cartella
 */
async function getOrCreatePlannerFolder() {
  try {
    const auth = await getAuthenticatedClient();
    const drive = google.drive({ version: 'v3', auth });

    // Cerca la cartella esistente
    const searchResponse = await drive.files.list({
      q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      console.log(`📁 Cartella "${FOLDER_NAME}" trovata`);
      return searchResponse.data.files[0].id;
    }

    // Crea la cartella se non esiste
    console.log(`📁 Creazione cartella "${FOLDER_NAME}"...`);
    const createResponse = await drive.files.create({
      requestBody: {
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    });

    console.log(`✅ Cartella "${FOLDER_NAME}" creata`);
    return createResponse.data.id;
  } catch (error) {
    console.error('❌ Errore nella gestione della cartella:', error);
    throw new Error(`Drive folder error: ${error.message}`);
  }
}

/**
 * Trova un file CSV nella cartella Planner
 * @param {string} fileName - Nome del file
 * @param {string} folderId - ID della cartella
 * @returns {string|null} ID del file o null se non esiste
 */
async function findCSVFile(fileName, folderId) {
  try {
    const auth = await getAuthenticatedClient();
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
      q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    return null;
  } catch (error) {
    console.error(`❌ Errore nella ricerca del file ${fileName}:`, error);
    throw new Error(`Drive file search error: ${error.message}`);
  }
}

/**
 * Crea un nuovo file CSV nella cartella Planner
 * @param {string} fileName - Nome del file
 * @param {string} content - Contenuto CSV
 * @param {string} folderId - ID della cartella
 * @returns {string} ID del file creato
 */
async function createCSVFile(fileName, content, folderId) {
  try {
    const auth = await getAuthenticatedClient();
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: 'text/csv',
        parents: [folderId]
      },
      media: {
        mimeType: 'text/csv',
        body: content
      },
      fields: 'id'
    });

    console.log(`✅ File ${fileName} creato`);
    return response.data.id;
  } catch (error) {
    console.error(`❌ Errore nella creazione del file ${fileName}:`, error);
    throw new Error(`Drive file creation error: ${error.message}`);
  }
}

/**
 * Leggi un file CSV da Google Drive
 * @param {string} fileId - ID del file
 * @returns {string} Contenuto del file
 */
async function readCSVFile(fileId) {
  try {
    const auth = await getAuthenticatedClient();
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.get({
      fileId: fileId,
      alt: 'media'
    }, {
      responseType: 'text'
    });

    return response.data;
  } catch (error) {
    console.error(`❌ Errore nella lettura del file:`, error);
    throw new Error(`Drive file read error: ${error.message}`);
  }
}

/**
 * Aggiorna un file CSV su Google Drive
 * @param {string} fileId - ID del file
 * @param {string} content - Nuovo contenuto
 */
async function updateCSVFile(fileId, content) {
  try {
    const auth = await getAuthenticatedClient();
    const drive = google.drive({ version: 'v3', auth });

    await drive.files.update({
      fileId: fileId,
      media: {
        mimeType: 'text/csv',
        body: content
      }
    });

    console.log(`✅ File aggiornato`);
  } catch (error) {
    console.error(`❌ Errore nell'aggiornamento del file:`, error);
    throw new Error(`Drive file update error: ${error.message}`);
  }
}

/**
 * Ottieni o crea un file CSV
 * @param {string} fileName - Nome del file
 * @param {string} folderId - ID della cartella
 * @param {string} template - Template CSV iniziale
 * @returns {Object} { fileId, content }
 */
async function getOrCreateCSVFile(fileName, folderId, template) {
  let fileId = await findCSVFile(fileName, folderId);

  if (!fileId) {
    console.log(`📄 File ${fileName} non trovato, creazione in corso...`);
    fileId = await createCSVFile(fileName, template, folderId);
    return { fileId, content: template };
  }

  console.log(`📄 File ${fileName} trovato`);
  const content = await readCSVFile(fileId);
  return { fileId, content };
}

/**
 * Carica tutti i dati dai CSV
 * @returns {Object} { progetti, task, routine, progresso }
 */
export async function loadAllData() {
  try {
    console.log('📥 Caricamento dati da Google Drive...');

    const folderId = await getOrCreatePlannerFolder();

    // Carica tutti i file in parallelo
    const [progetti, task, routine, progresso] = await Promise.all([
      getOrCreateCSVFile(CSV_FILES.progetti, folderId, CSV_TEMPLATES.progetti),
      getOrCreateCSVFile(CSV_FILES.task, folderId, CSV_TEMPLATES.task),
      getOrCreateCSVFile(CSV_FILES.routine, folderId, CSV_TEMPLATES.routine),
      getOrCreateCSVFile(CSV_FILES.progresso, folderId, CSV_TEMPLATES.progresso)
    ]);

    // Parse dei CSV
    const data = {
      progetti: {
        fileId: progetti.fileId,
        data: parseProgettiCSV(progetti.content)
      },
      task: {
        fileId: task.fileId,
        data: parseCSV(task.content)
      },
      routine: {
        fileId: routine.fileId,
        data: parseRoutineCSV(routine.content)
      },
      progresso: {
        fileId: progresso.fileId,
        data: parseCSV(progresso.content)
      }
    };

    console.log('✅ Dati caricati con successo');
    return data;
  } catch (error) {
    console.error('❌ Errore nel caricamento dei dati:', error);
    throw error;
  }
}

/**
 * Salva i dati su Google Drive
 * @param {Object} data - { progetti, task, routine, progresso }
 */
export async function saveAllData(data) {
  try {
    console.log('💾 Salvataggio dati su Google Drive...');

    const folderId = await getOrCreatePlannerFolder();

    // Ottieni gli ID dei file
    const fileIds = {
      progetti: await findCSVFile(CSV_FILES.progetti, folderId),
      task: await findCSVFile(CSV_FILES.task, folderId),
      routine: await findCSVFile(CSV_FILES.routine, folderId),
      progresso: await findCSVFile(CSV_FILES.progresso, folderId)
    };

    // Se qualche file non esiste, crealo
    const updates = [];

    if (data.progetti) {
      const csv = progettiToCSV(data.progetti);
      if (fileIds.progetti) {
        updates.push(updateCSVFile(fileIds.progetti, csv));
      } else {
        updates.push(createCSVFile(CSV_FILES.progetti, csv, folderId));
      }
    }

    if (data.task) {
      const csv = toCSV(data.task, ['date', 'taskId', 'text', 'completed']);
      if (fileIds.task) {
        updates.push(updateCSVFile(fileIds.task, csv));
      } else {
        updates.push(createCSVFile(CSV_FILES.task, csv, folderId));
      }
    }

    if (data.routine) {
      const csv = routineToCSV(data.routine);
      if (fileIds.routine) {
        updates.push(updateCSVFile(fileIds.routine, csv));
      } else {
        updates.push(createCSVFile(CSV_FILES.routine, csv, folderId));
      }
    }

    if (data.progresso) {
      const csv = toCSV(data.progresso, ['date', 'type', 'projectId', 'value']);
      if (fileIds.progresso) {
        updates.push(updateCSVFile(fileIds.progresso, csv));
      } else {
        updates.push(createCSVFile(CSV_FILES.progresso, csv, folderId));
      }
    }

    // Esegui tutti gli aggiornamenti in parallelo
    await Promise.all(updates);

    console.log('✅ Dati salvati con successo');
  } catch (error) {
    console.error('❌ Errore nel salvataggio dei dati:', error);
    throw error;
  }
}
