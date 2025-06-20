
import React, { useState, useEffect, useCallback } from 'react';
import { supabase, supabaseMisconfigurationError } from './supabaseClient';
import { 
    ManagedTask, 
    TaskResetCategory, 
    UserProfile,
    SubTask, 
    GlobalTag,
    Json
} from './types';
import { FeatureManagementPage } from './pages/FeatureManagementPage';
import { LoginPage } from './components/LoginPage'; // Import LoginPage
import { calculateNextResetTimestamp, getInitialNextResetTimestamp, toSupabaseDate, parseSupabaseDate } from './services/utils';
import { INITIAL_TASKS, COMMON_TASK_TAGS, generateInitialColorClassesForTag, generateNewRandomColorClasses } from './constants'; 
import { Database } from './types_db';

const LOCAL_STORAGE_USER_ID_KEY = 'sumberRejekiAppUserId';
const LOCAL_STORAGE_USERNAME_KEY = 'sumberRejekiAppUsername';

function parseSubTasksFromDb(dbSubTasks: Json | null): SubTask[] | null {
    if (!dbSubTasks) {
        return null;
    }
    if (typeof dbSubTasks === 'string') {
        try {
            const parsed = JSON.parse(dbSubTasks);
            if (Array.isArray(parsed)) {
                return parsed as SubTask[];
            }
            console.warn("Parsed sub_tasks from string is not an array:", parsed);
            return []; 
        } catch (e) {
            console.error("Error parsing sub_tasks JSON string from DB:", e);
            return []; 
        }
    } else if (Array.isArray(dbSubTasks)) {
        return dbSubTasks as unknown as SubTask[]; 
    }
    console.warn("sub_tasks from DB is in an unexpected format (not string or array):", dbSubTasks);
    return []; 
}

const formatSupabaseError = (error: any, defaultMessage: string = "An unknown error occurred."): string => {
  if (!error) return defaultMessage;
  if (typeof error.message === 'string' && error.message) return error.message;
  if (typeof error.details === 'string' && error.details) return `Details: ${error.details}`;
  if (typeof error.hint === 'string' && error.hint) return `Hint: ${error.hint}`;
  if (typeof error === 'string') return error;
  try {
    const stringified = JSON.stringify(error);
    if (stringified && stringified !== '{}') return stringified;
  } catch (e) { /* ignore */ }
  return defaultMessage;
};

const ConfigurationErrorScreen: React.FC<{ message: string }> = ({ message }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-base-100 text-base-content p-6 text-center">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-error mb-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
    <h1 className="text-2xl font-bold text-error mb-3">Application Configuration Error</h1>
    <p className="mb-2 text-lg">{message}</p>
    <p className="text-base-content-secondary">
      The application cannot start correctly. Please ensure your environment variables (e.g., <code>.env</code> file or hosting provider settings) for Supabase are correctly configured.
    </p>
  </div>
);


const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<ManagedTask[]>([]);
  const [globalTagDefinitions, setGlobalTagDefinitions] = useState<GlobalTag[]>([]);
  const [appLoading, setAppLoading] = useState(false); 
  const [appError, setAppError] = useState<string | null>(null);

  if (supabaseMisconfigurationError) {
    return <ConfigurationErrorScreen message={supabaseMisconfigurationError} />;
  }

  // Effect to attempt auto-login from localStorage on initial load
  useEffect(() => {
    const storedUserId = localStorage.getItem(LOCAL_STORAGE_USER_ID_KEY);
    const storedUsername = localStorage.getItem(LOCAL_STORAGE_USERNAME_KEY);
    if (storedUserId && storedUsername) {
      console.log(`[App.tsx] Found stored credentials. Attempting auto-login for user: ${storedUsername}`);
      handleLogin(storedUserId, storedUsername, true); // Pass a flag to indicate auto-login
    }
  }, []); // Runs once on mount


  const handleLogin = (userId: string, username: string, isAutoLogin: boolean = false) => {
    const now = new Date().toISOString();
    const profile: UserProfile = {
        id: userId,
        username: username,
        is_admin: true, 
        created_at: now,
        updated_at: now,
    };
    setCurrentUser(profile);
    setAppError(null); 
    
    if (!isAutoLogin) { // Only set localStorage on explicit login, not on auto-login
        localStorage.setItem(LOCAL_STORAGE_USER_ID_KEY, userId);
        localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, username);
        console.log(`[App.tsx handleLogin] Credentials saved to localStorage for user: ${username}`);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setTasks([]);
    setGlobalTagDefinitions([]);
    setAppError(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_ID_KEY);
    localStorage.removeItem(LOCAL_STORAGE_USERNAME_KEY);
    console.log("[App.tsx handleLogout] User logged out and credentials cleared from localStorage.");
  };


  // Data loading effect, depends on currentUser
  useEffect(() => {
    if (!supabase) return; 
    if (!currentUser?.id) {
      setTasks([]); 
      setGlobalTagDefinitions([]); 
      setAppLoading(false);
      return;
    }

    const loadData = async () => {
      console.log(`[App.tsx loadData] Loading data for user: ${currentUser.id}`);
      setAppLoading(true); 
      setAppError(null);
      try {
        const { data: fetchedTags, error: tagsError } = await supabase
          .from('global_tags')
          .select('*')
          .eq('user_id', currentUser.id);

        if (tagsError) throw tagsError;

        const { data: fetchedTasksData, error: tasksError } = await supabase
          .from('managed_tasks')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (tasksError) throw tasksError;
        
        const fetchedTasks: ManagedTask[] = fetchedTasksData.map(t => ({
            ...t,
            category: t.category as TaskResetCategory, 
            sub_tasks: parseSubTasksFromDb(t.sub_tasks), 
            tags: t.tags || [],
            specific_reset_days: t.specific_reset_days || [],
        }));

        if (fetchedTags.length === 0 && fetchedTasks.length === 0 && currentUser.id) {
          console.log(`[App.tsx loadData] No data found for user ${currentUser.id}. Attempting to seed initial data...`);
          let seedingIssues = "";

          const allInitialTagTexts = new Set(INITIAL_TASKS.flatMap(task => task.tags || []));
          COMMON_TASK_TAGS.forEach(tag => allInitialTagTexts.add(tag));
          
          const initialGlobalTagsToSeed: GlobalTag[] = Array.from(allInitialTagTexts).map(text => ({
            text,
            colorClasses: generateInitialColorClassesForTag(text)
          }));

          const tagsToInsertSupabase = initialGlobalTagsToSeed.map(gt => ({
            user_id: currentUser.id!,
            text: gt.text,
            color_classes: gt.colorClasses,
          }));

          const { error: seedTagsError } = await supabase.from('global_tags').insert(tagsToInsertSupabase);
          if (seedTagsError) {
            console.error("SEEDING ERROR for global_tags:", seedTagsError);
            seedingIssues += `Global tags seeding failed: ${formatSupabaseError(seedTagsError)}. `;
          } else {
            setGlobalTagDefinitions(initialGlobalTagsToSeed.sort((a,b) => a.text.localeCompare(b.text)));
          }

          const initialTasksToSeedSupabase = INITIAL_TASKS.map(task => ({
            ...task,
            user_id: currentUser.id!,
            next_reset_timestamp: task.next_reset_timestamp ? toSupabaseDate(parseSupabaseDate(task.next_reset_timestamp)) : undefined,
            last_completion_timestamp: task.last_completion_timestamp ? toSupabaseDate(parseSupabaseDate(task.last_completion_timestamp)) : undefined,
            created_at: toSupabaseDate(parseSupabaseDate(task.created_at)),
            updated_at: toSupabaseDate(parseSupabaseDate(task.updated_at)),
            sub_tasks: task.sub_tasks && task.sub_tasks.length > 0 ? JSON.stringify(task.sub_tasks) : null,
          }));
          
          const { error: seedTasksError } = await supabase.from('managed_tasks').insert(initialTasksToSeedSupabase);
          if (seedTasksError) {
            console.error("SEEDING ERROR for managed_tasks:", seedTasksError);
            seedingIssues += `Managed tasks seeding failed: ${formatSupabaseError(seedTasksError)}. `;
          } else {
             const reFetchedTasks: ManagedTask[] = initialTasksToSeedSupabase.map((t, idx) => ({
                ...t,
                id: crypto.randomUUID(), 
                category: t.category as TaskResetCategory,
                sub_tasks: parseSubTasksFromDb(t.sub_tasks),
                tags: t.tags || [],
                specific_reset_days: t.specific_reset_days || [],
            }));
            setTasks(reFetchedTasks);
          }
          
          if (seedingIssues) {
            setAppError(seedingIssues + `RLS policies might need adjustment for user ${currentUser.id}, or seed manually. App will proceed.`);
          }

        } else {
          setGlobalTagDefinitions(fetchedTags.map(ft => ({ text: ft.text, colorClasses: ft.color_classes })).sort((a,b) => a.text.localeCompare(b.text)));
          setTasks(fetchedTasks);
        }

      } catch (error: any) {
        console.error("Error loading data:", error);
        setAppError(`Failed to load data for user ${currentUser.id}: ${formatSupabaseError(error)}. Check RLS policies.`);
      } finally {
        setAppLoading(false);
      }
    };

    loadData();
  }, [currentUser]); 
  
  const addGlobalTagDefinition = useCallback(async (text: string) => {
    if (!supabase || !currentUser?.id) return;
    const newTagText = text.trim();
    if (!newTagText || globalTagDefinitions.find(gt => gt.text.toLowerCase() === newTagText.toLowerCase())) {
      alert(`Tag "${newTagText}" already exists or is empty.`);
      return;
    }
    setAppLoading(true);
    const newGlobalTag: GlobalTag = {
      text: newTagText,
      colorClasses: generateNewRandomColorClasses()
    };
    const { error } = await supabase.from('global_tags').insert({
      user_id: currentUser.id,
      text: newGlobalTag.text,
      color_classes: newGlobalTag.colorClasses,
    });
    if (error) {
      setAppError(`Failed to add global tag: ${formatSupabaseError(error)}`);
    } else {
      setGlobalTagDefinitions(prev => [...prev, newGlobalTag].sort((a,b) => a.text.localeCompare(b.text)));
    }
    setAppLoading(false);
  }, [currentUser, globalTagDefinitions]);

  const deleteGlobalTagDefinition = useCallback(async (tagTextToDelete: string) => {
    if (!supabase || !currentUser?.id) return;
    const confirmed = window.confirm(`Are you sure you want to delete the system tag "${tagTextToDelete}"? This will also remove it from all tasks.`);
    if (!confirmed) return;
    
    setAppLoading(true);
    try {
      const { error: deleteTagError } = await supabase
        .from('global_tags')
        .delete()
        .match({ user_id: currentUser.id, text: tagTextToDelete });
      if (deleteTagError) throw deleteTagError;

      const tasksToUpdate = tasks.filter(task => task.tags.includes(tagTextToDelete));
      for (const task of tasksToUpdate) {
        const updatedTags = task.tags.filter(t => t !== tagTextToDelete);
        const { error: updateTaskError } = await supabase
          .from('managed_tasks')
          .update({ tags: updatedTags, updated_at: toSupabaseDate(Date.now()) })
          .match({ id: task.id, user_id: currentUser.id });
        if (updateTaskError) console.error(`Error updating task ${task.id} tags:`, updateTaskError);
      }
      
      setGlobalTagDefinitions(prev => prev.filter(gt => gt.text !== tagTextToDelete));
      setTasks(prevTasks => 
        prevTasks.map(task => ({
          ...task,
          tags: task.tags.filter(t => t !== tagTextToDelete)
        }))
      );
    } catch (error: any) {
      setAppError(`Failed to delete global tag "${tagTextToDelete}": ${formatSupabaseError(error)}`);
    }
    setAppLoading(false);
  }, [currentUser, tasks]);

  useEffect(() => {
    if (!supabase || !currentUser?.id || tasks.length === 0 || appLoading) return;

    const intervalId = setInterval(async () => {
      if (!mountedRef.current) return; 

      const now = Date.now();
      let tasksActuallyChangedInDb = false;
      const tasksCopy = JSON.parse(JSON.stringify(tasks)) as ManagedTask[]; 
      const updatedTasksAccumulator: ManagedTask[] = []; 

      for (const task of tasksCopy) {
        const nextResetNum = parseSupabaseDate(task.next_reset_timestamp);
        let taskRequiresDbUpdate = false;
        const payloadForDb: Partial<Database['public']['Tables']['managed_tasks']['Update']> = {};
        
        if (task.is_completed && nextResetNum && now >= nextResetNum) {
          payloadForDb.is_completed = false;
          payloadForDb.last_completion_timestamp = null; 
          payloadForDb.next_reset_timestamp = toSupabaseDate(calculateNextResetTimestamp(
            task.category, task.specific_reset_days, now, false
          ));
          payloadForDb.sub_tasks = task.sub_tasks ? JSON.stringify(task.sub_tasks.map(st => ({ ...st, isCompleted: false }))) : null;
          taskRequiresDbUpdate = true;
        } else if (!task.is_completed && nextResetNum && now >= nextResetNum && task.category !== TaskResetCategory.COUNTDOWN_24H) {
          payloadForDb.next_reset_timestamp = toSupabaseDate(calculateNextResetTimestamp(
            task.category, task.specific_reset_days, now, false
          ));
          taskRequiresDbUpdate = true;
        }

        if (taskRequiresDbUpdate) {
          payloadForDb.updated_at = toSupabaseDate(now); 
          const { data: updatedDbData, error } = await supabase
            .from('managed_tasks')
            .update(payloadForDb)
            .match({ id: task.id, user_id: currentUser.id })
            .select()
            .single();
          
          if (!mountedRef.current) return; 

          if (error) {
            console.error(`Failed to auto-reset task ${task.id} in DB:`, error);
            updatedTasksAccumulator.push(task); 
          } else if (updatedDbData) {
            tasksActuallyChangedInDb = true;
            updatedTasksAccumulator.push({
                ...updatedDbData,
                category: updatedDbData.category as TaskResetCategory,
                sub_tasks: parseSubTasksFromDb(updatedDbData.sub_tasks),
                tags: updatedDbData.tags || [],
                specific_reset_days: updatedDbData.specific_reset_days || [],
            });
          } else {
             updatedTasksAccumulator.push(task); 
          }
        } else {
          updatedTasksAccumulator.push(task);
        }
      }
      if (mountedRef.current && tasksActuallyChangedInDb) {
        setTasks(updatedTasksAccumulator);
      }
    }, 60 * 1000 * 1); 

    const mountedRef = { current: true };
    return () => {
      clearInterval(intervalId);
      mountedRef.current = false;
    };
  }, [tasks, currentUser, appLoading]); 

  const handleAddTask = useCallback(async (
    newTaskData: Omit<ManagedTask, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'next_reset_timestamp' | 'last_completion_timestamp' >,
  ): Promise<ManagedTask | null> => {
    if (!supabase || !currentUser?.id) {
        setAppError("User not identified or Supabase not available.");
        return null;
    }
    setAppLoading(true);
    const now = Date.now();
    const taskToInsertSupabase = {
      user_id: currentUser.id,
      title: newTaskData.title,
      description: newTaskData.description || null,
      logo_url: newTaskData.logo_url || null,
      is_completed: false,
      category: newTaskData.category,
      specific_reset_days: newTaskData.specific_reset_days || null,
      tags: newTaskData.tags || null,
      sub_tasks: newTaskData.sub_tasks && newTaskData.sub_tasks.length > 0 ? JSON.stringify(newTaskData.sub_tasks) : null,
      created_at: toSupabaseDate(now)!,
      updated_at: toSupabaseDate(now)!,
      next_reset_timestamp: toSupabaseDate(getInitialNextResetTimestamp(newTaskData)),
      last_completion_timestamp: null,
    };

    const { data, error } = await supabase
      .from('managed_tasks')
      .insert(taskToInsertSupabase)
      .select()
      .single();

    if (error) {
      setAppError(`Failed to add task: ${formatSupabaseError(error)}`);
      setAppLoading(false);
      return null;
    }
    
    const addedManagedTask = data ? {
        ...data,
        category: data.category as TaskResetCategory,
        sub_tasks: parseSubTasksFromDb(data.sub_tasks), 
        tags: data.tags || [],
        specific_reset_days: data.specific_reset_days || [],
    } : null;
    if (addedManagedTask) setTasks(prevTasks => [addedManagedTask, ...prevTasks]);
    setAppLoading(false);
    return addedManagedTask;
  }, [currentUser]); 
  
  const handleUpdateTask = useCallback(async (updatedTaskFromForm: ManagedTask) => {
    if (!supabase || !currentUser?.id) return;
    setAppLoading(true);
    
    const originalTask = tasks.find(t => t.id === updatedTaskFromForm.id);
    if (!originalTask) {
        setAppError("Original task not found for update.");
        setAppLoading(false); return;
    }
    const now = Date.now();
    let nextResetTime = parseSupabaseDate(updatedTaskFromForm.next_reset_timestamp);

    if (originalTask.category !== updatedTaskFromForm.category || 
        JSON.stringify(originalTask.specific_reset_days || []) !== JSON.stringify(updatedTaskFromForm.specific_reset_days || [])) {
        nextResetTime = calculateNextResetTimestamp(
            updatedTaskFromForm.category,
            updatedTaskFromForm.specific_reset_days,
            (updatedTaskFromForm.category === TaskResetCategory.COUNTDOWN_24H && updatedTaskFromForm.is_completed && updatedTaskFromForm.last_completion_timestamp) 
                ? parseSupabaseDate(updatedTaskFromForm.last_completion_timestamp)!
                : now, 
            updatedTaskFromForm.is_completed 
        );
    }
    
    const taskToUpdateSupabase: Partial<Database['public']['Tables']['managed_tasks']['Update']> = {
      title: updatedTaskFromForm.title,
      description: updatedTaskFromForm.description || null,
      logo_url: updatedTaskFromForm.logo_url || null,
      category: updatedTaskFromForm.category,
      specific_reset_days: updatedTaskFromForm.specific_reset_days || null,
      tags: updatedTaskFromForm.tags || null,
      sub_tasks: updatedTaskFromForm.sub_tasks && updatedTaskFromForm.sub_tasks.length > 0 ? JSON.stringify(updatedTaskFromForm.sub_tasks) : null,
      next_reset_timestamp: toSupabaseDate(nextResetTime),
      updated_at: toSupabaseDate(now)!,
    };

    const { data, error } = await supabase
      .from('managed_tasks')
      .update(taskToUpdateSupabase)
      .match({ id: updatedTaskFromForm.id, user_id: currentUser.id })
      .select()
      .single();

    if (error) {
      setAppError(`Failed to update task: ${formatSupabaseError(error)}`);
    } else if (data) {
      const updatedTask = {
          ...data,
          category: data.category as TaskResetCategory,
          sub_tasks: parseSubTasksFromDb(data.sub_tasks), 
          tags: data.tags || [],
          specific_reset_days: data.specific_reset_days || [],
      };
      setTasks(prevTasks => prevTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
    }
    setAppLoading(false);
  }, [currentUser, tasks]); 

  const handleToggleComplete = useCallback(async (taskId: string, subTaskTitle?: string) => {
    if (!supabase || !currentUser?.id) return;
    setAppLoading(true);
    
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) {
        setAppError("Task not found for toggle.");
        setAppLoading(false); return;
    }

    let finalCompletedStatus = !taskToUpdate.is_completed;
    let newSubTasksArray: SubTask[] | null = taskToUpdate.sub_tasks ? JSON.parse(JSON.stringify(taskToUpdate.sub_tasks)) : null;
    
    if (taskToUpdate.sub_tasks && taskToUpdate.sub_tasks.length > 0 && newSubTasksArray) {
        if (subTaskTitle) { 
            const subTaskIndex = newSubTasksArray.findIndex(st => st.title === subTaskTitle);
            if (subTaskIndex !== -1) newSubTasksArray[subTaskIndex].isCompleted = !newSubTasksArray[subTaskIndex].isCompleted;
            finalCompletedStatus = newSubTasksArray.every(st => st.isCompleted);
        } else { 
            const parentNewStatus = !taskToUpdate.is_completed;
            newSubTasksArray = newSubTasksArray.map(st => ({ ...st, isCompleted: parentNewStatus }));
            finalCompletedStatus = parentNewStatus;
        }
    }

    const now = Date.now();
    const newLastCompletionTimestamp = finalCompletedStatus ? now : (taskToUpdate.category === TaskResetCategory.COUNTDOWN_24H ? undefined : parseSupabaseDate(taskToUpdate.last_completion_timestamp));
    
    const taskDataForSupabase: Partial<Database['public']['Tables']['managed_tasks']['Update']> = {
      is_completed: finalCompletedStatus,
      last_completion_timestamp: toSupabaseDate(newLastCompletionTimestamp),
      next_reset_timestamp: toSupabaseDate(calculateNextResetTimestamp(
        taskToUpdate.category, taskToUpdate.specific_reset_days,
        (taskToUpdate.category === TaskResetCategory.COUNTDOWN_24H && finalCompletedStatus) ? now : now, 
        finalCompletedStatus 
      )),
      sub_tasks: newSubTasksArray && newSubTasksArray.length > 0 ? JSON.stringify(newSubTasksArray) : null,
      updated_at: toSupabaseDate(now)!,
    };

    const { data, error } = await supabase
      .from('managed_tasks')
      .update(taskDataForSupabase)
      .match({ id: taskId, user_id: currentUser.id })
      .select()
      .single();

    if (error) {
      setAppError(`Failed to toggle task completion: ${formatSupabaseError(error)}`);
    } else if (data) {
      const updatedTask = {
          ...data,
          category: data.category as TaskResetCategory,
          sub_tasks: parseSubTasksFromDb(data.sub_tasks), 
          tags: data.tags || [],
          specific_reset_days: data.specific_reset_days || [],
      };
      setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? updatedTask : t));
    }
    setAppLoading(false);
  }, [tasks, currentUser]); 

  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!supabase || !currentUser?.id) return;
    console.log(`[App.tsx] handleDeleteTask called for task ID: ${taskId}`);
    if (!currentUser?.id) {
        setAppError("User not identified. Cannot delete task.");
        return;
    }
    const confirmed = window.confirm("Are you sure you want to delete this task?");
    if (!confirmed) return;
    
    setAppLoading(true);
    const { error } = await supabase
      .from('managed_tasks')
      .delete()
      .match({ id: taskId, user_id: currentUser.id });

    if (error) {
      console.error(`[App.tsx] Supabase error deleting task ${taskId}:`, error);
      setAppError(`Failed to delete task: ${formatSupabaseError(error)} (ID: ${taskId})`);
    } else {
      console.log(`[App.tsx] Task ${taskId} successfully deleted from Supabase.`);
      setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
    }
    setAppLoading(false);
  }, [currentUser]); 
  
  if (!currentUser) {
    return (
        <LoginPage 
            onLogin={handleLogin} 
            appError={appError}
            clearAppError={() => setAppError(null)}
        />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-base-100 text-base-content">
        <>
          <main className="flex-grow container mx-auto p-4 md:p-6">
            {appError && <div className="mb-4 p-3 bg-error/20 text-error rounded-md text-sm animate-fade-in">{appError} <button onClick={() => setAppError(null)} className="ml-2 font-bold">X</button></div>}
            {appLoading && <div className="fixed top-4 right-4 z-[100] p-2 bg-base-300/80 rounded-lg shadow-xl text-xs flex items-center"><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Loading...</div>}
            
            <FeatureManagementPage
                tasks={tasks}
                currentUser={currentUser} 
                onUpdateTask={handleUpdateTask}
                onAddTask={handleAddTask}
                onToggleComplete={handleToggleComplete}
                onDeleteTask={handleDeleteTask}
                globalTagDefinitions={globalTagDefinitions}
                onAddGlobalTag={addGlobalTagDefinition}
                onDeleteGlobalTag={deleteGlobalTagDefinition}
                onLogout={handleLogout} 
            />
          </main>
          <footer className="bg-base-200 text-center p-4 text-xs text-base-content-secondary border-t border-base-300">
            Sumber Rejeki &copy; {new Date().getFullYear()}
          </footer>
        </>
    </div>
  );
};

export default App;
