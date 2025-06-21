import React, { useState, useEffect } from 'react';
import { ManagedTask, TaskResetCategory, WeekDays, FormComponentProps, SubTask, GlobalTag } from '../../types';
import { Modal } from '../shared/Modal';
import { Tag } from '../shared/Tag';
import { PlusCircleIcon, TrashIcon, PencilSquareIcon, CheckCircleIcon as SaveIcon, XMarkIcon as CancelIcon } from '../shared/icons/HeroIcons'; 
import { calculateNextResetTimestamp, toSupabaseDate, parseSupabaseDate } from '../../services/utils';

const initialFormStateOmit: Omit<ManagedTask, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'next_reset_timestamp' | 'last_completion_timestamp'> = {
  title: '',
  description: '',
  logo_url: '',
  is_completed: false,
  category: TaskResetCategory.DAILY,
  specific_reset_days: [],
  tags: [],
  sub_tasks: [],
};

const DEFAULT_TAG_COLOR = "bg-neutral text-base-content";

export const TaskForm: React.FC<FormComponentProps<ManagedTask> & { globalTagDefinitions: GlobalTag[] }> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    existingData: existingTask, 
    globalTagDefinitions
}) => {
  const [taskData, setTaskData] = useState(initialFormStateOmit);
  const [currentTagInput, setCurrentTagInput] = useState('');
  const [currentSubTaskTitle, setCurrentSubTaskTitle] = useState('');
  const [currentSubTaskCategory, setCurrentSubTaskCategory] = useState<TaskResetCategory | "">("");
  const [editingSubTask, setEditingSubTask] = useState<{ 
    index: number; 
    title: string; 
    category: TaskResetCategory | "";
  } | null>(null);

  useEffect(() => {
    if (existingTask && isOpen) { 
      setTaskData({
        title: existingTask.title,
        description: existingTask.description,
        logo_url: existingTask.logo_url || '',
        is_completed: existingTask.is_completed, 
        category: existingTask.category,
        specific_reset_days: existingTask.specific_reset_days || [],
        tags: existingTask.tags || [],
        sub_tasks: (existingTask.sub_tasks || []).map(st => ({ 
            ...st, 
            category: st.category || "",
            last_completion_timestamp: st.last_completion_timestamp,
            next_reset_timestamp: st.next_reset_timestamp,
        })),
      });
    } else if (!existingTask && isOpen) { 
      setTaskData(initialFormStateOmit);
    }
    setCurrentTagInput('');
    setCurrentSubTaskTitle('');
    setCurrentSubTaskCategory("");
    setEditingSubTask(null); 
  }, [existingTask, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTaskData(prev => ({ ...prev, [name]: value }));
  };

  const handleDayToggle = (dayId: number) => {
    setTaskData(prev => {
      const currentDays = prev.specific_reset_days || [];
      const newDays = currentDays.includes(dayId)
        ? currentDays.filter(d => d !== dayId)
        : [...currentDays, dayId];
      return { ...prev, specific_reset_days: newDays.sort((a,b) => a-b) };
    });
  };

  const handleTagAdd = (tagText: string) => {
    const newTag = tagText.trim();
    if (newTag && !taskData.tags.includes(newTag) && taskData.tags.length < 10) {
      setTaskData(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
    }
    setCurrentTagInput('');
  };

  const handleTagRemove = (tagToRemove: string) => {
    setTaskData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  const handleAddSubTask = () => {
    const title = currentSubTaskTitle.trim();
    if (title) {
        const newSubTask: SubTask = { 
            title, 
            isCompleted: false, 
            category: currentSubTaskCategory,
            last_completion_timestamp: null,
            next_reset_timestamp: currentSubTaskCategory 
                ? toSupabaseDate(calculateNextResetTimestamp(currentSubTaskCategory, undefined, Date.now(), false)) 
                : null,
        };
        setTaskData(prev => ({
            ...prev,
            sub_tasks: [...(prev.sub_tasks || []), newSubTask]
        }));
        setCurrentSubTaskTitle('');
        setCurrentSubTaskCategory("");
    }
  };

  const handleRemoveSubTask = (indexToRemove: number) => {
    setTaskData(prev => ({
        ...prev,
        sub_tasks: (prev.sub_tasks || []).filter((_, index) => index !== indexToRemove)
    }));
    if (editingSubTask?.index === indexToRemove) {
        setEditingSubTask(null);
    }
  };
  
  const handleEditSubTask = (index: number) => {
    const subTask = (taskData.sub_tasks || [])[index];
    setEditingSubTask({ 
        index, 
        title: subTask.title, 
        category: subTask.category || ""
    });
  };

  const handleSaveEditedSubTask = () => {
    if (editingSubTask && editingSubTask.title.trim()) {
      const updatedSubTasks = [...(taskData.sub_tasks || [])];
      const subTaskToUpdate = updatedSubTasks[editingSubTask.index];

      subTaskToUpdate.title = editingSubTask.title.trim();
      const oldCategory = subTaskToUpdate.category;
      subTaskToUpdate.category = editingSubTask.category;

      if (oldCategory !== editingSubTask.category || (editingSubTask.category && !subTaskToUpdate.next_reset_timestamp)) {
          if (editingSubTask.category) {
              let baseTimestampForCalc: number;
              if (subTaskToUpdate.isCompleted && subTaskToUpdate.last_completion_timestamp) {
                  const parsedTs = parseSupabaseDate(subTaskToUpdate.last_completion_timestamp);
                  if (parsedTs !== undefined) {
                      baseTimestampForCalc = parsedTs;
                  } else {
                      console.warn(`Invalid last_completion_timestamp for subtask during edit: ${subTaskToUpdate.title}. Defaulting to now.`);
                      baseTimestampForCalc = Date.now();
                  }
              } else {
                  baseTimestampForCalc = Date.now();
              }
              
              subTaskToUpdate.next_reset_timestamp = toSupabaseDate(calculateNextResetTimestamp(
                  editingSubTask.category, 
                  undefined, 
                  baseTimestampForCalc, 
                  subTaskToUpdate.isCompleted
              ));
          } else {
              subTaskToUpdate.next_reset_timestamp = null;
              subTaskToUpdate.last_completion_timestamp = null;
          }
      }
      
      setTaskData(prev => ({ ...prev, sub_tasks: updatedSubTasks }));
      setEditingSubTask(null);
    } else if (editingSubTask) {
        alert("Sub-task title cannot be empty.");
    }
  };

  const handleCancelEditSubTask = () => {
    setEditingSubTask(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskData.title) {
        alert("Title is required.");
        return;
    }
    if (editingSubTask) {
        alert("Please save or cancel the sub-task you are currently editing before saving the main task.");
        return;
    }
    const completeTaskData: ManagedTask = {
      id: existingTask?.id || '', 
      user_id: existingTask?.user_id || '', 
      created_at: existingTask?.created_at || '', 
      updated_at: '', 
      next_reset_timestamp: existingTask?.next_reset_timestamp, 
      last_completion_timestamp: existingTask?.last_completion_timestamp, 
      ...taskData, 
      sub_tasks: (taskData.sub_tasks || []).map(st => ({
          ...st, 
          category: st.category || undefined, 
          last_completion_timestamp: st.last_completion_timestamp,
          next_reset_timestamp: st.next_reset_timestamp,
      })),
    };
    try {
        await onSave(completeTaskData); 
        onClose(); 
    } catch (error) {
        console.error("Failed to save task:", error);
        alert("Failed to save task. See console for details."); 
    }
  };
  
  const getTagColor = (tagText: string) => {
    const found = globalTagDefinitions.find(gtd => gtd.text === tagText);
    return found ? found.colorClasses : DEFAULT_TAG_COLOR;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingTask ? "Edit Task" : "Add New Task"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto p-1 pr-2">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-base-content-secondary">Title</label>
          <input type="text" name="title" id="title" value={taskData.title} onChange={handleChange} required
                 className="mt-1 block w-full bg-base-200 border border-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-base-content-secondary">Description (URLs &amp; [text](url) will be clickable)</label>
          <textarea name="description" id="description" value={taskData.description} onChange={handleChange} rows={5}
                    className="mt-1 block w-full bg-base-200 border border-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
        </div>
        <div>
          <label htmlFor="logo_url" className="block text-sm font-medium text-base-content-secondary">Logo URL (Optional)</label>
          <input type="url" name="logo_url" id="logo_url" value={taskData.logo_url || ''} onChange={handleChange}
                 className="mt-1 block w-full bg-base-200 border border-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-base-content-secondary">Reset Category</label>
          <select name="category" id="category" value={taskData.category} onChange={handleChange}
                  className="mt-1 block w-full bg-base-200 border border-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm appearance-none">
            {Object.values(TaskResetCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        {taskData.category === TaskResetCategory.SPECIFIC_DAY && (
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Reset on Specific Days (WIB Midnight)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-1">
              {WeekDays.map(day => (
                <label key={day.id} className="flex items-center space-x-2 p-2 bg-base-200 border border-base-300 rounded-md hover:bg-base-300/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(taskData.specific_reset_days || []).includes(day.id)}
                    onChange={() => handleDayToggle(day.id)}
                    className="form-checkbox h-4 w-4 text-primary rounded border-neutral focus:ring-primary"
                  />
                  <span className="text-sm text-base-content">{day.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <div>
            <label className="block text-sm font-medium text-base-content-secondary">Tags (max 10)</label>
            <div className="mt-1 flex flex-wrap gap-2 items-center min-h-[38px] p-1 border border-transparent">
                {taskData.tags.map(tagText => (
                    <Tag 
                        key={tagText} 
                        text={tagText} 
                        colorClasses={getTagColor(tagText)}
                        onClick={() => handleTagRemove(tagText)} 
                        className="cursor-pointer !py-0.5 !px-1.5 !text-xs"
                    />
                ))}
            </div>
            {taskData.tags.length < 10 && (
                <div className="mt-2 flex">
                    <input 
                        type="text" 
                        value={currentTagInput}
                        onChange={(e) => setCurrentTagInput(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleTagAdd(currentTagInput);}}}
                        placeholder="Add a new tag and press Enter"
                        className="flex-grow bg-base-200 border border-base-300 rounded-l-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" 
                    />
                    <button type="button" onClick={() => handleTagAdd(currentTagInput)} className="bg-primary text-white px-3 py-2 rounded-r-md hover:bg-primary-focus focus:outline-none">Add</button>
                </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
                {globalTagDefinitions
                    .filter(gtd => !taskData.tags.includes(gtd.text) && taskData.tags.length < 10)
                    .slice(0, 10) 
                    .map(gtd => (
                        <Tag
                            key={gtd.text}
                            text={gtd.text}
                            colorClasses={gtd.colorClasses}
                            onClick={() => handleTagAdd(gtd.text)}
                            className="cursor-pointer !text-xs opacity-80 hover:opacity-100"
                        />
                ))}
            </div>
        </div>

        <div className="pt-4 border-t border-base-300">
            <h3 className="text-md font-semibold text-base-content mb-2">Sub-tasks (titles/descriptions can use [text](url) format)</h3>
            <div className="space-y-3">
                {(taskData.sub_tasks || []).map((subTask, index) => (
                    <div key={index} className={`p-3 rounded-md border ${editingSubTask?.index === index ? 'bg-base-300/50 border-primary' : 'bg-base-100/70 border-base-300/70'}`}>
                        {editingSubTask?.index === index ? (
                            <div className="space-y-2">
                                <textarea
                                    value={editingSubTask.title}
                                    onChange={(e) => setEditingSubTask({ ...editingSubTask!, title: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEditedSubTask(); } else if (e.key === 'Escape') { handleCancelEditSubTask();}}}
                                    className="block w-full bg-base-100 border border-primary rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                    rows={2}
                                    autoFocus
                                    placeholder="Sub-task title/description"
                                />
                                 <select 
                                    value={editingSubTask.category} 
                                    onChange={(e) => setEditingSubTask({...editingSubTask!, category: e.target.value as TaskResetCategory | ""})}
                                    className="block w-full bg-base-100 border border-primary rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm appearance-none text-xs"
                                >
                                    <option value="">No Category (Resets with Parent)</option>
                                    {Object.values(TaskResetCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                                <div className="flex gap-2 justify-end">
                                    <button type="button" onClick={handleSaveEditedSubTask} className="p-1.5 text-success hover:text-success-focus focus:outline-none rounded-md bg-base-200 hover:bg-success/20" title="Save Sub-task">
                                        <SaveIcon className="w-5 h-5"/>
                                    </button>
                                    <button type="button" onClick={handleCancelEditSubTask} className="p-1.5 text-neutral-content hover:opacity-70 focus:outline-none rounded-md bg-base-200 hover:bg-neutral/30" title="Cancel Edit">
                                        <CancelIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start justify-between">
                                <div className="text-sm text-base-content-secondary flex-grow pr-2">
                                  {/* Using UrlRenderer here for consistency if needed, or keep as <p> if simple text is fine */}
                                  <p className="whitespace-pre-wrap">{subTask.title}</p>
                                  {subTask.category && <p className="text-xs text-base-content-secondary/70 mt-0.5">{subTask.category}</p>}
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                    <button type="button" onClick={() => handleEditSubTask(index)} className="p-1 text-secondary hover:text-secondary-focus focus:outline-none" title="Edit Sub-task">
                                        <PencilSquareIcon className="w-4 h-4"/>
                                    </button>
                                    <button type="button" onClick={() => handleRemoveSubTask(index)} className="p-1 text-error hover:text-error-focus focus:outline-none" title="Remove Sub-task">
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {editingSubTask === null && (
              <div className="mt-4 p-3 border border-dashed border-base-300 rounded-md space-y-2">
                  <textarea
                      value={currentSubTaskTitle}
                      onChange={(e) => setCurrentSubTaskTitle(e.target.value)}
                      onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddSubTask();}}}
                      placeholder="Enter sub-task title/description (Shift+Enter for new line)"
                      className="block w-full bg-base-200 border border-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      rows={2}
                  />
                  <div className="flex gap-2 items-center">
                    <select 
                        value={currentSubTaskCategory} 
                        onChange={(e) => setCurrentSubTaskCategory(e.target.value as TaskResetCategory | "")}
                        className="flex-grow bg-base-200 border border-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm appearance-none text-xs"
                    >
                        <option value="">No Category (Resets with Parent)</option>
                        {Object.values(TaskResetCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <button type="button" onClick={handleAddSubTask} className="bg-secondary text-white px-3 py-2 rounded-md hover:bg-secondary-focus flex items-center focus:outline-none text-sm">
                        <PlusCircleIcon className="w-4 h-4 mr-1 sm:mr-0 md:mr-1"/> <span className="hidden sm:inline md:hidden lg:inline">Add</span>
                    </button>
                  </div>
              </div>
            )}
            {(taskData.sub_tasks || []).length === 0 && editingSubTask === null && (
                <p className="text-xs text-base-content-secondary mt-2">No sub-tasks yet. Add some if this is a multi-step task.</p>
            )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-base-300 rounded-md text-sm font-medium hover:bg-base-300/70 focus:outline-none">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-focus focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-focus" disabled={editingSubTask !== null}>
            {editingSubTask !== null ? "Save Task (Complete Sub-task Edit First)" : (existingTask ? "Save Changes" : "Add Task")}
          </button>
        </div>
      </form>
    </Modal>
  );
};
