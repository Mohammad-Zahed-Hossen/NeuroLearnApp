import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AppHeader, HamburgerMenu } from '../components/Navigation';
import {
  GlassCard,
  Button,
  ScreenContainer,
} from '../components/GlassComponents';
import { colors, spacing, typography, borderRadius } from '../theme/colors';
import { ThemeType } from '../theme/colors';
import HybridStorageService from '../services/HybridStorageService';
import { TodoistService } from '../services/TodoistService';
import { Task } from '../types/index';

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
  const [todoistTasks, setTodoistTasks] = useState<Task[]>([]);
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingTodoist, setSyncingTodoist] = useState(false);

  // Filters and sorting
  const [filter, setFilter] = useState<TaskFilter>('active');
  const [sort, setSort] = useState<TaskSort>('priority');

  // Modals
  const [addTaskModalVisible, setAddTaskModalVisible] = useState(false);
  const [editTaskModalVisible, setEditTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    content: '',
    description: '',
    priority: 2 as 1 | 2 | 3 | 4,
    dueDate: '',
    projectName: 'Inbox',
  });

  const themeColors = colors[theme];
  const storage = HybridStorageService.getInstance();
  const todoistService = TodoistService.getInstance();

  useEffect(() => {
    loadTasks();
    initializeTodoistToken();
  }, []);

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

  const loadTasks = async () => {
    try {
      setLoading(true);
      const localTasksData = await storage.getTasks();
      setLocalTasks(localTasksData);

      // Try to load Todoist tasks if token is available
      await syncTodoistTasks();
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncTodoistTasks = async () => {
    try {
      setSyncingTodoist(true);
      const settings = await storage.getSettings();

      if (!settings.todoistToken) {
        setTodoistTasks([]);
        return;
      }

      todoistService.setApiToken(settings.todoistToken);
      const tasks = await todoistService.getTasks();
      setTodoistTasks(tasks);
    } catch (error) {
      console.error('Error syncing Todoist tasks:', error);
      setTodoistTasks([]);
    } finally {
      setSyncingTodoist(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

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

    try {
      if (activeTab === 'todoist') {
        // Create in Todoist
        const settings = await storage.getSettings();
        if (!settings.todoistToken) {
          Alert.alert(
            'Error',
            'Please configure your Todoist token in Settings',
          );
          return;
        }

        todoistService.setApiToken(settings.todoistToken);
        const taskId = await todoistService.createTask({
          content: formData.content,
          description: formData.description || undefined,
          priority: formData.priority,
          due: formData.dueDate ? { date: formData.dueDate } : undefined,
          projectName: formData.projectName,
          isCompleted: false,
          source: 'todoist',
          labels: [],
        });

        if (taskId) {
          await syncTodoistTasks();
        } else {
          Alert.alert('Error', 'Failed to create task in Todoist');
        }
      } else {
        // Create locally
        const newTask: Task = {
          id: `local_${Date.now()}`,
          content: formData.content,
          description: formData.description || undefined,
          isCompleted: false,
          priority: formData.priority,
          due: formData.dueDate ? { date: formData.dueDate } : undefined,
          projectName: formData.projectName,
          source: 'local',
          created: new Date(),
        };

        const updatedTasks = [newTask, ...localTasks];
        await storage.saveTasks(updatedTasks);
        setLocalTasks(updatedTasks);
      }

      // Reset form and close modal
      setFormData({
        content: '',
        description: '',
        priority: 2,
        dueDate: '',
        projectName: 'Inbox',
      });
      setAddTaskModalVisible(false);
    } catch (error: any) {
      console.error('Error creating task:', error);
      Alert.alert('Error', `Failed to create task: ${error.message}`);
    }
  };

  const toggleTaskCompletion = async (task: Task) => {
    try {
      if (task.source === 'todoist') {
        if (!task.isCompleted) {
          await todoistService.completeTask(task.id);
          setTodoistTasks((prev) =>
            prev.map((t) =>
              t.id === task.id ? { ...t, isCompleted: true } : t,
            ),
          );
        }
      } else {
        const updatedTask = { ...task, isCompleted: !task.isCompleted };
        const updatedTasks = localTasks.map((t) =>
          t.id === task.id ? updatedTask : t,
        );
        await storage.saveTasks(updatedTasks);
        setLocalTasks(updatedTasks);
      }
    } catch (error: any) {
      console.error('Error toggling task completion:', error);
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
          try {
            if (task.source === 'todoist') {
              await todoistService.deleteTask(task.id);
              setTodoistTasks((prev) => prev.filter((t) => t.id !== task.id));
            } else {
              const updatedTasks = localTasks.filter((t) => t.id !== task.id);
              await storage.saveTasks(updatedTasks);
              setLocalTasks(updatedTasks);
            }
          } catch (error: any) {
            console.error('Error deleting task:', error);
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
      description: task.description || '',
      priority: task.priority,
      dueDate: task.due?.date || '',
      projectName: task.projectName || 'Inbox',
    });
    setEditTaskModalVisible(true);
  };

  const updateTask = async () => {
    if (!editingTask || !formData.content.trim()) {
      Alert.alert('Error', 'Please enter task content');
      return;
    }

    try {
      if (editingTask.source === 'todoist') {
        const success = await todoistService.updateTask(editingTask.id, {
          content: formData.content,
          description: formData.description || undefined,
          priority: formData.priority,
          due: formData.dueDate ? { date: formData.dueDate } : undefined,
        });

        if (success) {
          await syncTodoistTasks();
        } else {
          Alert.alert('Error', 'Failed to update task in Todoist');
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

        const updatedTasks = localTasks.map((t) =>
          t.id === editingTask.id ? updatedTask : t,
        );
        await storage.saveTasks(updatedTasks);
        setLocalTasks(updatedTasks);
      }

      // Reset form and close modal
      setFormData({
        content: '',
        description: '',
        priority: 2,
        dueDate: '',
        projectName: 'Inbox',
      });
      setEditTaskModalVisible(false);
      setEditingTask(null);
    } catch (error: any) {
      console.error('Error updating task:', error);
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

  const currentTasks = getCurrentTasks();

  if (loading) {
    return (
      <ScreenContainer theme={theme}>
        <AppHeader
          title="Loading..."
          theme={theme}
          onMenuPress={() => setMenuVisible(true)}
        />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: themeColors.text }]}>
            Loading your tasks...
          </Text>
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
            {syncingTodoist && (
              <Text
                style={[
                  styles.syncingText,
                  {
                    color:
                      activeTab === 'todoist'
                        ? '#FFFFFF'
                        : themeColors.textMuted,
                  },
                ]}
              >
                Syncing...
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('local')}
            style={[
              styles.tab,
              activeTab === 'local' && { backgroundColor: themeColors.primary },
              { borderColor: themeColors.primary },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'local' ? '#FFFFFF' : themeColors.text },
              ]}
            >
              🏠 Local Tasks
            </Text>
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

            <TouchableOpacity
              onPress={activeTab === 'todoist' ? syncTodoistTasks : loadTasks}
              style={[
                styles.refreshButton,
                { backgroundColor: themeColors.surface },
              ]}
              disabled={syncingTodoist}
            >
              <Text
                style={[
                  styles.refreshButtonText,
                  { color: themeColors.primary },
                ]}
              >
                {syncingTodoist ? '⟳' : '↻'}
              </Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Tasks List */}
        <ScrollView
          style={styles.tasksList}
          contentContainerStyle={styles.tasksContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={themeColors.primary}
            />
          }
        >
          {currentTasks.length === 0 ? (
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
          ) : (
            currentTasks.map((task) => (
              <GlassCard
                key={task.id}
                theme={theme}
                style={[
                  styles.taskCard,
                  task.isCompleted && styles.completedTask,
                ]}
              >
                <View style={styles.taskHeader}>
                  <TouchableOpacity
                    onPress={() => toggleTaskCompletion(task)}
                    style={[
                      styles.checkbox,
                      task.isCompleted && {
                        backgroundColor: themeColors.success,
                      },
                      {
                        borderColor: task.isCompleted
                          ? themeColors.success
                          : themeColors.border,
                      },
                    ]}
                  >
                    {task.isCompleted && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.taskInfo}>
                    {(() => {
                      const contentUrl =
                        task.source === 'todoist'
                          ? extractUrl(task.content)
                          : null;
                      return contentUrl ? (
                        <TouchableOpacity
                          onPress={() => Linking.openURL(contentUrl)}
                        >
                          <Text
                            style={[
                              styles.taskContent,
                              { color: themeColors.text },
                              task.isCompleted && styles.completedText,
                            ]}
                          >
                            {task.content}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <Text
                          style={[
                            styles.taskContent,
                            { color: themeColors.text },
                            task.isCompleted && styles.completedText,
                          ]}
                        >
                          {task.content}
                        </Text>
                      );
                    })()}

                    {task.description &&
                      (() => {
                        const descUrl =
                          task.source === 'todoist'
                            ? extractUrl(task.description)
                            : null;
                        return descUrl ? (
                          <TouchableOpacity
                            onPress={() => Linking.openURL(descUrl)}
                          >
                            <Text
                              style={[
                                styles.taskDescription,
                                { color: themeColors.textSecondary },
                              ]}
                            >
                              {task.description}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <Text
                            style={[
                              styles.taskDescription,
                              { color: themeColors.textSecondary },
                            ]}
                          >
                            {task.description}
                          </Text>
                        );
                      })()}

                    <View style={styles.taskMeta}>
                      <View style={styles.taskMetaRow}>
                        <View
                          style={[
                            styles.priorityBadge,
                            {
                              backgroundColor: getPriorityColor(task.priority),
                            },
                          ]}
                        >
                          <Text style={styles.priorityText}>
                            {getPriorityLabel(task.priority)}
                          </Text>
                        </View>

                        {task.due && (
                          <Text
                            style={[
                              styles.dueDate,
                              {
                                color:
                                  new Date(task.due.date) < new Date() &&
                                  !task.isCompleted
                                    ? themeColors.error
                                    : themeColors.textMuted,
                              },
                            ]}
                          >
                            {formatDueDate(task.due.date)}
                          </Text>
                        )}

                        <Text
                          style={[
                            styles.projectName,
                            { color: themeColors.primary },
                          ]}
                        >
                          {task.projectName || 'Inbox'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.taskActions}>
                    <TouchableOpacity
                      onPress={() => editTask(task)}
                      style={[
                        styles.actionButton,
                        { backgroundColor: themeColors.primary },
                      ]}
                    >
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => deleteTask(task)}
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
            ))
          )}
        </ScrollView>
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
  tabText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  syncingText: {
    ...typography.caption,
    marginTop: spacing.xs / 2,
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
