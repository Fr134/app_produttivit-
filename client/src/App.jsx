import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, CheckSquare, Target, Book, Dumbbell, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, X, LogOut, RefreshCw, Edit2, Clock } from 'lucide-react';
import * as api from './services/api';

export default function App() {
  // Auth state
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Data state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('week'); // week, day, goals, plan
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [dailyTasks, setDailyTasks] = useState({});
  const [projects, setProjects] = useState([]);
  const [habits, setHabits] = useState({
    sport: { palestra: [1, 3, 5], corsa: [2, 4] },
    lettura: { target: 30, completed: {} },
    sportCompleted: {},
    customRoutines: []
  });
  const [workoutSheets, setWorkoutSheets] = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState({});
  const [timeBlocks, setTimeBlocks] = useState({});
  const [selectedWorkoutForDay, setSelectedWorkoutForDay] = useState({});
  const [workoutViewExpanded, setWorkoutViewExpanded] = useState({});

  // UI state
  const [newTask, setNewTask] = useState('');
  const [newProject, setNewProject] = useState({
    title: '',
    startDate: '',
    endDate: '',
    description: '',
    timeAllocation: [],
    completedSessions: {}
  });
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddRoutine, setShowAddRoutine] = useState(false);
  const [newRoutine, setNewRoutine] = useState({ name: '', days: [], icon: '🏃' });
  const [showAddWorkoutSheet, setShowAddWorkoutSheet] = useState(false);
  const [newWorkoutSheet, setNewWorkoutSheet] = useState({ nome: '', tipo: 'Palestra', descrizione: '', giorni: [], esercizi: [] });
  const [editingExercise, setEditingExercise] = useState({ nome: '', ripetizioni: '', recupero: '', pesoTarget: 0 });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Edit mode state
  const [editingRoutineId, setEditingRoutineId] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingWorkoutSheetId, setEditingWorkoutSheetId] = useState(null);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();

    // Check for OAuth callback parameters
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
      checkAuth();
    } else if (params.get('auth') === 'error') {
      setError('Errore durante l\'autenticazione con Google');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (authenticated) {
      loadData();
      loadCalendarEvents();
    }
  }, [authenticated]);

  // Auto-save every 2 minutes
  useEffect(() => {
    if (!authenticated) return;

    const interval = setInterval(() => {
      saveData();
    }, 2 * 60 * 1000); // 2 minuti

    return () => clearInterval(interval);
  }, [authenticated, projects, dailyTasks, habits, workoutSheets, workoutLogs, timeBlocks]);

  // Reload calendar events when date changes
  useEffect(() => {
    if (authenticated) {
      loadCalendarEvents();
    }
  }, [currentDate, authenticated]);

  async function checkAuth() {
    try {
      const result = await api.checkAuthStatus();
      setAuthenticated(result.authenticated);
    } catch (error) {
      console.error('Error checking auth:', error);
      setAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const result = await api.loadAllData();
      const { data } = result;

      // Load projects
      if (data.progetti && data.progetti.length > 0) {
        setProjects(data.progetti);
      }

      // Load tasks - convert to dailyTasks format
      if (data.task && data.task.length > 0) {
        const tasksMap = {};
        data.task.forEach(task => {
          if (!tasksMap[task.date]) {
            tasksMap[task.date] = [];
          }
          tasksMap[task.date].push({
            id: task.taskId,
            text: task.text,
            completed: task.completed
          });
        });
        setDailyTasks(tasksMap);
      }

      // Load routines
      if (data.routine && data.routine.length > 0) {
        setHabits(prev => ({
          ...prev,
          customRoutines: data.routine
        }));
      }

      // Load progresso (habit tracking)
      if (data.progresso && data.progresso.length > 0) {
        const sportCompleted = {};
        const letturaCompleted = {};

        data.progresso.forEach(item => {
          if (item.type === 'sport') {
            sportCompleted[item.date] = item.value;
          } else if (item.type === 'lettura') {
            letturaCompleted[item.date] = item.value;
          }
        });

        setHabits(prev => ({
          ...prev,
          sportCompleted,
          lettura: {
            ...prev.lettura,
            completed: letturaCompleted
          }
        }));
      }

      // Load workout sheets
      if (data.schede && data.schede.length > 0) {
        setWorkoutSheets(data.schede);
      }

      // Load workout logs
      if (data.allenamenti && data.allenamenti.length > 0) {
        const logsMap = {};
        data.allenamenti.forEach(log => {
          if (!logsMap[log.date]) {
            logsMap[log.date] = [];
          }
          logsMap[log.date].push(log);
        });
        setWorkoutLogs(logsMap);
      }

      // Load time blocks
      if (data.timeblocks && data.timeblocks.length > 0) {
        const blocksMap = {};
        data.timeblocks.forEach(block => {
          if (!blocksMap[block.date]) {
            blocksMap[block.date] = [];
          }
          blocksMap[block.date].push({
            id: block.blockId,
            startTime: block.startTime,
            endTime: block.endTime,
            activityType: block.activityType,
            activityId: block.activityId,
            title: block.title,
            notes: block.notes
          });
        });
        setTimeBlocks(blocksMap);
      }

      setLastSync(new Date());
      console.log('✅ Dati caricati con successo');
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Errore nel caricamento dei dati: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveData() {
    if (syncing) return;

    try {
      setSyncing(true);
      setError(null);

      // Convert dailyTasks to task array
      const taskArray = [];
      Object.entries(dailyTasks).forEach(([date, tasks]) => {
        tasks.forEach(task => {
          taskArray.push({
            date,
            taskId: task.id,
            text: task.text,
            completed: task.completed
          });
        });
      });

      // Convert progresso
      const progressoArray = [];
      Object.entries(habits.sportCompleted).forEach(([date, value]) => {
        progressoArray.push({
          date,
          type: 'sport',
          projectId: '',
          value
        });
      });
      Object.entries(habits.lettura.completed).forEach(([date, value]) => {
        progressoArray.push({
          date,
          type: 'lettura',
          projectId: '',
          value
        });
      });

      // Prepare allenamenti for save
      const allenamentiArray = [];
      Object.entries(workoutLogs).forEach(([date, dayLogs]) => {
        dayLogs.forEach(log => {
          if (log.pesoEseguito > 0 || log.ripetizioniEseguite > 0) {
            allenamentiArray.push({
              date,
              schedaId: log.schedaId,
              esercizioNome: log.esercizioNome,
              pesoEseguito: log.pesoEseguito || 0,
              ripetizioniEseguite: log.ripetizioniEseguite || 0
            });
          }
        });
      });

      await api.saveAllData({
        progetti: projects,
        task: taskArray,
        routine: habits.customRoutines,
        progresso: progressoArray,
        schede: workoutSheets,
        allenamenti: allenamentiArray,
        timeblocks: timeBlocks
      });

      setLastSync(new Date());
      console.log('✅ Dati salvati su Drive');
    } catch (error) {
      console.error('Error saving data:', error);
      setError('Errore nel salvataggio: ' + error.message);
    } finally {
      setSyncing(false);
    }
  }

  async function loadCalendarEvents() {
    try {
      setLoading(true);
      const weekDays = getWeekDays();
      const start = weekDays[0];
      const end = weekDays[6];

      const result = await api.getCalendarEvents(start, end);

      // Convert date strings to Date objects
      const events = result.events.map(event => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end)
      }));

      setCalendarEvents(events);
    } catch (error) {
      console.error('Error loading calendar events:', error);
      // Non mostrare errore per calendar (non critico)
    } finally {
      setLoading(false);
    }
  }

  // Time Blocks Management Functions
  function getTimeBlocksForDate(date) {
    const dateKey = date.toISOString().split('T')[0];
    return timeBlocks[dateKey] || [];
  }

  function saveTimeBlock(date, block) {
    const dateKey = date.toISOString().split('T')[0];
    const newBlock = {
      ...block,
      id: block.id || Date.now()
    };

    setTimeBlocks(prev => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []).filter(b => b.id !== newBlock.id), newBlock]
    }));

    return newBlock;
  }

  function deleteTimeBlock(date, blockId) {
    const dateKey = date.toISOString().split('T')[0];
    setTimeBlocks(prev => ({
      ...prev,
      [dateKey]: (prev[dateKey] || []).filter(b => b.id !== blockId)
    }));
  }

  function checkTimeOverlap(date, startTime, endTime, excludeBlockId = null) {
    const blocks = getTimeBlocksForDate(date);
    const events = getEventsForDate(date);

    // Convert time strings to minutes for comparison
    const toMinutes = (timeStr) => {
      const [hours, mins] = timeStr.split(':').map(Number);
      return hours * 60 + mins;
    };

    const newStart = toMinutes(startTime);
    const newEnd = toMinutes(endTime);

    // Check overlap with existing blocks
    for (const block of blocks) {
      if (block.id === excludeBlockId) continue;

      const blockStart = toMinutes(block.startTime);
      const blockEnd = toMinutes(block.endTime);

      if ((newStart >= blockStart && newStart < blockEnd) ||
          (newEnd > blockStart && newEnd <= blockEnd) ||
          (newStart <= blockStart && newEnd >= blockEnd)) {
        return true;
      }
    }

    // Check overlap with calendar events
    for (const event of events) {
      const eventStart = event.start.getHours() * 60 + event.start.getMinutes();
      const eventEnd = event.end.getHours() * 60 + event.end.getMinutes();

      if ((newStart >= eventStart && newStart < eventEnd) ||
          (newEnd > eventStart && newEnd <= eventEnd) ||
          (newStart <= eventStart && newEnd >= eventEnd)) {
        return true;
      }
    }

    return false;
  }

  function createBlockFromActivity(activityType, activityId, startTime, endTime) {
    let title = '';
    let notes = '';

    if (activityType === 'task') {
      const dateKey = selectedDate.toISOString().split('T')[0];
      const task = (dailyTasks[dateKey] || []).find(t => t.id === activityId);
      title = task ? task.text : 'Task';
    } else if (activityType === 'project') {
      const project = projects.find(p => p.id === activityId);
      title = project ? project.title : 'Progetto';
    } else if (activityType === 'routine') {
      const routine = habits.customRoutines.find(r => r.id === activityId);
      title = routine ? `${routine.icon} ${routine.name}` : 'Routine';
    }

    return {
      id: Date.now(),
      startTime,
      endTime,
      activityType,
      activityId,
      title,
      notes
    };
  }

  function getAvailableActivityCards(date) {
    const dateKey = date.toISOString().split('T')[0];
    const blocks = getTimeBlocksForDate(date);
    const cards = [];

    // 1. PROJECTS: split hours into 1h blocks + optional remainder
    const projectsForDay = getProjectsForDate(date);
    projectsForDay.forEach(project => {
      const hours = getProjectHoursForDate(project, date);
      const fullHours = Math.floor(hours);
      const remainder = +(hours - fullHours).toFixed(1);
      const placedCount = blocks.filter(b => b.activityType === 'project' && String(b.activityId) === String(project.id)).length;
      let totalCards = fullHours + (remainder > 0 ? 1 : 0);

      for (let i = placedCount; i < fullHours; i++) {
        cards.push({ type: 'project', id: project.id, title: project.title, duration: 1, cardIndex: i, color: 'purple' });
      }
      if (remainder > 0 && placedCount < totalCards) {
        cards.push({ type: 'project', id: project.id, title: project.title, duration: remainder, cardIndex: fullHours, color: 'purple' });
      }
    });

    // 2. ROUTINES without fixed time (1h default)
    const routines = getCustomRoutinesForDay(date);
    routines.forEach(routine => {
      const alreadyPlaced = blocks.some(b => b.activityType === 'routine' && String(b.activityId) === String(routine.id));
      if (!alreadyPlaced) {
        cards.push({ type: 'routine', id: routine.id, title: `${routine.icon} ${routine.name}`, duration: 1, color: 'amber' });
      }
    });

    // 3. DAILY TASKS not completed (1h default)
    const tasks = dailyTasks[dateKey] || [];
    tasks.filter(t => !t.completed).forEach(task => {
      const alreadyPlaced = blocks.some(b => b.activityType === 'task' && String(b.activityId) === String(task.id));
      if (!alreadyPlaced) {
        cards.push({ type: 'task', id: task.id, title: task.text, duration: 0.5, color: 'green' });
      }
    });

    return cards;
  }

  function handleTimeBlockDrop(e, slotTime) {
    e.preventDefault();
    setDragOverSlot(null);
    setIsDragging(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const [startH, startM] = slotTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const durationMinutes = data.duration * 60;
      const endMinutes = startMinutes + durationMinutes;
      if (endMinutes > 23 * 60) return;
      const endH = Math.floor(endMinutes / 60);
      const endM = endMinutes % 60;
      const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

      const excludeId = data.existingBlockId || null;
      if (checkTimeOverlap(selectedDate, slotTime, endTime, excludeId)) {
        return;
      }

      if (data.existingBlockId) {
        deleteTimeBlock(selectedDate, data.existingBlockId);
      }

      saveTimeBlock(selectedDate, {
        id: Date.now(),
        startTime: slotTime,
        endTime,
        activityType: data.type,
        activityId: data.id,
        title: data.title,
        notes: data.notes || ''
      });
    } catch (err) {
      // invalid drag data
    }
  }

  function handleLogout() {
    api.logout().then(() => {
      setAuthenticated(false);
      setCalendarEvents([]);
      setDailyTasks({});
      setProjects([]);
      setHabits({
        sport: { palestra: [1, 3, 5], corsa: [2, 4] },
        lettura: { target: 30, completed: {} },
        sportCompleted: {},
        customRoutines: []
      });
      api.clearLocalStorage();
    });
  }

  // Utility functions (unchanged from original)
  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  const formatDateFull = (date) => {
    return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getDayName = (date) => {
    return date.toLocaleDateString('it-IT', { weekday: 'short' });
  };

  const isSameDay = (date1, date2) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const getEventsForDate = (date) => {
    return calendarEvents.filter(event => isSameDay(new Date(event.start), date));
  };

  const getSportForDay = (date) => {
    const dayOfWeek = date.getDay();
    if (habits.sport.palestra.includes(dayOfWeek)) return 'Palestra';
    if (habits.sport.corsa.includes(dayOfWeek)) return 'Corsa';
    return null;
  };

  const addTask = (date) => {
    if (!newTask.trim()) return;
    const dateKey = date.toISOString().split('T')[0];
    setDailyTasks(prev => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), { id: Date.now(), text: newTask, completed: false }]
    }));
    setNewTask('');
  };

  const toggleTask = (date, taskId) => {
    const dateKey = date.toISOString().split('T')[0];
    setDailyTasks(prev => ({
      ...prev,
      [dateKey]: prev[dateKey].map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    }));
  };

  const toggleReadingHabit = (date) => {
    const dateKey = date.toISOString().split('T')[0];
    setHabits(prev => ({
      ...prev,
      lettura: {
        ...prev.lettura,
        completed: {
          ...prev.lettura.completed,
          [dateKey]: !prev.lettura.completed[dateKey]
        }
      }
    }));
  };

  const toggleSportCompleted = (date) => {
    const dateKey = date.toISOString().split('T')[0];
    setHabits(prev => ({
      ...prev,
      sportCompleted: {
        ...prev.sportCompleted,
        [dateKey]: !prev.sportCompleted[dateKey]
      }
    }));
  };

  const addCustomRoutine = () => {
    if (!newRoutine.name.trim() || newRoutine.days.length === 0) return;

    if (editingRoutineId) {
      // Update existing routine
      setHabits(prev => ({
        ...prev,
        customRoutines: prev.customRoutines.map(routine =>
          routine.id === editingRoutineId
            ? { ...newRoutine, id: editingRoutineId }
            : routine
        )
      }));
      setEditingRoutineId(null);
    } else {
      // Add new routine
      setHabits(prev => ({
        ...prev,
        customRoutines: [...prev.customRoutines, { ...newRoutine, id: Date.now() }]
      }));
    }

    setNewRoutine({ name: '', days: [], icon: '🏃' });
    setShowAddRoutine(false);
  };

  const toggleRoutineDay = (day) => {
    setNewRoutine(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const getCustomRoutinesForDay = (date) => {
    const dayOfWeek = date.getDay();
    return habits.customRoutines.filter(routine => routine.days.includes(dayOfWeek));
  };

  const addProject = () => {
    if (!newProject.title.trim() || !newProject.startDate || !newProject.endDate) return;

    if (editingProjectId) {
      // Update existing project
      setProjects(prev => prev.map(project =>
        project.id === editingProjectId
          ? { ...newProject, id: editingProjectId, completed: project.completed }
          : project
      ));
      setEditingProjectId(null);
    } else {
      // Add new project
      setProjects(prev => [...prev, { ...newProject, id: Date.now(), completed: false }]);
    }

    setNewProject({
      title: '',
      startDate: '',
      endDate: '',
      description: '',
      timeAllocation: [],
      completedSessions: {}
    });
    setShowAddProject(false);
  };

  const updateProjectTimeAllocation = (day, hours) => {
    setNewProject(prev => {
      const existing = prev.timeAllocation.find(t => t.day === day);
      if (existing) {
        if (hours === 0) {
          return {
            ...prev,
            timeAllocation: prev.timeAllocation.filter(t => t.day !== day)
          };
        }
        return {
          ...prev,
          timeAllocation: prev.timeAllocation.map(t =>
            t.day === day ? { day, hours } : t
          )
        };
      }
      if (hours > 0) {
        return {
          ...prev,
          timeAllocation: [...prev.timeAllocation, { day, hours }]
        };
      }
      return prev;
    });
  };

  const getProjectsForDate = (date) => {
    const dayOfWeek = date.getDay();
    return projects.filter(project => {
      if (project.completed) return false;
      const start = new Date(project.startDate);
      const end = new Date(project.endDate);
      const current = new Date(date);
      current.setHours(0, 0, 0, 0);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      if (current < start || current > end) return false;
      return project.timeAllocation.some(t => t.day === dayOfWeek);
    });
  };

  const getProjectHoursForDate = (project, date) => {
    const dayOfWeek = date.getDay();
    const allocation = project.timeAllocation.find(t => t.day === dayOfWeek);
    return allocation ? allocation.hours : 0;
  };

  const updateProjectProgress = (projectId, date, hoursCompleted) => {
    const dateKey = date.toISOString().split('T')[0];
    setProjects(prev => prev.map(project => {
      if (project.id === projectId) {
        return {
          ...project,
          completedSessions: {
            ...project.completedSessions,
            [dateKey]: hoursCompleted
          }
        };
      }
      return project;
    }));
  };

  // Workout sheets functions
  const getWorkoutSheetsForDay = (date) => {
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // 1=lunedì, 7=domenica
    return workoutSheets.filter(sheet => sheet.giorni && sheet.giorni.includes(dayOfWeek));
  };

  const getActiveWorkoutSheet = (date) => {
    const sheets = getWorkoutSheetsForDay(date);
    if (sheets.length === 1) return sheets[0];
    if (sheets.length > 1) {
      const dateKey = date.toISOString().split('T')[0];
      const selectedId = selectedWorkoutForDay[dateKey];
      return sheets.find(s => s.id === selectedId) || sheets[0]; // Default alla prima se non selezionata
    }
    return null;
  };

  const assignWorkoutToDay = (date, schedaId) => {
    const dateKey = date.toISOString().split('T')[0];
    setSelectedWorkoutForDay(prev => ({
      ...prev,
      [dateKey]: parseInt(schedaId)
    }));
  };

  const toggleWorkoutView = (dateKey) => {
    setWorkoutViewExpanded(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  const handleLogExercise = (date, schedaId, esercizioNome, campo, valore) => {
    const dateKey = date.toISOString().split('T')[0];

    setWorkoutLogs(prev => {
      const currentLogs = prev[dateKey] || [];
      const existingLogIndex = currentLogs.findIndex(l =>
        l.schedaId === schedaId && l.esercizioNome === esercizioNome
      );

      if (existingLogIndex >= 0) {
        const newLogs = [...currentLogs];
        newLogs[existingLogIndex] = {
          ...newLogs[existingLogIndex],
          [campo]: parseFloat(valore) || 0
        };
        return { ...prev, [dateKey]: newLogs };
      } else {
        return {
          ...prev,
          [dateKey]: [
            ...currentLogs,
            {
              date: dateKey,
              schedaId,
              esercizioNome,
              pesoEseguito: campo === 'pesoEseguito' ? parseFloat(valore) || 0 : 0,
              ripetizioniEseguite: campo === 'ripetizioniEseguite' ? parseFloat(valore) || 0 : 0
            }
          ]
        };
      }
    });
  };

  const addExerciseToSheet = () => {
    if (!editingExercise.nome.trim()) return;
    setNewWorkoutSheet(prev => ({
      ...prev,
      esercizi: [...prev.esercizi, { ...editingExercise }]
    }));
    setEditingExercise({ nome: '', ripetizioni: '', recupero: '', pesoTarget: 0 });
  };

  const removeExerciseFromSheet = (index) => {
    setNewWorkoutSheet(prev => ({
      ...prev,
      esercizi: prev.esercizi.filter((_, i) => i !== index)
    }));
  };

  const addWorkoutSheet = () => {
    // Validation
    const errors = {};
    if (!newWorkoutSheet.nome.trim()) errors.nome = 'Il nome è obbligatorio';
    if (newWorkoutSheet.esercizi.length === 0) errors.esercizi = 'Aggiungi almeno un esercizio';
    if (newWorkoutSheet.giorni.length === 0) errors.giorni = 'Seleziona almeno un giorno';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (editingWorkoutSheetId) {
      // Update existing sheet
      setWorkoutSheets(prev => prev.map(sheet =>
        sheet.id === editingWorkoutSheetId
          ? { ...newWorkoutSheet, id: editingWorkoutSheetId }
          : sheet
      ));
      setEditingWorkoutSheetId(null);
    } else {
      // Add new sheet
      setWorkoutSheets(prev => [...prev, { ...newWorkoutSheet, id: Date.now() }]);
    }

    setNewWorkoutSheet({ nome: '', tipo: 'Palestra', descrizione: '', giorni: [], esercizi: [] });
    setShowAddWorkoutSheet(false);
    setValidationErrors({});
  };

  const toggleDaySelection = (day) => {
    setNewWorkoutSheet(prev => ({
      ...prev,
      giorni: prev.giorni.includes(day)
        ? prev.giorni.filter(d => d !== day)
        : [...prev.giorni, day].sort((a, b) => a - b)
    }));
  };

  // Edit handlers
  const startEditWorkoutSheet = (sheet) => {
    setNewWorkoutSheet({
      nome: sheet.nome,
      tipo: sheet.tipo,
      descrizione: sheet.descrizione,
      giorni: sheet.giorni,
      esercizi: sheet.esercizi
    });
    setEditingWorkoutSheetId(sheet.id);
    setShowAddWorkoutSheet(true);
    setValidationErrors({});
  };

  const startEditRoutine = (routine) => {
    setNewRoutine({
      name: routine.name,
      days: routine.days,
      icon: routine.icon
    });
    setEditingRoutineId(routine.id);
    setShowAddRoutine(true);
  };

  const startEditProject = (project) => {
    setNewProject({
      title: project.title,
      description: project.description,
      startDate: project.startDate,
      endDate: project.endDate,
      timeAllocation: project.timeAllocation,
      completedSessions: project.completedSessions
    });
    setEditingProjectId(project.id);
    setShowAddProject(true);
  };

  // Workout Sheet View Component
  function WorkoutSheetView({ sheet, logs, date, onLogExercise }) {
    const [localLogs, setLocalLogs] = useState({});

    useEffect(() => {
      const logsMap = {};
      logs.forEach(log => {
        logsMap[log.esercizioNome] = {
          pesoEseguito: log.pesoEseguito,
          ripetizioniEseguite: log.ripetizioniEseguite
        };
      });
      setLocalLogs(logsMap);
    }, [logs]);

    const handleInputChange = (esercizioNome, campo, valore) => {
      setLocalLogs(prev => ({
        ...prev,
        [esercizioNome]: {
          ...(prev[esercizioNome] || {}),
          [campo]: valore
        }
      }));
      onLogExercise(date, sheet.id, esercizioNome, campo, valore);
    };

    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between mb-3 px-2">
          <div>
            <h4 className="font-bold text-sm text-slate-800" style={{ fontFamily: "'Libre Baskerville', serif" }}>{sheet.nome}</h4>
            {sheet.descrizione && (
              <p className="text-xs text-slate-500" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>{sheet.descrizione}</p>
            )}
          </div>
        </div>

        {sheet.esercizi.map((ex, i) => {
          const log = localLogs[ex.nome] || {};

          return (
            <div key={i} className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate text-slate-800" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>{ex.nome}</div>
                  <div className="text-xs text-slate-600 mt-1" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                    Target: {ex.ripetizioni} reps - {ex.recupero} recupero
                  </div>
                  {ex.pesoTarget > 0 && (
                    <div className="text-xs text-slate-500" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                      Peso suggerito: {ex.pesoTarget}kg
                    </div>
                  )}
                </div>

                <div className="flex gap-2 items-center">
                  <div className="flex flex-col gap-1">
                    <input
                      type="number"
                      placeholder="Peso"
                      value={log.pesoEseguito || ''}
                      onChange={(e) => handleInputChange(ex.nome, 'pesoEseguito', e.target.value)}
                      className="w-16 px-2 py-1 text-xs rounded border border-slate-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                    />
                    <span className="text-xs text-slate-400 text-center" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>kg</span>
                  </div>
                  <span className="text-slate-400">×</span>
                  <div className="flex flex-col gap-1">
                    <input
                      type="number"
                      placeholder="Reps"
                      value={log.ripetizioniEseguite || ''}
                      onChange={(e) => handleInputChange(ex.nome, 'ripetizioniEseguite', e.target.value)}
                      className="w-16 px-2 py-1 text-xs rounded border border-slate-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                    />
                    <span className="text-xs text-slate-400 text-center" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>reps</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Login screen
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-200 mx-auto mb-6">
            <Calendar className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent mb-4" style={{ fontFamily: "'Libre Baskerville', serif" }}>
            Il Mio Planner
          </h1>
          <p className="text-slate-600 mb-8" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
            Organizza la tua settimana con Google Calendar e Drive
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={() => api.loginWithGoogle()}
            className="w-full px-6 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 font-semibold flex items-center justify-center gap-3"
            style={{ fontFamily: "'Source Sans 3', sans-serif" }}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Connetti con Google
          </button>

          <p className="text-xs text-slate-400 mt-6" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
            Accesso sicuro tramite OAuth2. I tuoi dati sono salvati su Google Drive.
          </p>
        </div>
      </div>
    );
  }

  const weekDays = getWeekDays();
  const dateKey = selectedDate.toISOString().split('T')[0];
  const tasksForDate = dailyTasks[dateKey] || [];
  const eventsForDate = getEventsForDate(selectedDate);
  const sportForDate = getSportForDay(selectedDate);
  const readingCompleted = habits.lettura.completed[dateKey];
  const sportCompleted = habits.sportCompleted[dateKey];
  const customRoutines = getCustomRoutinesForDay(selectedDate);
  const projectsForDate = getProjectsForDate(selectedDate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                  Il Mio Planner
                </h1>
                <p className="text-sm text-slate-500" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                  {lastSync ? `Ultimo salvataggio: ${lastSync.toLocaleTimeString('it-IT')}` : 'Organizza la tua settimana'}
                  {syncing && ' - Salvataggio...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('week')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  view === 'week'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                style={{ fontFamily: "'Source Sans 3', sans-serif" }}
              >
                Settimana
              </button>
              <button
                onClick={() => setView('day')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  view === 'day'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                style={{ fontFamily: "'Source Sans 3', sans-serif" }}
              >
                Giorno
              </button>
              <button
                onClick={() => setView('goals')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  view === 'goals'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                style={{ fontFamily: "'Source Sans 3', sans-serif" }}
              >
                Progetti
              </button>
              <button
                onClick={() => setView('plan')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  view === 'plan'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                style={{ fontFamily: "'Source Sans 3', sans-serif" }}
              >
                Piano Giornata
              </button>
              <button
                onClick={saveData}
                disabled={syncing}
                className="p-2 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
                title="Salva ora"
              >
                <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Rest of the UI - same as original planning-app.jsx */}
        {view === 'week' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-slate-800" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                Settimana del {formatDate(weekDays[0])} - {formatDate(weekDays[6])}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setDate(newDate.getDate() - 7);
                    setCurrentDate(newDate);
                  }}
                  className="p-2 rounded-xl bg-white hover:bg-slate-50 transition-all shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 transition-all shadow-sm font-medium text-slate-600"
                  style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                >
                  Oggi
                </button>
                <button
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setDate(newDate.getDate() + 7);
                    setCurrentDate(newDate);
                  }}
                  className="p-2 rounded-xl bg-white hover:bg-slate-50 transition-all shadow-sm"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-4">
              {weekDays.map((day, index) => {
                const events = getEventsForDate(day);
                const sport = getSportForDay(day);
                const isToday = isSameDay(day, new Date());
                const dayKey = day.toISOString().split('T')[0];
                const dayTasks = dailyTasks[dayKey] || [];

                return (
                  <div
                    key={index}
                    onClick={() => {
                      setSelectedDate(day);
                      setView('day');
                    }}
                    className={`bg-white rounded-2xl p-4 cursor-pointer transition-all hover:shadow-xl hover:scale-105 ${
                      isToday ? 'ring-2 ring-indigo-500 shadow-lg' : 'shadow-sm'
                    }`}
                  >
                    <div className="text-center mb-3">
                      <div className={`text-sm font-semibold ${isToday ? 'text-indigo-600' : 'text-slate-500'}`} style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                        {getDayName(day).toUpperCase()}
                      </div>
                      <div className={`text-2xl font-bold ${isToday ? 'text-indigo-600' : 'text-slate-800'}`} style={{ fontFamily: "'Libre Baskerville', serif" }}>
                        {day.getDate()}
                      </div>
                    </div>

                    {sport && (
                      <div className="mb-2 px-2 py-1 bg-green-50 rounded-lg flex items-center gap-1">
                        <Dumbbell className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-700 font-medium" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>{sport}</span>
                      </div>
                    )}

                    {events.map(event => (
                      <div key={event.id} className="mb-2 px-2 py-1 bg-blue-50 rounded-lg">
                        <div className="text-xs text-blue-700 font-medium truncate" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                          {event.start.getHours()}:{event.start.getMinutes().toString().padStart(2, '0')} {event.title}
                        </div>
                      </div>
                    ))}

                    <div className="text-xs text-slate-500 mt-2" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                      {dayTasks.filter(t => t.completed).length}/{dayTasks.length} task
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sport routine weekly view */}
            <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                <Dumbbell className="w-6 h-6 text-green-600" />
                Routine Sport Settimanale
              </h3>
              <div className="grid grid-cols-7 gap-4">
                {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day, index) => {
                  const dayNum = index === 6 ? 0 : index + 1;
                  let activity = 'Riposo';
                  if (habits.sport.palestra.includes(dayNum)) activity = 'Palestra';
                  if (habits.sport.corsa.includes(dayNum)) activity = 'Corsa';

                  return (
                    <div key={index} className="text-center">
                      <div className="text-sm font-semibold text-slate-600 mb-2" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>{day}</div>
                      <div className={`px-3 py-2 rounded-xl text-sm font-medium ${
                        activity === 'Palestra' ? 'bg-green-100 text-green-700' :
                        activity === 'Corsa' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`} style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                        {activity}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Vista Giorno */}
        {view === 'day' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-slate-800" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                {formatDateFull(selectedDate)}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(newDate.getDate() - 1);
                    setSelectedDate(newDate);
                  }}
                  className="p-2 rounded-xl bg-white hover:bg-slate-50 transition-all shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 transition-all shadow-sm font-medium text-slate-600"
                  style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                >
                  Oggi
                </button>
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(newDate.getDate() + 1);
                    setSelectedDate(newDate);
                  }}
                  className="p-2 rounded-xl bg-white hover:bg-slate-50 transition-all shadow-sm"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sport e Routine */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-green-800 flex items-center gap-2" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                    <Dumbbell className="w-5 h-5" />
                    Routine Quotidiana
                  </h3>
                  <button
                    onClick={() => setShowAddRoutine(true)}
                    className="text-green-700 hover:text-green-800 p-1"
                    title="Aggiungi routine personalizzata"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {sportForDate && (
                  <div className="bg-white rounded-xl mb-3">
                    <div
                      onClick={() => toggleSportCompleted(selectedDate)}
                      className="flex items-center gap-3 p-4 cursor-pointer hover:bg-green-50 transition-all"
                    >
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                        sportCompleted ? 'bg-green-600 border-green-600' : 'border-slate-300'
                      }`}>
                        {sportCompleted && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <div>
                        <div className="font-medium text-slate-700" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                          {sportForDate}
                        </div>
                        <div className="text-sm text-slate-500" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                          {sportCompleted ? 'Completato! 💪' : 'Da fare'}
                        </div>
                      </div>
                    </div>

                    {sportCompleted && (
                      <div className="px-4 pb-4 border-t border-slate-100">
                        {getWorkoutSheetsForDay(selectedDate).length > 1 && (
                          <select
                            value={selectedWorkoutForDay[dateKey] || ''}
                            onChange={(e) => assignWorkoutToDay(selectedDate, e.target.value)}
                            className="w-full mt-3 mb-2 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                            style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                          >
                            <option value="">Seleziona scheda...</option>
                            {getWorkoutSheetsForDay(selectedDate).map(sheet => (
                              <option key={sheet.id} value={sheet.id}>{sheet.nome}</option>
                            ))}
                          </select>
                        )}

                        {getActiveWorkoutSheet(selectedDate) && (
                          <>
                            <button
                              onClick={() => toggleWorkoutView(dateKey)}
                              className="text-sm text-green-700 flex items-center gap-2 w-full justify-center py-2 hover:bg-green-50 rounded-lg transition-all mt-2"
                              style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                            >
                              {workoutViewExpanded[dateKey] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              {workoutViewExpanded[dateKey] ? 'Nascondi' : 'Vedi'} Scheda di Allenamento
                            </button>

                            {workoutViewExpanded[dateKey] && (
                              <WorkoutSheetView
                                sheet={getActiveWorkoutSheet(selectedDate)}
                                logs={workoutLogs[dateKey] || []}
                                date={selectedDate}
                                onLogExercise={handleLogExercise}
                              />
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {customRoutines.map(routine => {
                  const routineKey = `routine_${routine.id}_${dateKey}`;
                  const isCompleted = habits.sportCompleted[routineKey];

                  return (
                    <div
                      key={routine.id}
                      onClick={() => {
                        setHabits(prev => ({
                          ...prev,
                          sportCompleted: {
                            ...prev.sportCompleted,
                            [routineKey]: !isCompleted
                          }
                        }));
                      }}
                      className="flex items-center gap-3 p-4 bg-white rounded-xl cursor-pointer hover:bg-green-50 transition-all mb-3"
                    >
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                        isCompleted ? 'bg-green-600 border-green-600' : 'border-slate-300'
                      }`}>
                        {isCompleted && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <div>
                        <div className="font-medium text-slate-700" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                          {routine.icon} {routine.name}
                        </div>
                        <div className="text-sm text-slate-500" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                          {isCompleted ? 'Completato! ✓' : 'Da fare'}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {!sportForDate && customRoutines.length === 0 && (
                  <div className="text-center py-4 text-slate-500" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                    Nessuna routine per oggi
                  </div>
                )}
              </div>

              {/* Eventi Google Calendar */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 shadow-sm lg:col-span-2">
                <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                  <Calendar className="w-5 h-5" />
                  Eventi dal Calendario
                </h3>
                {loading ? (
                  <div className="text-slate-500" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>Caricamento eventi...</div>
                ) : eventsForDate.length === 0 ? (
                  <div className="text-slate-500" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>Nessun evento programmato</div>
                ) : (
                  <div className="space-y-3">
                    {eventsForDate.map(event => (
                      <div key={event.id} className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="bg-indigo-100 rounded-lg px-3 py-2 text-center">
                            <div className="text-xs font-semibold text-indigo-600" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                              {event.start.getHours()}:{event.start.getMinutes().toString().padStart(2, '0')}
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-800" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>{event.title}</h4>
                            {event.attendees && event.attendees.length > 0 && (
                              <p className="text-sm text-slate-600 mt-1" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                                Con: {event.attendees.join(', ')}
                              </p>
                            )}
                            {event.location && (
                              <p className="text-sm text-slate-500 mt-1" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>📍 {event.location}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Progetti del Giorno */}
              {projectsForDate.length > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 shadow-sm lg:col-span-3">
                  <h3 className="text-lg font-bold text-purple-800 mb-4 flex items-center gap-2" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                    <Target className="w-5 h-5" />
                    Progetti in Corso
                  </h3>
                  <div className="space-y-3">
                    {projectsForDate.map(project => {
                      const plannedHours = getProjectHoursForDate(project, selectedDate);
                      const completedHours = project.completedSessions[dateKey] || 0;

                      return (
                        <div key={project.id} className="bg-white rounded-xl p-4 shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-bold text-slate-800 text-lg" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                                {project.title}
                              </h4>
                              {project.description && (
                                <p className="text-sm text-slate-600 mt-1" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                                  {project.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-purple-700" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                                  Ore pianificate oggi: {plannedHours}h
                                </span>
                                <span className="text-sm text-slate-600" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                                  {completedHours}/{plannedHours}h
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div
                                  className="bg-purple-600 h-2 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, (completedHours / plannedHours) * 100)}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex gap-1 flex-wrap">
                              {[...Array(Math.round(plannedHours * 2))].map((_, i) => {
                                const hourValue = (i + 1) * 0.5;
                                return (
                                  <button
                                    key={i}
                                    onClick={() => {
                                      const newCompleted = hourValue === completedHours ? hourValue - 0.5 : hourValue;
                                      updateProjectProgress(project.id, selectedDate, newCompleted);
                                    }}
                                    className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${
                                      hourValue <= completedHours
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                    }`}
                                    style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                                  >
                                    {hourValue}h
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Task del Giorno */}
              <div className="bg-white rounded-2xl p-6 shadow-sm lg:col-span-2">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                  <CheckSquare className="w-5 h-5 text-indigo-600" />
                  Task del Giorno
                </h3>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTask(selectedDate)}
                    placeholder="Aggiungi un nuovo task..."
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                  />
                  <button
                    onClick={() => addTask(selectedDate)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {tasksForDate.length === 0 ? (
                    <p className="text-slate-400 text-center py-4" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>Nessun task per oggi</p>
                  ) : (
                    tasksForDate.map(task => (
                      <div
                        key={task.id}
                        onClick={() => toggleTask(selectedDate, task.id)}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-all"
                      >
                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center ${
                          task.completed ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                        }`}>
                          {task.completed && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`flex-1 ${task.completed ? 'line-through text-slate-400' : 'text-slate-700'}`} style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                          {task.text}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Lettura */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-amber-800 mb-4 flex items-center gap-2" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                  <Book className="w-5 h-5" />
                  Lettura Quotidiana
                </h3>
                <div
                  onClick={() => toggleReadingHabit(selectedDate)}
                  className="flex items-center gap-3 p-4 bg-white rounded-xl cursor-pointer hover:bg-amber-50 transition-all"
                >
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                    readingCompleted ? 'bg-amber-600 border-amber-600' : 'border-slate-300'
                  }`}>
                    {readingCompleted && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <div className="font-medium text-slate-700" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                      Leggere {habits.lettura.target} pagine
                    </div>
                    <div className="text-sm text-slate-500" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                      {readingCompleted ? 'Completato! 📚' : 'Da fare'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Blocking Section */}
              <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-6 shadow-sm lg:col-span-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                    <Clock className="w-5 h-5" />
                    Time Blocking
                  </h3>
                </div>

                {/* Draggable Activity Cards */}
                {(() => {
                  const availableCards = getAvailableActivityCards(selectedDate);
                  const colorMap = {
                    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500', label: 'Progetti' },
                    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Routine' },
                    green: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Task' }
                  };
                  return (
                    <div className="mb-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                        Attività da pianificare
                      </div>
                      {availableCards.length === 0 ? (
                        <div className="text-sm text-slate-400 italic py-2">Tutte le attività sono state pianificate!</div>
                      ) : (
                        <div className="space-y-3">
                          {['purple', 'amber', 'green'].map(colorKey => {
                            const cardsOfType = availableCards.filter(c => c.color === colorKey);
                            if (cardsOfType.length === 0) return null;
                            const c = colorMap[colorKey];
                            return (
                              <div key={colorKey}>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{c.label}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {cardsOfType.map((card, idx) => (
                                    <div
                                      key={`${card.type}-${card.id}-${card.cardIndex || idx}`}
                                      draggable="true"
                                      onDragStart={(e) => {
                                        e.dataTransfer.setData('text/plain', JSON.stringify(card));
                                        e.dataTransfer.effectAllowed = 'move';
                                        setIsDragging(true);
                                      }}
                                      onDragEnd={() => { setIsDragging(false); setDragOverSlot(null); }}
                                      className={`${c.bg} ${c.border} border rounded-xl px-3 py-2 cursor-grab active:cursor-grabbing select-none hover:shadow-md transition-all hover:scale-105`}
                                    >
                                      <div className={`text-sm font-medium ${c.text}`}>{card.title}</div>
                                      <div className={`text-[11px] ${c.text} opacity-60`}>
                                        {card.duration >= 1 ? `${card.duration}h` : `${card.duration * 60}min`}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Timeline - 30min slots with calendar-style layout */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="flex">
                    {/* Time labels column */}
                    <div className="w-14 flex-shrink-0 bg-slate-50/50">
                      {Array.from({ length: 34 }, (_, i) => {
                        const h = 6 + Math.floor(i / 2);
                        const m = (i % 2) * 30;
                        return (
                          <div key={i} style={{ height: '40px' }} className="flex items-start justify-end pr-2 pt-0.5">
                            {m === 0 && (
                              <span className="text-[11px] font-medium text-slate-400">{`${h.toString().padStart(2, '0')}:00`}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Timeline content area */}
                    <div className="flex-1 relative" style={{ height: `${34 * 40}px` }}>
                      {/* Grid lines */}
                      {Array.from({ length: 34 }, (_, i) => {
                        const m = (i % 2) * 30;
                        return (
                          <div
                            key={`grid-${i}`}
                            className={`absolute w-full border-t ${m === 0 ? 'border-slate-200' : 'border-slate-100 border-dashed'}`}
                            style={{ top: `${i * 40}px`, height: '40px' }}
                          />
                        );
                      })}

                      {/* Calendar Events (absolute positioned) */}
                      {getEventsForDate(selectedDate).map(event => {
                        const startMin = event.start.getHours() * 60 + event.start.getMinutes();
                        const endMin = event.end.getHours() * 60 + event.end.getMinutes();
                        const topOffset = ((startMin - 360) / 30) * 40;
                        const blockHeight = ((endMin - startMin) / 30) * 40;
                        if (startMin < 360 || startMin >= 1380) return null;
                        return (
                          <div
                            key={`cal-${event.id}`}
                            className="absolute left-1 right-2 rounded-lg overflow-hidden z-10 flex"
                            style={{ top: `${topOffset + 1}px`, height: `${Math.max(blockHeight - 2, 24)}px`, background: 'linear-gradient(135deg, #dbeafe, #eff6ff)' }}
                          >
                            <div className="w-1 bg-blue-500 flex-shrink-0" />
                            <div className="flex-1 px-2 py-1 min-w-0">
                              <div className="text-xs font-semibold text-blue-800 truncate">{event.title}</div>
                              {blockHeight > 30 && (
                                <div className="text-[10px] text-blue-600">
                                  {event.start.getHours()}:{event.start.getMinutes().toString().padStart(2, '0')} - {event.end.getHours()}:{event.end.getMinutes().toString().padStart(2, '0')}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* User Time Blocks (absolute positioned, draggable for repositioning) */}
                      {getTimeBlocksForDate(selectedDate).map(block => {
                        const [sH, sM] = block.startTime.split(':').map(Number);
                        const [eH, eM] = block.endTime.split(':').map(Number);
                        const startMin = sH * 60 + sM;
                        const endMin = eH * 60 + eM;
                        const topOffset = ((startMin - 360) / 30) * 40;
                        const blockHeight = ((endMin - startMin) / 30) * 40;
                        const blockColors = {
                          project: { bg: 'linear-gradient(135deg, #f3e8ff, #faf5ff)', border: 'border-purple-200', text: 'text-purple-800', accent: 'bg-purple-500', sub: 'text-purple-600' },
                          routine: { bg: 'linear-gradient(135deg, #fef3c7, #fffbeb)', border: 'border-amber-200', text: 'text-amber-800', accent: 'bg-amber-500', sub: 'text-amber-600' },
                          task: { bg: 'linear-gradient(135deg, #d1fae5, #ecfdf5)', border: 'border-emerald-200', text: 'text-emerald-800', accent: 'bg-emerald-500', sub: 'text-emerald-600' }
                        };
                        const bc = blockColors[block.activityType] || blockColors.task;
                        return (
                          <div
                            key={block.id}
                            className={`absolute left-1 right-2 border ${bc.border} rounded-lg overflow-hidden cursor-grab active:cursor-grabbing group z-10 flex shadow-sm hover:shadow-md transition-shadow`}
                            style={{ top: `${topOffset + 1}px`, height: `${Math.max(blockHeight - 2, 24)}px`, background: bc.bg }}
                            draggable="true"
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', JSON.stringify({
                                type: block.activityType,
                                id: block.activityId,
                                title: block.title,
                                duration: (endMin - startMin) / 60,
                                existingBlockId: block.id,
                                notes: block.notes
                              }));
                              e.dataTransfer.effectAllowed = 'move';
                              setIsDragging(true);
                            }}
                            onDragEnd={() => { setIsDragging(false); setDragOverSlot(null); }}
                          >
                            <div className={`w-1 ${bc.accent} flex-shrink-0`} />
                            <div className="flex-1 px-2 py-1 min-w-0">
                              <div className={`text-xs font-semibold ${bc.text} truncate`}>{block.title}</div>
                              {blockHeight > 30 && (
                                <div className={`text-[10px] ${bc.sub} opacity-70`}>
                                  {block.startTime} - {block.endTime}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteTimeBlock(selectedDate, block.id); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity px-1.5 text-red-400 hover:text-red-600 flex-shrink-0 self-center"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Drop zone overlay (only visible during drag - captures all drag events) */}
                      {isDragging && (
                        <div className="absolute inset-0 z-20">
                          {Array.from({ length: 34 }, (_, i) => {
                            const h = 6 + Math.floor(i / 2);
                            const m = (i % 2) * 30;
                            const slotTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                            const isTarget = dragOverSlot === slotTime;
                            return (
                              <div
                                key={`drop-${i}`}
                                className={`transition-colors ${isTarget ? 'bg-indigo-100/60' : ''}`}
                                style={{ height: '40px' }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'move';
                                  if (dragOverSlot !== slotTime) setDragOverSlot(slotTime);
                                }}
                                onDragLeave={(e) => {
                                  if (!e.currentTarget.contains(e.relatedTarget)) setDragOverSlot(null);
                                }}
                                onDrop={(e) => handleTimeBlockDrop(e, slotTime)}
                              >
                                {isTarget && (
                                  <div className="h-full flex items-center justify-center text-xs text-indigo-500 font-medium pointer-events-none">
                                    Rilascia qui
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-400 italic">
                  Trascina le attività negli slot per pianificare. Puoi spostare i blocchi già posizionati trascinandoli in un nuovo orario.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vista Progetti */}
        {view === 'goals' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-slate-800" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                Progetti a Lungo Termine
              </h2>
              <button
                onClick={() => setShowAddProject(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                style={{ fontFamily: "'Source Sans 3', sans-serif" }}
              >
                <Plus className="w-5 h-5" />
                Nuovo Progetto
              </button>
            </div>

            {/* Sezione Routine Personalizzate */}
            <div className="mb-8 bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-800" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                  Routine Personalizzate
                </h3>
                <button
                  onClick={() => setShowAddRoutine(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all flex items-center gap-2"
                  style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                >
                  <Plus className="w-5 h-5" />
                  Nuova Routine
                </button>
              </div>

              {habits.customRoutines.length === 0 ? (
                <p className="text-slate-400 text-center py-4" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                  Nessuna routine personalizzata. Aggiungine una!
                </p>
              ) : (
                <div className="grid gap-3">
                  {habits.customRoutines.map(routine => (
                    <div key={routine.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                      <div className="text-2xl">{routine.icon}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                          {routine.name}
                        </div>
                        <div className="text-sm text-slate-500" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                          {routine.days.map(d => ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'][d]).join(', ')}
                        </div>
                      </div>
                      <button
                        onClick={() => startEditRoutine(routine)}
                        className="text-blue-500 hover:text-blue-700 p-2"
                        title="Modifica routine"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setHabits(prev => ({
                            ...prev,
                            customRoutines: prev.customRoutines.filter(r => r.id !== routine.id)
                          }));
                        }}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sezione Schede di Allenamento */}
            <div className="mb-8 bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-800" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                  Schede di Allenamento
                </h3>
                <button
                  onClick={() => setShowAddWorkoutSheet(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all flex items-center gap-2"
                  style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                >
                  <Plus className="w-5 h-5" />
                  Nuova Scheda
                </button>
              </div>

              {workoutSheets.length === 0 ? (
                <p className="text-slate-400 text-center py-4" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                  Nessuna scheda di allenamento. Creane una!
                </p>
              ) : (
                <div className="grid gap-3">
                  {workoutSheets.map(sheet => (
                    <div key={sheet.id} className="p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 text-lg" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                              {sheet.nome}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-lg font-medium ${
                              sheet.tipo === 'Palestra' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                            }`} style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                              {sheet.tipo}
                            </span>
                          </div>
                          {sheet.descrizione && (
                            <div className="text-sm text-slate-600 mt-1" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                              {sheet.descrizione}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <div className="text-xs text-slate-500" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                              {sheet.esercizi.length} esercizi
                            </div>
                            {sheet.giorni && sheet.giorni.length > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-slate-500" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>•</span>
                                <div className="flex gap-1">
                                  {sheet.giorni.map(day => {
                                    const dayNames = ['', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
                                    return (
                                      <span
                                        key={day}
                                        className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium"
                                        style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                                      >
                                        {dayNames[day]}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditWorkoutSheet(sheet)}
                            className="text-blue-500 hover:text-blue-700 p-2"
                            title="Modifica scheda"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setWorkoutSheets(prev => prev.filter(s => s.id !== sheet.id));
                            }}
                            className="text-red-500 hover:text-red-700 p-2"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1">
                        {sheet.esercizi.map((ex, i) => (
                          <div key={i} className="text-xs text-slate-600 pl-2 border-l-2 border-slate-300" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                            {ex.nome} - {ex.ripetizioni} reps, {ex.recupero} recupero
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Aggiungi Scheda */}
            {showAddWorkoutSheet && (
              <div className="mb-6 bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                  {editingWorkoutSheetId ? 'Modifica Scheda di Allenamento' : 'Crea Nuova Scheda di Allenamento'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Nome scheda (es. Push Day, Full Body...)"
                      value={newWorkoutSheet.nome}
                      onChange={(e) => setNewWorkoutSheet({ ...newWorkoutSheet, nome: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        validationErrors.nome ? 'border-red-500' : 'border-slate-200'
                      }`}
                      style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                    />
                    {validationErrors.nome && (
                      <p className="text-xs text-red-500 mt-1" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                        {validationErrors.nome}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-2" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                      Tipo di Allenamento
                    </label>
                    <select
                      value={newWorkoutSheet.tipo}
                      onChange={(e) => setNewWorkoutSheet({ ...newWorkoutSheet, tipo: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                    >
                      <option value="Palestra">Palestra</option>
                      <option value="Corsa">Corsa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-2" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                      Giorni della Settimana
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { day: 1, label: 'Lun' },
                        { day: 2, label: 'Mar' },
                        { day: 3, label: 'Mer' },
                        { day: 4, label: 'Gio' },
                        { day: 5, label: 'Ven' },
                        { day: 6, label: 'Sab' },
                        { day: 7, label: 'Dom' }
                      ].map(({ day, label }) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDaySelection(day)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            newWorkoutSheet.giorni.includes(day)
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                          style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {validationErrors.giorni && (
                      <p className="text-xs text-red-500 mt-2" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                        {validationErrors.giorni}
                      </p>
                    )}
                  </div>

                  <textarea
                    placeholder="Descrizione (opzionale)"
                    value={newWorkoutSheet.descrizione}
                    onChange={(e) => setNewWorkoutSheet({ ...newWorkoutSheet, descrizione: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[60px]"
                    style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                  />

                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-slate-700" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                        Esercizi
                      </h4>
                      {validationErrors.esercizi && (
                        <p className="text-xs text-red-500" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                          {validationErrors.esercizi}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input
                        type="text"
                        placeholder="Nome esercizio"
                        value={editingExercise.nome}
                        onChange={(e) => setEditingExercise({ ...editingExercise, nome: e.target.value })}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                      />
                      <input
                        type="text"
                        placeholder="Ripetizioni (es. 8-10)"
                        value={editingExercise.ripetizioni}
                        onChange={(e) => setEditingExercise({ ...editingExercise, ripetizioni: e.target.value })}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                      />
                      <input
                        type="text"
                        placeholder="Recupero (es. 90s)"
                        value={editingExercise.recupero}
                        onChange={(e) => setEditingExercise({ ...editingExercise, recupero: e.target.value })}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                      />
                      <input
                        type="number"
                        placeholder="Peso target (kg)"
                        value={editingExercise.pesoTarget || ''}
                        onChange={(e) => setEditingExercise({ ...editingExercise, pesoTarget: parseFloat(e.target.value) || 0 })}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                      />
                    </div>

                    <button
                      onClick={addExerciseToSheet}
                      className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all text-sm font-medium"
                      style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Aggiungi Esercizio
                    </button>

                    {newWorkoutSheet.esercizi.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {newWorkoutSheet.esercizi.map((ex, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                            <div className="text-sm" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                              <span className="font-semibold">{ex.nome}</span> - {ex.ripetizioni} reps, {ex.recupero}
                              {ex.pesoTarget > 0 && `, ${ex.pesoTarget}kg`}
                            </div>
                            <button
                              onClick={() => removeExerciseFromSheet(i)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-slate-200">
                    <button
                      onClick={addWorkoutSheet}
                      className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all"
                      style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                    >
                      {editingWorkoutSheetId ? 'Salva Modifiche' : 'Crea Scheda'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddWorkoutSheet(false);
                        setNewWorkoutSheet({ nome: '', tipo: 'Palestra', descrizione: '', giorni: [], esercizi: [] });
                        setEditingExercise({ nome: '', ripetizioni: '', recupero: '', pesoTarget: 0 });
                        setEditingWorkoutSheetId(null);
                        setValidationErrors({});
                      }}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all"
                      style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Form Aggiungi Progetto */}
            {showAddProject && (
              <div className="mb-6 bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                  {editingProjectId ? 'Modifica Progetto' : 'Aggiungi Nuovo Progetto'}
                </h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Titolo progetto (es. Sviluppo App Mobile, Corso Online...)"
                    value={newProject.title}
                    onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                  />

                  <textarea
                    placeholder="Descrizione (opzionale)"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                    style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-2" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                        Data Inizio
                      </label>
                      <input
                        type="date"
                        value={newProject.startDate}
                        onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-2" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                        Data Fine
                      </label>
                      <input
                        type="date"
                        value={newProject.endDate}
                        onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-3" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                      Allocazione Ore Settimanali
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                      {['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map((day, index) => {
                        const allocation = newProject.timeAllocation.find(t => t.day === index);
                        const hours = allocation ? allocation.hours : 0;

                        return (
                          <div key={index} className="text-center">
                            <div className="text-xs font-semibold text-slate-500 mb-2" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                              {day}
                            </div>
                            <input
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              value={hours}
                              onChange={(e) => updateProjectTimeAllocation(index, parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-2 border border-slate-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                              placeholder="0"
                            />
                            <div className="text-xs text-slate-400 mt-1" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                              ore
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-sm text-slate-500 mt-2" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                      Totale settimanale: {newProject.timeAllocation.reduce((sum, t) => sum + t.hours, 0)} ore
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={addProject}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all"
                      style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                    >
                      {editingProjectId ? 'Salva Modifiche' : 'Aggiungi Progetto'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddProject(false);
                        setEditingProjectId(null);
                        setNewProject({
                          title: '',
                          startDate: '',
                          endDate: '',
                          description: '',
                          timeAllocation: [],
                          completedSessions: {}
                        });
                      }}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all"
                      style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Form Aggiungi Routine */}
            {showAddRoutine && (
              <div className="mb-6 bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                  {editingRoutineId ? 'Modifica Routine' : 'Aggiungi Nuova Routine'}
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Icona (emoji)"
                      value={newRoutine.icon}
                      onChange={(e) => setNewRoutine({ ...newRoutine, icon: e.target.value })}
                      className="w-20 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-center text-xl"
                    />
                    <input
                      type="text"
                      placeholder="Nome routine (es. Meditazione, Yoga, Stretching...)"
                      value={newRoutine.name}
                      onChange={(e) => setNewRoutine({ ...newRoutine, name: e.target.value })}
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                      style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-2" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                      Seleziona i giorni:
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map((day, index) => (
                        <button
                          key={index}
                          onClick={() => toggleRoutineDay(index)}
                          className={`px-4 py-2 rounded-xl font-medium transition-all ${
                            newRoutine.days.includes(index)
                              ? 'bg-green-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={addCustomRoutine}
                      className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all"
                      style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                    >
                      {editingRoutineId ? 'Salva Modifiche' : 'Aggiungi Routine'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddRoutine(false);
                        setEditingRoutineId(null);
                        setNewRoutine({ name: '', days: [], icon: '🏃' });
                      }}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all"
                      style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista Progetti */}
            <div className="grid gap-4">
              {projects.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                  <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                    Nessun progetto in corso. Aggiungine uno!
                  </p>
                </div>
              ) : (
                projects.map(project => {
                  const start = new Date(project.startDate);
                  const end = new Date(project.endDate);
                  const today = new Date();
                  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                  const daysPassed = Math.max(0, Math.ceil((today - start) / (1000 * 60 * 60 * 24)));
                  const progressPercentage = Math.min(100, (daysPassed / totalDays) * 100);

                  const totalPlannedHours = project.timeAllocation.reduce((sum, t) => sum + t.hours, 0);
                  const completedHours = Object.values(project.completedSessions).reduce((sum, h) => sum + h, 0);

                  return (
                    <div key={project.id} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-start gap-4">
                        <div
                          onClick={() => {
                            setProjects(prev =>
                              prev.map(p => p.id === project.id ? { ...p, completed: !p.completed } : p)
                            );
                          }}
                          className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center cursor-pointer ${
                            project.completed ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                          }`}
                        >
                          {project.completed && <Check className="w-5 h-5 text-white" />}
                        </div>
                        <div className="flex-1">
                          <h3 className={`text-xl font-bold mb-2 ${project.completed ? 'line-through text-slate-400' : 'text-slate-800'}`} style={{ fontFamily: "'Libre Baskerville', serif" }}>
                            {project.title}
                          </h3>
                          {project.description && (
                            <p className="text-slate-600 mb-3" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                              {project.description}
                            </p>
                          )}

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <div className="text-sm font-semibold text-slate-500 mb-1" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                                Periodo
                              </div>
                              <div className="text-slate-700" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                                {start.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} - {end.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-500 mb-1" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                                Ore Completate
                              </div>
                              <div className="text-slate-700" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                                {completedHours}h totali
                              </div>
                            </div>
                          </div>

                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-slate-600" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                                Progresso Temporale
                              </span>
                              <span className="text-sm text-slate-600" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                                {daysPassed}/{totalDays} giorni
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full transition-all"
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-semibold text-slate-600 mb-2" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                              Allocazione Settimanale (totale: {totalPlannedHours}h/settimana)
                            </div>
                            <div className="flex gap-2">
                              {['D', 'L', 'M', 'M', 'G', 'V', 'S'].map((day, index) => {
                                const allocation = project.timeAllocation.find(t => t.day === index);
                                const hours = allocation ? allocation.hours : 0;

                                return (
                                  <div key={index} className={`flex-1 text-center py-2 rounded-lg ${
                                    hours > 0 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    <div className="text-xs font-semibold" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                                      {day}
                                    </div>
                                    {hours > 0 && (
                                      <div className="text-xs font-bold" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                                        {hours}h
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => startEditProject(project)}
                            className="text-blue-500 hover:text-blue-700 p-2"
                            title="Modifica progetto"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setProjects(prev => prev.filter(p => p.id !== project.id));
                            }}
                            className="text-red-500 hover:text-red-700 p-2"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Vista Piano Giornata (Read-Only) */}
        {view === 'plan' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-slate-800" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                Piano della Giornata - {formatDateFull(selectedDate)}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(newDate.getDate() - 1);
                    setSelectedDate(newDate);
                  }}
                  className="px-4 py-2 bg-white text-slate-600 rounded-xl hover:bg-slate-50 transition-all"
                >
                  ← Giorno Precedente
                </button>
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="px-4 py-2 bg-white text-slate-600 rounded-xl hover:bg-slate-50 transition-all"
                >
                  Oggi
                </button>
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(newDate.getDate() + 1);
                    setSelectedDate(newDate);
                  }}
                  className="px-4 py-2 bg-white text-slate-600 rounded-xl hover:bg-slate-50 transition-all"
                >
                  Giorno Successivo →
                </button>
                <button
                  onClick={() => setView('day')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Modifica
                </button>
              </div>
            </div>

            {/* Timeline Read-Only */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Timeline della Giornata
              </h3>

              {(() => {
                const blocks = getTimeBlocksForDate(selectedDate);
                const events = getEventsForDate(selectedDate);
                const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

                const allItems = [
                  ...events.map(e => ({
                    type: 'calendar',
                    id: `cal-${e.id}`,
                    title: e.title,
                    startTime: `${e.start.getHours().toString().padStart(2, '0')}:${e.start.getMinutes().toString().padStart(2, '0')}`,
                    endTime: `${e.end.getHours().toString().padStart(2, '0')}:${e.end.getMinutes().toString().padStart(2, '0')}`,
                    location: e.location
                  })),
                  ...blocks.map(b => ({
                    type: b.activityType,
                    id: b.id,
                    title: b.title,
                    startTime: b.startTime,
                    endTime: b.endTime,
                    notes: b.notes
                  }))
                ].sort((a, b) => toMin(a.startTime) - toMin(b.startTime));

                const planColors = {
                  calendar: { bg: 'bg-blue-50', accent: 'bg-blue-400', title: 'text-blue-900', sub: 'text-blue-700' },
                  project: { bg: 'bg-purple-50', accent: 'bg-purple-400', title: 'text-purple-900', sub: 'text-purple-700' },
                  routine: { bg: 'bg-amber-50', accent: 'bg-amber-400', title: 'text-amber-900', sub: 'text-amber-700' },
                  task: { bg: 'bg-emerald-50', accent: 'bg-emerald-400', title: 'text-emerald-900', sub: 'text-emerald-700' }
                };

                if (allItems.length === 0) {
                  return <div className="text-slate-400 text-center py-8 italic">Nessuna attività pianificata per oggi</div>;
                }

                return (
                  <div className="space-y-2">
                    {allItems.map(item => {
                      const pc = planColors[item.type] || planColors.task;
                      return (
                        <div key={item.id} className={`${pc.bg} rounded-xl overflow-hidden flex`}>
                          <div className={`w-1.5 ${pc.accent} flex-shrink-0`} />
                          <div className="flex-1 px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`text-sm font-semibold ${pc.sub} w-28 flex-shrink-0`}>
                                {item.startTime} - {item.endTime}
                              </div>
                              <div className={`font-semibold ${pc.title}`}>{item.title}</div>
                            </div>
                            {item.location && <div className="text-sm text-blue-600 mt-1 ml-[7.75rem]">📍 {item.location}</div>}
                            {item.notes && <div className="text-sm text-slate-600 mt-1 ml-[7.75rem] italic">{item.notes}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Unscheduled Items */}
              {(() => {
                const dateKey = selectedDate.toISOString().split('T')[0];
                const tasks = dailyTasks[dateKey] || [];
                const blocks = getTimeBlocksForDate(selectedDate);
                const scheduledTaskIds = blocks
                  .filter(b => b.activityType === 'task')
                  .map(b => b.activityId);
                const unscheduledTasks = tasks.filter(t => !scheduledTaskIds.includes(t.id) && !t.completed);

                if (unscheduledTasks.length === 0) return null;

                return (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h4 className="text-base font-bold text-slate-700 mb-3">📋 Attività Non Pianificate</h4>
                    <div className="space-y-2">
                      {unscheduledTasks.map(task => (
                        <div key={task.id} className="bg-amber-50 rounded-xl overflow-hidden flex">
                          <div className="w-1.5 bg-amber-400 flex-shrink-0" />
                          <div className="px-4 py-2">
                            <div className="text-sm text-amber-900">{task.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </main>

      {view !== 'week' && (
        <button
          onClick={() => setView('week')}
          className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-all hover:scale-110 flex items-center justify-center"
        >
          <Calendar className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
