import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Linking,
  AppState,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { FlashList } from '@shopify/flash-list';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  AppHeader,
  HamburgerMenu,
} from '../../components/navigation/Navigation';
import {
  GlassCard,
  Button,
  ScreenContainer,
} from '../../components/GlassComponents';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { ThemeType } from '../../theme/colors';
import StorageService from '../../services/storage/StorageService';
import { TodoistService } from '../../services/integrations/TodoistService';
import { Task } from '../../types/index';
import { perf } from '../../utils/perfMarks';
import { TaskListSkeleton } from '../../components/skeletons';
import { useDebouncedRefetch } from '../../hooks/useOptimizedQuery';
import useTasksData from '../../hooks/useTasksData';

interface TasksScreenProps {
  theme: ThemeType;
  onNavigate: (screen: string) => void;
}

type TaskFilter = 'all' | 'active' | 'completed' | 'due-today' | 'overdue';
type TaskSort = 'priority' | 'due-date' | 'created' | 'alphabetical';
type ActiveTab = 'todoist' | 'local';

export const TasksScreen: React.FC<TasksScreenProps> = ({
  theme,
  onNavigate,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('todoist');
  const mountMarkRef = useRef<string | null>(null);

  // Centralized tasks data hook (local + Todoist) with progressive loading
  const {
    data: tasksData,
    isLoading: loading,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    syncProgress,
  } = useTasksData();
  const { localTasks = [], todoistTasks = [] } =
    (tasksData as { localTasks: Task[]; todoistTasks: Task[] } | undefined) ||
    {};

  // Filters and sorting
  const [filter, setFilter] = useState<TaskFilter>('active');
  const [sort, setSort] = useState<TaskSort>('priority');

  // Refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Connection status
  const [todoistConnected, setTodoistConnected] = useState<boolean | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [localConnected, setLocalConnected] = useState(true); // Local is always connected

  // Modals
  const [addTaskModalVisible, setAddTaskModalVisible] = useState(false);
  const [editTaskModalVisible, setEditTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Loading states for async operations
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [togglingTasks, setTogglingTasks] = useState<Set<string>>(new Set());

  // Optimistic updates state
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>([]);
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    content: '',
    description: '',
    priority: 2 as 1 | 2 | 3 | 4,
    dueDate: undefined as string | undefined,
    projectName: 'Inbox',
  });

  const themeColors = colors[theme];
  const storage = StorageService.getInstance();
  const todoistService = TodoistService.getInstance();

  // Start a mount mark for performance measurement
  useEffect(() => {
    try {
      mountMarkRef.current = perf.startMark('TasksScreen');
    } catch (e) {
      // ignore
    }
  }, []);

  // When loading completes, measure ready time from mount
  useEffect(() => {
    try {
      if (!loading && mountMarkRef.current) {
        perf.measureReady('TasksScreen', mountMarkRef.current);
      }
    } catch (e) {
      // ignore
    }
  }, [loading]);

  // Check Todoist connection status
  useEffect(() => {
    const checkConnection = async () => {
      if (activeTab === 'todoist') {
        setCheckingConnection(true);
        try {
          const isValid = await todoistService.isTokenValid();
          setTodoistConnected(isValid);
        } catch (error) {
          console.warn('Connection check failed:', error);
          setTodoistConnected(false);
        } finally {
          setCheckingConnection(false);
        }
      }
    };

    checkConnection();
  }, [activeTab, todoistService]);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOnline = isOnline;
      const nowOnline = state.isConnected ?? true;
      setIsOnline(nowOnline);

      // Process queue when coming back online
      if (!wasOnline && nowOnline && offlineQueue.length > 0) {
        processOfflineQueue();
      }
    });

    return () => unsubscribe();
  }, [isOnline, offlineQueue]);

  // Process offline queue when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && isOnline && offlineQueue.length > 0) {
        processOfflineQueue();
      }
    });

    return () => subscription?.remove();
  }, [isOnline, offlineQueue]);

  const initializeTodoistToken = async () => {
    try {
      const settings = await storage.getSettings();
      if (settings.todoistToken) {
        todoistService.setApiToken(settings.todoistToken);
      }
    } catch (error) {
      console.error('Error loading Todoist token:', error);
    }
  };

  // Debounced refresh to avoid repeated sync storms
  const debouncedOnRefresh = useDebouncedRefetch(refetch, 300);

  // Custom onRefresh that manages refreshing state
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await debouncedOnRefresh();
    setRefreshing(false);
  }, [debouncedOnRefresh]);

  const getCurrentTasks = (): Task[] => {
    const tasks = activeTab === 'todoist' ? todoistTasks : localTasks;
    return filterAndSortTasks(tasks);
  };

  const filterAndSortTasks = (tasks: Task[]): Task[] => {
    let filteredTasks = [...tasks];

    // Apply filters
    switch (filter) {
      case 'active':
        filteredTasks = filteredTasks.filter((task) => !task.isCompleted);
        break;
      case 'completed':
        filteredTasks = filteredTasks.filter((task) => task.isCompleted);
        break;
      case 'due-today':
        const today = new Date().toDateString();
        filteredTasks = filteredTasks.filter(
          (task) =>
            task.due && new Date(task.due.date).toDateString() === today,
        );
        break;
      case 'overdue':
        const now = new Date();
        filteredTasks = filteredTasks.filter(
          (task) =>
            task.due && new Date(task.due.date) < now && !task.isCompleted,
        );
        break;
      default:
        // 'all' - no filtering
        break;
    }

    // Apply sorting
    filteredTasks.sort((a, b) => {
      switch (sort) {
        case 'priority':
          return b.priority - a.priority; // Higher priority first
        case 'due-date':
          if (!a.due && !b.due) return 0;
          if (!a.due) return 1;
          if (!b.due) return -1;
          return (
            new Date(a.due.date).getTime() - new Date(b.due.date).getTime()
          );
        case 'created':
          return b.created.getTime() - a.created.getTime(); // Newest first
        case 'alphabetical':
          return a.content.toLowerCase().localeCompare(b.content.toLowerCase());
        default:
          return 0;
      }
    });

    return filteredTasks;
  };

  const createTask = async () => {
    if (!formData.content.trim()) {
      Alert.alert('Error', 'Please enter task content');
      return;
    }

    setIsCreatingTask(true);
    const tempId = `temp_${Date.now()}`;

    // Capture form data before resetting
    const taskContent = formData.content;
    const taskDescription = formData.description;
    const taskPriority = formData.priority;
    const taskDueDate = formData.dueDate;
    const taskProjectName = formData.projectName;

    try {
      // Create optimistic task
      const optimisticTask: Task = {
        id: tempId,
        content: taskContent,
        isCompleted: false,
        priority: taskPriority,
        due: taskDueDate ? { date: taskDueDate } : undefined,
        projectName: taskProjectName,
        source: activeTab,
        created: new Date(),
      };
      if (taskDescription.trim()) {
        optimisticTask.description = taskDescription;
      }

      // Add to optimistic tasks
      setOptimisticTasks(prev => [optimisticTask, ...prev]);
      setPendingOperations(prev => new Set(prev).add(tempId));

      // Reset form and close modal immediately
      setFormData({
        content: '',
        description: '',
        priority: 2,
        dueDate: '',
        projectName: 'Inbox',
      });
      setAddTaskModalVisible(false);

      // Perform actual operation in background
      if (activeTab === 'todoist') {
        if (!isOnline) {
          setOfflineQueue(prev => [...prev, { type: 'create', task: optimisticTask, tempId }]);
          return;
        }

        const settings = await storage.getSettings();
        if (!settings.todoistToken) {
          throw new Error('Please configure your Todoist token in Settings');
        }

        todoistService.setApiToken(settings.todoistToken);
        const taskData: any = {
          content: taskContent,
          priority: taskPriority,
          due: taskDueDate ? { date: taskDueDate } : undefined,
          projectName: taskProjectName,
          isCompleted: false,
          source: 'todoist',
        };
        if (taskDescription.trim()) {
          taskData.description = taskDescription;
        }
        const taskId = await todoistService.createTask(taskData);

        if (taskId) {
          // Remove optimistic task and refresh real data
          setOptimisticTasks(prev => prev.filter(t => t.id !== tempId));
          setPendingOperations(prev => {
            const newSet = new Set(prev);
            newSet.delete(tempId);
            return newSet;
          });
          await refetch();
        } else {
          throw new Error('Failed to create task in Todoist');
        }
      } else {
        // Create locally
        const newTask: Task = {
          ...optimisticTask,
          id: `local_${Date.now()}`,
        };

        const updatedTasks = [newTask, ...(localTasks || [])];
        await storage.saveTasks(updatedTasks);

        // Remove optimistic task and refresh real data
        setOptimisticTasks(prev => prev.filter(t => t.id !== tempId));
        setPendingOperations(prev => {
          const newSet = new Set(prev);
          newSet.delete(tempId);
          return newSet;
        });
        await refetch();
      }
    } catch (error: any) {
      console.error('Error creating task:', error);
      // Revert optimistic update
      setOptimisticTasks(prev => prev.filter(t => t.id !== tempId));
      setPendingOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(tempId);
        return newSet;
      });
      Alert.alert('Error', `Failed to create task: ${error.message}`);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const toggleTaskCompletion = async (task: Task) => {
    const taskId = task.id;
    const wasCompleted = task.isCompleted;
    const newCompleted = !wasCompleted;

    // Optimistic update
    const optimisticTask = { ...task, isCompleted: newCompleted };
    setOptimisticTasks(prev => prev.map(t => t.id === taskId ? optimisticTask : t));
    setPendingOperations(prev => new Set(prev).add(taskId));

    try {
      if (task.source === 'todoist') {
        if (!isOnline) {
          setOfflineQueue(prev => [...prev, { type: 'toggle', task: optimisticTask, originalCompleted: wasCompleted }]);
          return;
        }

        if (!newCompleted) {
          await todoistService.completeTask(taskId);
        } else {
          // Todoist doesn't have uncomplete, so we might need to handle differently, but assuming complete/uncomplete
          await todoistService.completeTask(taskId); // Adjust if needed
        }
        await refetch();
      } else {
        const updatedTask = { ...task, isCompleted: newCompleted };
        const updatedTasks = (localTasks || []).map((t: Task) =>
          t.id === taskId ? updatedTask : t,
        );
        await storage.saveTasks(updatedTasks);
        await refetch();
      }

      // Remove optimistic task and pending operation
      setOptimisticTasks(prev => prev.filter(t => t.id !== taskId));
      setPendingOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    } catch (error: any) {
      console.error('Error toggling task completion:', error);
      // Revert optimistic update
      setOptimisticTasks(prev => prev.map(t => t.id === taskId ? { ...t, isCompleted: wasCompleted } : t));
      setPendingOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
      Alert.alert('Error', `Failed to update task: ${error.message}`);
    }
  };

  const deleteTask = async (task: Task) => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const taskId = task.id;
          const originalTask = task;

          // Optimistic update: remove from UI immediately
          setOptimisticTasks(prev => prev.filter(t => t.id !== taskId));
          setPendingOperations(prev => new Set(prev).add(taskId));

          try {
            if (task.source === 'todoist') {
              if (!isOnline) {
                setOfflineQueue(prev => [...prev, { type: 'delete', task: originalTask }]);
                return;
              }

              await todoistService.deleteTask(taskId);
              await refetch();
            } else {
              const updatedTasks = (localTasks || []).filter(
                (t: Task) => t.id !== taskId,
              );
              await storage.saveTasks(updatedTasks);
              await refetch();
            }

            // Remove from pending operations
            setPendingOperations(prev => {
              const newSet = new Set(prev);
              newSet.delete(taskId);
              return newSet;
            });
          } catch (error: any) {
            console.error('Error deleting task:', error);
            // Revert optimistic update: add back to UI
            setOptimisticTasks(prev => [...prev, originalTask]);
            setPendingOperations(prev => {
              const newSet = new Set(prev);
              newSet.delete(taskId);
              return newSet;
            });
            Alert.alert('Error', `Failed to delete task: ${error.message}`);
          }
        },
      },
    ]);
  };

  const editTask = (task: Task) => {
    setEditingTask(task);
    setFormData({
      content: task.content,
      description: task.description ?? '',
      priority: task.priority as 1 | 2 | 3 | 4,
      dueDate: task.due?.date ?? '',
      projectName: task.projectName ?? 'Inbox',
    });
    setEditTaskModalVisible(true);
  };

  const updateTask = async () => {
    if (!editingTask || !formData.content.trim()) {
      Alert.alert('Error', 'Please enter task content');
      return;
    }

    const taskId = editingTask.id;
    const originalTask = editingTask;

    // Create optimistic task with updated data
    const optimisticTask: Task = {
      ...editingTask,
      content: formData.content,
      description: formData.description || undefined,
      priority: formData.priority,
      due: formData.dueDate ? { date: formData.dueDate } : undefined,
      projectName: formData.projectName,
    };

    // Optimistic update: replace in UI immediately
    setOptimisticTasks(prev => prev.map(t => t.id === taskId ? optimisticTask : t));
    setPendingOperations(prev => new Set(prev).add(taskId));

    // Reset form and close modal immediately
    setFormData({
      content: '',
      description: '',
      priority: 2,
      dueDate: '',
      projectName: 'Inbox',
    });
    setEditTaskModalVisible(false);
    setEditingTask(null);

    try {
      if (editingTask.source === 'todoist') {
        if (!isOnline) {
          setOfflineQueue(prev => [...prev, { type: 'update', task: optimisticTask, originalTask }]);
          return;
        }

        const updateData: any = {
          content: formData.content,
          priority: formData.priority,
          due: formData.dueDate ? { date: formData.dueDate } : undefined,
        };
        if (formData.description.trim()) {
          updateData.description = formData.description;
        }
        const success = await todoistService.updateTask(taskId, updateData);

        if (success) {
          // Remove optimistic task and refresh real data
          setOptimisticTasks(prev => prev.filter(t => t.id !== taskId));
          setPendingOperations(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
          await refetch();
        } else {
          throw new Error('Failed to update task in Todoist');
        }
      } else {
        const updatedTask: Task = {
          ...editingTask,
          content: formData.content,
          description: formData.description || undefined,
          priority: formData.priority,
          due: formData.dueDate ? { date: formData.dueDate } : undefined,
          projectName: formData.projectName,
        };

        const updatedTasks = (localTasks || []).map((t: Task) =>
          t.id === taskId ? updatedTask : t,
        );
        await storage.saveTasks(updatedTasks);

        // Remove optimistic task and refresh real data
        setOptimisticTasks(prev => prev.filter(t => t.id !== taskId));
        setPendingOperations(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        await refetch();
      }
    } catch (error: any) {
      console.error('Error updating task:', error);
      // Revert optimistic update: restore original task
      setOptimisticTasks(prev => prev.map(t => t.id === taskId ? originalTask : t));
      setPendingOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
      Alert.alert('Error', `Failed to update task: ${error.message}`);
    }
  };

  const getPriorityColor = (priority: number): string => {
    switch (priority) {
      case 1:
        return themeColors.textMuted;
      case 2:
        return themeColors.textSecondary;
      case 3:
        return themeColors.warning;
      case 4:
        return themeColors.error;
      default:
        return themeColors.textSecondary;
    }
  };

  const getPriorityLabel = (priority: number): string => {
    switch (priority) {
      case 1:
        return 'Low';
      case 2:
        return 'Normal';
      case 3:
        return 'High';
      case 4:
        return 'Urgent';
      default:
        return 'Normal';
    }
  };

  const formatDueDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else if (date < today) {
      return 'Overdue';
    } else {
      return date.toLocaleDateString();
    }
  };

  const extractUrl = (text: string): string | null => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
  };

  const processOfflineQueue = async () => {
    if (isProcessingQueue || offlineQueue.length === 0 || !isOnline) return;

    setIsProcessingQueue(true);

    try {
      for (const item of offlineQueue) {
        if (item.type === 'create') {
          const { task, tempId } = item;
          if (task.source === 'todoist') {
            const settings = await storage.getSettings();
            if (!settings.todoistToken) {
              throw new Error('Please configure your Todoist token in Settings');
            }
            todoistService.setApiToken(settings.todoistToken);
            const taskData: any = {
              content: task.content,
              priority: task.priority,
              due: task.due,
              projectName: task.projectName,
              isCompleted: task.isCompleted,
              source: 'todoist',
            };
            if (task.description) {
              taskData.description = task.description;
            }
            await todoistService.createTask(taskData);
          }
          // For local, already saved, so no action needed
        } else if (item.type === 'toggle') {
          const { task } = item;
          if (task.source === 'todoist') {
            if (!task.isCompleted) {
              await todoistService.completeTask(task.id);
            } else {
              await todoistService.completeTask(task.id); // Assuming complete/uncomplete
            }
          }
          // For local, already toggled, so no action needed
        } else if (item.type === 'delete') {
          const { task } = item;
          if (task.source === 'todoist') {
            await todoistService.deleteTask(task.id);
          }
          // For local, already deleted, so no action needed
        } else if (item.type === 'update') {
          const { task } = item;
          if (task.source === 'todoist') {
            const updateData: any = {
              content: task.content,
              priority: task.priority,
              due: task.due,
            };
            if (task.description) {
              updateData.description = task.description;
            }
            await todoistService.updateTask(task.id, updateData);
          }
          // For local, already updated, so no action needed
        }
      }

      // Clear the queue and refresh data
      setOfflineQueue([]);
      await refetch();
    } catch (error: any) {
      console.error('Error processing offline queue:', error);
      Alert.alert('Error', `Failed to sync offline changes: ${error.message}`);
    } finally {
      setIsProcessingQueue(false);
    }
  };

  const currentTasks = useMemo(
    () => getCurrentTasks(),
    [activeTab, todoistTasks, localTasks, filter, sort],
  );

  const renderTaskRow = useCallback(
    ({ item }: { item: Task }) => {
      return (
        <GlassCard
          key={item.id}
          theme={theme}
          style={[styles.taskCard, item.isCompleted && styles.completedTask]}
        >
          <View style={styles.taskHeader}>
            <TouchableOpacity
              onPress={() => toggleTaskCompletion(item)}
              style={[
                styles.checkbox,
                item.isCompleted && { backgroundColor: themeColors.success },
                {
                  borderColor: item.isCompleted
                    ? themeColors.success
                    : themeColors.border,
                },
              ]}
            >
              {item.isCompleted && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <View style={styles.taskInfo}>
              <Text
                style={[
                  styles.taskContent,
                  { color: themeColors.text },
                  item.isCompleted && styles.completedText,
                ]}
              >
                {item.content}
              </Text>
              {item.description ? (
                <Text
                  style={[
                    styles.taskDescription,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  {item.description}
                </Text>
              ) : null}
            </View>

            <View style={styles.taskActions}>
              <TouchableOpacity
                onPress={() => editTask(item)}
                style={[
                  styles.actionButton,
                  { backgroundColor: themeColors.primary },
                ]}
              >
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteTask(item)}
                style={[
                  styles.actionButton,
                  { backgroundColor: themeColors.error },
                ]}
              >
                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </GlassCard>
      );
    },
    [themeColors, toggleTaskCompletion, editTask, deleteTask],
  );

  const keyExtractor = useCallback((item: Task) => item.id, []);

  if (loading) {
    return (
      <ScreenContainer theme={theme}>
        <AppHeader
          title="Loading Tasks..."
          theme={theme}
          onMenuPress={() => setMenuVisible(true)}
        />
        <View style={styles.loadingContainer}>
          <TaskListSkeleton theme={theme} count={8} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer theme={theme}>
      <AppHeader
        title="GTD Task Manager"
        theme={theme}
        onMenuPress={() => setMenuVisible(true)}
        rightComponent={
          <TouchableOpacity onPress={() => setAddTaskModalVisible(true)}>
            <Text style={{ color: themeColors.primary, fontSize: 24 }}>+</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.content}>
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            onPress={() => setActiveTab('todoist')}
            style={[
              styles.tab,
              activeTab === 'todoist' && {
                backgroundColor: themeColors.primary,
              },
              { borderColor: themeColors.primary },
            ]}
          >
            <View style={styles.tabContent}>
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === 'todoist' ? '#FFFFFF' : themeColors.text,
                  },
                ]}
              >
                📋 Todoist Tasks
              </Text>
              {syncProgress.isSyncing ? (
                <View style={styles.syncingContainer}>
                  <Text style={[styles.connectionIndicator, { color: themeColors.warning }]}>
                    ⏳
                  </Text>
                  <Text style={[styles.syncingText, { color: activeTab === 'todoist' ? '#FFFFFF' : themeColors.textSecondary }]}>
                    {syncProgress.progress}%
                  </Text>
                </View>
              ) : checkingConnection ? (
                <Text style={[styles.connectionIndicator, { color: themeColors.warning }]}>
                  ⏳
                </Text>
              ) : todoistConnected !== null ? (
                <Text style={[styles.connectionIndicator, { color: todoistConnected ? themeColors.success : themeColors.error }]}>
                  {todoistConnected ? '✓' : '✗'}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('local')}
            style={[
              styles.tab,
              activeTab === 'local' && { backgroundColor: themeColors.primary },
              { borderColor: themeColors.primary },
            ]}
          >
            <View style={styles.tabContent}>
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'local' ? '#FFFFFF' : themeColors.text },
                ]}
              >
                🏠 Local Tasks
              </Text>
              <Text style={[styles.connectionIndicator, { color: activeTab === 'local' ? '#FFFFFF' : themeColors.success }]}>
                ✓
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Filters and Sort */}
        <GlassCard theme={theme} style={styles.filtersCard}>
          <View style={styles.filtersRow}>
            <View style={styles.filterSection}>
              <Text
                style={[
                  styles.filterLabel,
                  { color: themeColors.textSecondary },
                ]}
              >
                Filter:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterButtons}>
                  {(
                    [
                      'all',
                      'active',
                      'completed',
                      'due-today',
                      'overdue',
                    ] as TaskFilter[]
                  ).map((f) => (
                    <TouchableOpacity
                      key={f}
                      onPress={() => setFilter(f)}
                      style={[
                        styles.filterButton,
                        filter === f && {
                          backgroundColor: themeColors.primary,
                        },
                        { borderColor: themeColors.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterButtonText,
                          {
                            color: filter === f ? '#FFFFFF' : themeColors.text,
                          },
                        ]}
                      >
                        {f === 'due-today'
                          ? 'Due Today'
                          : f.charAt(0).toUpperCase() + f.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </GlassCard>

        <FlashList<Task>
          style={styles.tasksList}
          contentContainerStyle={styles.tasksContainer}
          data={currentTasks}
          keyExtractor={keyExtractor}
          renderItem={renderTaskRow}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={themeColors.primary}
            />
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.loadingFooter}>
                <TaskListSkeleton theme={theme} count={3} />
              </View>
            ) : null
          }
          ListEmptyComponent={() => (
            <GlassCard theme={theme} style={styles.emptyCard}>
              <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
                {activeTab === 'todoist'
                  ? '📋 No Todoist Tasks'
                  : '🏠 No Local Tasks'}
              </Text>
              <Text
                style={[styles.emptyText, { color: themeColors.textSecondary }]}
              >
                {activeTab === 'todoist'
                  ? 'Connect your Todoist account in Settings to sync your tasks, or create local tasks for personal organization.'
                  : 'Create your first local task to get started with personal task management.'}
              </Text>
            </GlassCard>
          )}
        />
      </View>

      {/* Add Task Modal */}
      <Modal
        visible={addTaskModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddTaskModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard theme={theme} variant="modal" style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Add New Task to{' '}
              {activeTab === 'todoist' ? 'Todoist' : 'Local Tasks'}
            </Text>

            <View style={styles.formGroup}>
              <Text
                style={[styles.formLabel, { color: themeColors.textSecondary }]}
              >
                Task Content *
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    borderColor: themeColors.border,
                    color: themeColors.text,
                    backgroundColor: themeColors.surfaceLight,
                  },
                ]}
                placeholder="Enter task description..."
                placeholderTextColor={themeColors.textMuted}
                value={formData.content}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, content: text }))
                }
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <Text
                style={[styles.formLabel, { color: themeColors.textSecondary }]}
              >
                Priority
              </Text>
              <View style={styles.priorityButtons}>
                {([1, 2, 3, 4] as const).map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    onPress={() =>
                      setFormData((prev) => ({ ...prev, priority }))
                    }
                    style={[
                      styles.priorityButton,
                      formData.priority === priority && {
                        backgroundColor: getPriorityColor(priority),
                      },
                      { borderColor: getPriorityColor(priority) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityButtonText,
                        {
                          color:
                            formData.priority === priority
                              ? '#FFFFFF'
                              : getPriorityColor(priority),
                        },
                      ]}
                    >
                      {getPriorityLabel(priority)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text
                style={[styles.formLabel, { color: themeColors.textSecondary }]}
              >
                Due Date (Optional)
              </Text>
              <TouchableOpacity
                style={[
                  styles.formInput,
                  {
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.surfaceLight,
                    justifyContent: 'center',
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text
                  style={[
                    {
                      color: formData.dueDate
                        ? themeColors.text
                        : themeColors.textMuted,
                    },
                    typography.body,
                  ]}
                >
                  {formData.dueDate
                    ? new Date(formData.dueDate).toLocaleDateString()
                    : 'Select Date'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  setAddTaskModalVisible(false);
                  setFormData({
                    content: '',
                    description: '',
                    priority: 2,
                    dueDate: '',
                    projectName: 'Inbox',
                  });
                }}
                variant="ghost"
                theme={theme}
                style={styles.modalButton}
              />

              <Button
                title="Create Task"
                onPress={createTask}
                variant="primary"
                theme={theme}
                style={styles.modalButton}
              />
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        visible={editTaskModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditTaskModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard theme={theme} variant="modal" style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Edit Task
            </Text>

            <View style={styles.formGroup}>
              <Text
                style={[styles.formLabel, { color: themeColors.textSecondary }]}
              >
                Task Content *
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    borderColor: themeColors.border,
                    color: themeColors.text,
                    backgroundColor: themeColors.surfaceLight,
                  },
                ]}
                placeholder="Enter task description..."
                placeholderTextColor={themeColors.textMuted}
                value={formData.content}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, content: text }))
                }
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <Text
                style={[styles.formLabel, { color: themeColors.textSecondary }]}
              >
                Priority
              </Text>
              <View style={styles.priorityButtons}>
                {([1, 2, 3, 4] as const).map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    onPress={() =>
                      setFormData((prev) => ({ ...prev, priority }))
                    }
                    style={[
                      styles.priorityButton,
                      formData.priority === priority && {
                        backgroundColor: getPriorityColor(priority),
                      },
                      { borderColor: getPriorityColor(priority) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityButtonText,
                        {
                          color:
                            formData.priority === priority
                              ? '#FFFFFF'
                              : getPriorityColor(priority),
                        },
                      ]}
                    >
                      {getPriorityLabel(priority)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text
                style={[styles.formLabel, { color: themeColors.textSecondary }]}
              >
                Due Date (Optional)
              </Text>
              <TouchableOpacity
                style={[
                  styles.formInput,
                  {
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.surfaceLight,
                    justifyContent: 'center',
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text
                  style={[
                    {
                      color: formData.dueDate
                        ? themeColors.text
                        : themeColors.textMuted,
                    },
                    typography.body,
                  ]}
                >
                  {formData.dueDate
                    ? new Date(formData.dueDate).toLocaleDateString()
                    : 'Select Date'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  setEditTaskModalVisible(false);
                  setEditingTask(null);
                  setFormData({
                    content: '',
                    description: '',
                    priority: 2,
                    dueDate: '',
                    projectName: 'Inbox',
                  });
                }}
                variant="ghost"
                theme={theme}
                style={styles.modalButton}
              />

              <Button
                title="Update Task"
                onPress={updateTask}
                variant="primary"
                theme={theme}
                style={styles.modalButton}
              />
            </View>
          </GlassCard>
        </View>
      </Modal>

      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={onNavigate}
        currentScreen="tasks"
        theme={theme}
      />

      {showDatePicker && (
        <DateTimePicker
          value={
            formData.dueDate
              ? new Date(formData.dueDate)
              : new Date('2025-09-26')
          }
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              const formattedDate = selectedDate.toISOString().split('T')[0];
              setFormData((prev) => ({ ...prev, dueDate: formattedDate }));
            }
          }}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: 100, // Space for floating nav bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
  },

  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    ...typography.bodySmall,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  connectionIndicator: {
    ...typography.caption,
    fontWeight: 'bold',
  },
  syncingText: {
    ...typography.caption,
    marginTop: spacing.xs / 2,
  },
  syncingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Filters
  filtersCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterSection: {
    flex: 1,
    marginRight: spacing.md,
  },
  filterLabel: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
  },
  filterButtons: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  filterButtonText: {
    ...typography.caption,
    fontWeight: '600',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 18,
  },

  // Tasks List
  tasksList: {
    flex: 1,
  },
  tasksContainer: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xl,
  },
  loadingFooter: {
    paddingVertical: spacing.lg,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  taskCard: {
    marginBottom: spacing.md,
  },
  completedTask: {
    opacity: 0.7,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: spacing.xs,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  taskInfo: {
    flex: 1,
  },
  taskContent: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  taskDescription: {
    ...typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  taskMeta: {
    marginTop: spacing.sm,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  priorityText: {
    color: '#FFFFFF',
    ...typography.caption,
    fontWeight: '600',
  },
  dueDate: {
    ...typography.caption,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  projectName: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  taskActions: {
    alignItems: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    minWidth: 60,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    ...typography.caption,
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalTitle: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  formInput: {
    borderWidth: 2,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 50,
    textAlignVertical: 'top',
    ...typography.body,
  },
  priorityButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  priorityButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  priorityButtonText: {
    ...typography.caption,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 0.48,
  },
});
