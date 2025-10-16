import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Vibration,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

// GlassCard is a shared component; in some test setups the module may be
// mocked or its named export may be undefined. Provide a safe fallback so
// rendering the chat bubble in tests doesn't fail with "Element type is invalid".
let GlassCardImport: any;
try {
  // eslint-disable-next-line import/no-extraneous-dependencies
  GlassCardImport = require('../GlassComponents').GlassCard;
} catch (e) {
  GlassCardImport = undefined;
}
const GlassCard =
  GlassCardImport ||
  ((props: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(
      View,
      { style: props.style },
      props.children || null,
    );
  });
import { colors } from '../../theme/colors';
import { supabase } from '../../services/storage/SupabaseService';
import AdvancedGeminiService from '../../services/ai/AdvancedGeminiService';
import {
  useRegisterFloatingElement,
  useFloatingElements,
} from '../shared/FloatingElementsContext';
import morphEngine, {
  applyMorph as applyMorphEngine,
  cancelMorph as cancelMorphEngine,
} from '../../features/morphing/morphEngine';
import useMorph from '../../features/morphing/useMorph';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface FloatingChatBubbleProps {
  theme: 'light' | 'dark';
  userId?: string;
  isVisible?: boolean;
  onClose?: () => void;
}

const FloatingChatBubble: React.FC<FloatingChatBubbleProps> = ({
  theme,
  userId,
  isVisible = false,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [showDeadLettersOverlay, setShowDeadLettersOverlay] = useState(false);
  const [isFetchingSessions, setIsFetchingSessions] = useState(false);
  const [recentSessions, setRecentSessions] = useState<
    Array<{ id: string; last: string }>
  >([]);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null,
  );

  // Register with the floating elements orchestrator
  let isBubbleVisible = false;
  let position: any = undefined;
  let zIndex: number | undefined = undefined;
  let floatingCtx: any = {};
  try {
    const reg = useRegisterFloatingElement('aiChat');
    isBubbleVisible = reg?.isVisible ?? false;
    position = reg?.position;
    zIndex = reg?.zIndex;
    floatingCtx = useFloatingElements();
  } catch (e) {
    // In test environments these hooks may throw if provider not present.
    // Fall back to sensible defaults so component remains renderable.
    floatingCtx = { showAIChat: false, setShowAIChat: () => {} };
  }

  // Open chat when orchestrator requests it
  useEffect(() => {
    if (floatingCtx.showAIChat) {
      openChat();
    }
  }, [floatingCtx.showAIChat]);

  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.log(
        '[FloatingChatBubble] floatingCtx.showAIChat',
        floatingCtx.showAIChat,
        'isVisible prop',
        isVisible,
      );
    } catch {}
  }, [floatingCtx.showAIChat, isVisible]);

  // Resolve a valid UUID for user_id. Fallback to Supabase auth if prop is invalid.
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

  const isValidUUID = (val: string | null | undefined) => {
    if (!val) return false;
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(val);
  };

  useEffect(() => {
    const resolveUser = async () => {
      if (isValidUUID(userId)) {
        // userId may be undefined in the prop type; normalize to string | null for state
        setResolvedUserId(userId ?? null);
        return;
      }
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data?.user?.id && isValidUUID(data.user.id)) {
          setResolvedUserId(data.user.id);
        } else {
          setResolvedUserId(null);
        }
      } catch {
        setResolvedUserId(null);
      }
    };
    if (userId !== undefined) {
      resolveUser();
    }
  }, [userId]);

  // Defer obtaining AI service instance until needed. Some tests run this
  // component outside of the full app bootstrap where AdvancedGeminiService
  // may attempt runtime-only initialization (network, env). Use lazy getter
  // so tests can mock AdvancedGeminiService.getInstance or avoid calling it.
  let geminiService: any = null;
  const getGeminiService = () => {
    if (geminiService) return geminiService;
    try {
      // Some test setups might mock this module or not provide the API;
      // guard against thrown errors.
      geminiService =
        AdvancedGeminiService &&
        typeof AdvancedGeminiService.getInstance === 'function'
          ? AdvancedGeminiService.getInstance()
          : null;
      return geminiService;
    } catch (e) {
      return null;
    }
  };
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Animations
  const { scale: bubbleScale, opacity: bubbleOpacity } = useMorph('aiChat', {
    scale: 1,
    opacity: 1,
  });
  const modalOpacity = useSharedValue(0);
  const slideUp = useSharedValue(500);
  const pulseAnimation = useSharedValue(1);

  // Animated pulsing effect for AI thinking
  useEffect(() => {
    if (isLoading) {
      pulseAnimation.value = withSpring(1.2, { duration: 1000 });
      const interval = setInterval(() => {
        pulseAnimation.value = withSpring(
          pulseAnimation.value === 1 ? 1.2 : 1,
          { duration: 1000 },
        );
      }, 1000);
      return () => clearInterval(interval);
    } else {
      pulseAnimation.value = withTiming(1);
    }
  }, [isLoading]);

  // Initialize latest session for this user if it exists
  useEffect(() => {
    const initLatestSession = async () => {
      try {
        if (!resolvedUserId) {
          setSessionId(null);
          return;
        }
        const { data, error } = await supabase
          .from('ai_conversations')
          .select('session_id, timestamp')
          .eq('user_id', resolvedUserId)
          .order('timestamp', { ascending: false })
          .limit(1);

        if (
          !error &&
          Array.isArray(data) &&
          data.length > 0 &&
          data[0]?.session_id
        ) {
          setSessionId(String(data[0].session_id));
        } else {
          setSessionId(null);
        }
      } catch {
        setSessionId(null);
      }
    };
    initLatestSession();
  }, [resolvedUserId]);

  useEffect(() => {
    loadChatHistory();
  }, [sessionId]);

  // Cleanup morphs on unmount to avoid stray animations
  useEffect(() => {
    return () => {
      try {
        cancelMorphEngine('aiChat');
      } catch (e) {}
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      if (!sessionId) {
        const welcomeMessage: Message = {
          id: 'welcome',
          role: 'assistant',
          content:
            "Hello! I'm your NeuroLearn AI coach. I can help you with insights about your finances, health, learning progress, and how they all connect. What would you like to discuss?",
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
        return;
      }

      const { data: chatHistory } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', resolvedUserId)
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true })
        .limit(50);

      if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
        const formattedMessages: Message[] = chatHistory
          .filter(
            (chat) =>
              chat &&
              typeof chat === 'object' &&
              chat.id &&
              chat.role &&
              chat.message,
          )
          .map((chat) => ({
            id: String(chat.id),
            role: chat.role as 'user' | 'assistant',
            content: String(chat.message),
            timestamp: chat.timestamp ? new Date(chat.timestamp) : new Date(),
          }));
        setMessages(formattedMessages);
      } else {
        const welcomeMessage: Message = {
          id: 'welcome',
          role: 'assistant',
          content:
            "Hello! I'm your NeuroLearn AI coach. I can help you with insights about your finances, health, learning progress, and how they all connect. What would you like to discuss?",
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content:
          "Hello! I'm your NeuroLearn AI coach. I can help you with insights about your finances, health, learning progress, and how they all connect. What would you like to discuss?",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  };

  // --- Message batching to Supabase ---
  // Buffer outgoing messages and flush periodically or on unmount. If we don't
  // yet have a sessionId, flush the first message immediately to obtain a
  // session_id row from the DB and then batch the remainder using that id.
  const FLUSH_INTERVAL_MS = 5000; // flush every 5s
  // Buffer entry includes id and attempts for dedupe/retry
  type OutgoingMsg = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string; // ISO
    attempts?: number;
  };

  const STORAGE_KEY = '@neurolearn:outgoing_messages_v1';
  const STORAGE_SESSION_KEY = '@neurolearn:outgoing_session_v1';
  const DEAD_LETTER_KEY = '@neurolearn:dead_letters_v1';
  const MAX_ATTEMPTS = 5;
  const BACKOFF_BASE_MS = 2000; // 2s

  const bufferRef = useRef<OutgoingMsg[]>([]);
  const flushTimerRef = useRef<any | null>(null);
  const retryTimerRef = useRef<any | null>(null);
  const flushingRef = useRef(false);

  const clearFlushTimer = () => {
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  };

  const startFlushTimer = () => {
    if (!flushTimerRef.current) {
      flushTimerRef.current = setInterval(
        () => flushBuffer(false),
        FLUSH_INTERVAL_MS,
      );
    }
  };

  const persistState = async () => {
    try {
      const payload = { buffer: bufferRef.current };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      // store sessionId so flush can use it after reload
      if (sessionId) {
        await AsyncStorage.setItem(STORAGE_SESSION_KEY, sessionId);
      }
    } catch (e) {
      console.error('persistState failed:', e);
    }
  };

  const loadPersistedState = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.buffer)) {
          bufferRef.current = parsed.buffer as OutgoingMsg[];
        }
      }
      const sess = await AsyncStorage.getItem(STORAGE_SESSION_KEY);
      if (sess) {
        setSessionId(sess);
      }
      // load dead letters
      try {
        const dlRaw = await AsyncStorage.getItem(DEAD_LETTER_KEY);
        if (dlRaw) {
          const dl = JSON.parse(dlRaw);
          if (Array.isArray(dl)) setDeadLetters(dl);
        }
      } catch (e) {}
      // If we have items, start the flush timer to attempt delivery
      if (bufferRef.current.length > 0) startFlushTimer();
    } catch (e) {
      console.error('loadPersistedState failed:', e);
    }
  };

  // Dead-letter state (persisted)
  const [deadLetters, setDeadLetters] = useState<OutgoingMsg[]>([]);

  const persistDeadLetters = async (list?: OutgoingMsg[]) => {
    try {
      const toSave = list ?? deadLetters;
      await AsyncStorage.setItem(DEAD_LETTER_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.error('persistDeadLetters failed:', e);
    }
  };

  const addDeadLetters = async (arr: OutgoingMsg[]) => {
    try {
      const merged = [...arr, ...deadLetters];
      setDeadLetters(merged);
      await AsyncStorage.setItem(DEAD_LETTER_KEY, JSON.stringify(merged));
    } catch (e) {
      console.error('addDeadLetters failed:', e);
    }
  };

  const removeDeadLetter = async (id: string) => {
    try {
      const filtered = deadLetters.filter((d) => d.id !== id);
      setDeadLetters(filtered);
      await persistDeadLetters(filtered);
    } catch (e) {
      console.error('removeDeadLetter failed:', e);
    }
  };

  const retryDeadLetter = async (msg: OutgoingMsg) => {
    try {
      // Remove from dead letters first
      await removeDeadLetter(msg.id);
      // Re-enqueue for sending
      await enqueueMessage(msg.role, msg.content);
    } catch (e) {
      console.error('retryDeadLetter failed:', e);
    }
  };

  const flushBuffer = async (force = false) => {
    if (flushingRef.current) return;
    if (bufferRef.current.length === 0) return;
    // If not forced and sessionId is null, we still want to flush the first message
    // immediately to obtain a session id. So proceed.
    flushingRef.current = true;
    try {
      // Copy and clear buffer early to allow enqueue to continue
      const toFlush = [...bufferRef.current];
      bufferRef.current = [];

      // If we don't have a sessionId, insert the first row and capture session_id
      if (!sessionId) {
        const first = toFlush.shift();
        if (!first) return;
        const row: any = {
          user_id: resolvedUserId,
          role: first.role,
          message: first.content,
          timestamp: first.timestamp,
        };
        const { data, error } = await supabase
          .from('ai_conversations')
          .insert(row)
          .select('session_id')
          .single();
        if (error) {
          console.error('Error saving initial chat message:', error);
          // requeue with attempts
          first.attempts = (first.attempts || 0) + 1;
          bufferRef.current.unshift(first);
          await persistState();
          scheduleRetry(first.attempts || 1);
          return;
        } else if (data && data.session_id) {
          setSessionId(String(data.session_id));
          // persist session
          try {
            await AsyncStorage.setItem(
              STORAGE_SESSION_KEY,
              String(data.session_id),
            );
          } catch {}
        }
        // continue to flush remaining messages
      }

      if (toFlush.length > 0) {
        // Attach sessionId to each row
        const rows = toFlush.map((m) => ({
          user_id: resolvedUserId,
          role: m.role,
          message: m.content,
          timestamp: m.timestamp,
          session_id: sessionId || undefined,
        }));
        try {
          const { error } = await supabase
            .from('ai_conversations')
            .insert(rows);
          if (error) {
            console.error('Error batch inserting chat messages:', error);
            // Requeue with incremented attempts and schedule retry
            const requeue = toFlush.map((m) => ({
              ...m,
              attempts: (m.attempts || 0) + 1,
            }));
            // Partition into retryable and dead-letter
            const stillRetry = requeue.filter(
              (m) => (m.attempts || 0) <= MAX_ATTEMPTS,
            );
            const movedToDead = requeue.filter(
              (m) => (m.attempts || 0) > MAX_ATTEMPTS,
            );
            if (movedToDead.length > 0) await addDeadLetters(movedToDead);
            bufferRef.current = [...stillRetry, ...bufferRef.current];
            await persistState();
            if (stillRetry.length > 0) {
              const maxAttempts = Math.max(
                ...stillRetry.map((m) => m.attempts || 1),
              );
              scheduleRetry(maxAttempts);
            }
          } else {
            // success: persist cleared buffer
            await persistState();
          }
        } catch (e) {
          console.error('Batch insert failed:', e);
          const requeue = toFlush.map((m) => ({
            ...m,
            attempts: (m.attempts || 0) + 1,
          }));
          const stillRetry = requeue.filter(
            (m) => (m.attempts || 0) <= MAX_ATTEMPTS,
          );
          const movedToDead = requeue.filter(
            (m) => (m.attempts || 0) > MAX_ATTEMPTS,
          );
          if (movedToDead.length > 0) await addDeadLetters(movedToDead);
          bufferRef.current = [...stillRetry, ...bufferRef.current];
          await persistState();
          if (stillRetry.length > 0) {
            const maxAttempts = Math.max(
              ...stillRetry.map((m) => m.attempts || 1),
            );
            scheduleRetry(maxAttempts);
          }
        }
      } else {
        // nothing to flush; ensure persisted state matches
        await persistState();
      }
    } catch (e) {
      console.error('flushBuffer failed:', e);
    } finally {
      flushingRef.current = false;
    }
  };

  const scheduleRetry = (attempts: number) => {
    try {
      clearTimeout(retryTimerRef.current);
      const delay = Math.min(BACKOFF_BASE_MS * 2 ** (attempts - 1), 60 * 1000);
      retryTimerRef.current = setTimeout(() => {
        flushBuffer(true);
      }, delay);
    } catch (e) {
      console.error('scheduleRetry failed:', e);
    }
  };

  const enqueueMessage = async (
    role: 'user' | 'assistant',
    content: string,
  ) => {
    if (!resolvedUserId) {
      // Can't enqueue without a user; try to resolve immediately
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id) {
          setResolvedUserId(data.user.id);
        } else {
          return;
        }
      } catch {
        return;
      }
    }

    const msg: OutgoingMsg = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
      attempts: 0,
    };
    // If we don't have a sessionId yet, immediately flush the first message to
    // obtain a session_id that subsequent batched messages can reuse.
    if (!sessionId) {
      // Put into buffer and flush immediately
      bufferRef.current.push(msg);
      await persistState();
      await flushBuffer(true);
      startFlushTimer();
      return;
    }

    // Otherwise just enqueue and ensure timer is active
    bufferRef.current.push(msg);
    await persistState();
    startFlushTimer();
  };

  // Ensure we flush on unmount
  useEffect(() => {
    // load persisted buffer when component mounts
    loadPersistedState();

    return () => {
      clearFlushTimer();
      try {
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      } catch {}
      // Fire-and-forget flush on unmount
      try {
        flushBuffer(true);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openChat = () => {
    onClose?.();
    setUnreadCount(0);
    modalOpacity.value = withTiming(1, { duration: 300 });
    slideUp.value = withSpring(0, { damping: 20, stiffness: 200 });

    // Trigger morph for AI chat bubble using shared values from useMorph
    try {
      // Fire-and-forget morph; we cancel on unmount if needed
      applyMorphEngine(
        'aiChat',
        {
          scale: 1.06,
          opacity: 1,
          durationMs: 300,
          easing: 'spring',
        },
        { scale: bubbleScale, opacity: bubbleOpacity },
      ).catch(() => {});
    } catch (e) {}

    // Focus input after animation
    setTimeout(() => {
      inputRef.current?.focus();
    }, 350);
  };

  const closeChat = () => {
    modalOpacity.value = withTiming(0, { duration: 250 });
    slideUp.value = withTiming(500, { duration: 250 });
    try {
      applyMorphEngine(
        'aiChat',
        {
          scale: 1,
          opacity: 0.9,
          durationMs: 220,
          easing: 'timing',
        },
        { scale: bubbleScale, opacity: bubbleOpacity },
      ).catch(() => {});
    } catch (e) {}
    setTimeout(() => {
      onClose?.();
      // clear programmatic request
      try {
        floatingCtx.setShowAIChat(false);
      } catch {}
    }, 250);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    // Ensure we have a valid user before sending
    if (!resolvedUserId) {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id) {
          setResolvedUserId(data.user.id);
        } else {
          Alert.alert('Sign in required', 'Please sign in to use AI chat.');
          return;
        }
      } catch {
        Alert.alert('Sign in required', 'Please sign in to use AI chat.');
        return;
      }
    }

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    enqueueMessage('user', userMessage.content).catch((e) =>
      console.error('enqueueMessage error:', e),
    );

    const messageToSend = inputText.trim();
    setInputText('');
    setIsLoading(true);

    try {
      // Show typing indicator
      const typingMessage: Message = {
        id: 'typing',
        role: 'assistant',
        content: 'AI is thinking...',
        timestamp: new Date(),
        isTyping: true,
      };
      setMessages((prev) => [...prev, typingMessage]);

      const svc = getGeminiService();
      if (!svc || typeof svc.chatWithAI !== 'function') {
        throw new Error('AdvancedGeminiService not available');
      }
      const aiResponse = await svc.chatWithAI(
        resolvedUserId ?? '',
        messageToSend,
      );

      // Remove typing indicator and add actual response
      setMessages((prev) => {
        const withoutTyping = prev.filter((m) => m.id !== 'typing');
        const aiMessage: Message = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date(),
        };
        return [...withoutTyping, aiMessage];
      });

      // If chat is minimized, mark as unread
      if (!isVisible) setUnreadCount((c) => Math.min(99, c + 1));

      enqueueMessage('assistant', aiResponse).catch((e) =>
        console.error('enqueueMessage error:', e),
      );
      Vibration.vibrate(50); // Subtle haptic feedback
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages((prev) => {
        const withoutTyping = prev.filter((m) => m.id !== 'typing');
        const errorMessage: Message = {
          id: `error_${Date.now()}`,
          role: 'assistant',
          content:
            "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
          timestamp: new Date(),
        };
        return [...withoutTyping, errorMessage];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bubbleScale.value }, { scale: pulseAnimation.value }],
  }));

  const modalStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideUp.value }],
  }));

  const renderMessage = (message: Message) => (
    <View
      key={message.id}
      style={[
        styles.messageContainer,
        message.role === 'user' ? styles.userMessage : styles.aiMessage,
      ]}
    >
      {message.role === 'assistant' && (
        <View style={styles.aiAvatar}>
          <Icon
            name={message.isTyping ? 'dots-horizontal' : 'robot'}
            size={16}
            color="#6366F1"
          />
        </View>
      )}

      <View
        style={[
          styles.messageBubble,
          message.role === 'user' ? styles.userBubble : styles.aiBubble,
          message.isTyping && styles.typingBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            message.role === 'user' ? styles.userText : styles.aiText,
          ]}
        >
          {message.content}
        </Text>
        <Text style={styles.timestamp}>
          {message.timestamp.getHours().toString().padStart(2, '0')}:
          {message.timestamp.getMinutes().toString().padStart(2, '0')}
        </Text>
      </View>
    </View>
  );

  // Quick prompts to help users start conversations
  const QUICK_PROMPTS = [
    'Give me a daily check-in',
    'Summarize my budget status',
    'How is my sleep quality this week?',
    'Create a study plan for today',
  ];

  const handlePromptPress = (text: string, autoSend = false) => {
    setInputText(text);
    if (autoSend) {
      // Delay slightly to allow state update
      setTimeout(() => sendMessage(), 50);
    } else {
      inputRef.current?.focus();
    }
  };

  const startNewSession = () => {
    Alert.alert(
      'Start new chat?',
      'This will begin a fresh conversation. Previous sessions remain saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start New',
          style: 'destructive',
          onPress: () => {
            setSessionId(null);
            const welcomeMessage: Message = {
              id: 'welcome',
              role: 'assistant',
              content:
                "Hello! I'm your NeuroLearn AI coach. What would you like to discuss?",
              timestamp: new Date(),
            };
            setMessages([welcomeMessage]);
          },
        },
      ],
    );
  };

  const loadUserSessions = async () => {
    if (!resolvedUserId) return;
    setIsFetchingSessions(true);
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('session_id, timestamp')
        .eq('user_id', resolvedUserId)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (!error && Array.isArray(data)) {
        const seen = new Set<string>();
        const sessions: Array<{ id: string; last: string }> = [];
        data.forEach((row: any) => {
          const sid = String(row.session_id || '');
          if (sid && !seen.has(sid)) {
            seen.add(sid);
            sessions.push({
              id: sid,
              last: row.timestamp || new Date().toISOString(),
            });
          }
        });
        setRecentSessions(sessions);
      }
    } finally {
      setIsFetchingSessions(false);
    }
  };

  const openSessionPicker = async () => {
    setShowSessionPicker(true);
    if (recentSessions.length === 0) {
      await loadUserSessions();
    }
  };

  const selectSession = (sid: string) => {
    setSessionId(sid);
    setShowSessionPicker(false);
  };

  const confirmDeleteSession = (sid: string) => {
    Alert.alert(
      'Delete session?',
      'This will permanently delete this conversation for your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteSession(sid),
        },
      ],
    );
  };

  const deleteSession = async (sid: string) => {
    if (!resolvedUserId) return;
    try {
      setDeletingSessionId(sid);
      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('user_id', resolvedUserId)
        .eq('session_id', sid);
      if (error) {
        console.error('Failed to delete session:', error);
        return;
      }
      setRecentSessions((prev) => prev.filter((s) => s.id !== sid));
      if (sessionId === sid) {
        setSessionId(null);
        const welcomeMessage: Message = {
          id: 'welcome',
          role: 'assistant',
          content:
            "Hello! I'm your NeuroLearn AI coach. What would you like to discuss?",
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
      }
    } catch (e) {
      console.error('Delete session error:', e);
    } finally {
      setDeletingSessionId(null);
    }
  };

  const onMessagesScroll = (e: any) => {
    try {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const nearBottom =
        contentOffset.y + layoutMeasurement.height >= contentSize.height - 120;
      setShowScrollToBottom(!nearBottom);
    } catch {}
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <>
      {/* Chat Modal */}
      <Modal
        visible={isVisible}
        transparent
        animationType="none"
        statusBarTranslucent
      >
        <Reanimated.View style={[styles.modalOverlay, modalStyle]}>
          <TouchableOpacity
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={closeChat}
          />

          <Reanimated.View style={[styles.modalContent, contentStyle]}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardView}
            >
              <GlassCard style={styles.chatCard} theme={theme}>
                {/* Header */}
                <View style={styles.chatHeader}>
                  <View style={styles.headerLeft}>
                    <View style={styles.aiIndicator}>
                      <Icon name="robot" size={20} color="#6366F1" />
                    </View>
                    <View>
                      <Text style={styles.headerTitle}>NeuroLearn AI</Text>
                      <Text style={styles.headerSubtitle}>
                        Your personal coach
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={closeChat}
                    style={styles.closeButton}
                  >
                    <Icon name="close" size={24} color={colors[theme].text} />
                  </TouchableOpacity>
                </View>

                {/* Session info and actions */}
                <View style={styles.sessionBar}>
                  <Text style={styles.sessionText}>
                    {sessionId
                      ? 'Continuing your last conversation'
                      : 'New conversation'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                      onPress={openSessionPicker}
                      style={styles.newChatButton}
                    >
                      <Icon name="history" size={18} color="#6366F1" />
                      <Text style={styles.newChatText}>Sessions</Text>
                    </TouchableOpacity>
                    <View style={{ width: 8 }} />
                    <TouchableOpacity
                      onPress={startNewSession}
                      style={styles.newChatButton}
                    >
                      <Icon name="message-plus" size={18} color="#6366F1" />
                      <Text style={styles.newChatText}>New</Text>
                    </TouchableOpacity>
                    <View style={{ width: 8 }} />
                    <TouchableOpacity
                      onPress={() => setShowDeadLettersOverlay(true)}
                      style={[
                        styles.newChatButton,
                        { backgroundColor: 'rgba(239,68,68,0.06)' },
                      ]}
                      testID="dl-button"
                    >
                      <Icon name="alert-circle" size={16} color="#EF4444" />
                      <Text style={[styles.newChatText, { color: '#EF4444' }]}>
                        DL {deadLetters.length}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Session Picker Overlay */}
                {showSessionPicker && (
                  <View style={styles.sessionsOverlay}>
                    <View style={styles.sessionsHeader}>
                      <Text style={styles.sessionsTitle}>
                        Previous Sessions
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowSessionPicker(false)}
                      >
                        <Icon name="close" size={20} color="#374151" />
                      </TouchableOpacity>
                    </View>
                    {isFetchingSessions ? (
                      <View style={{ padding: 12, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#6366F1" />
                      </View>
                    ) : recentSessions.length === 0 ? (
                      <Text style={styles.sessionsEmpty}>
                        No previous sessions
                      </Text>
                    ) : (
                      <ScrollView style={{ maxHeight: 160 }}>
                        {recentSessions.map((s) => (
                          <View key={s.id} style={styles.sessionItemRow}>
                            <TouchableOpacity
                              style={styles.sessionItem}
                              onPress={() => selectSession(s.id)}
                            >
                              <Icon name="chat" size={16} color="#6366F1" />
                              <Text style={styles.sessionItemText}>
                                {s.id.slice(0, 8)} •{' '}
                                {new Date(s.last).toLocaleString()}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => confirmDeleteSession(s.id)}
                              style={styles.sessionDelete}
                              disabled={deletingSessionId === s.id}
                            >
                              {deletingSessionId === s.id ? (
                                <ActivityIndicator
                                  size="small"
                                  color="#EF4444"
                                />
                              ) : (
                                <Icon
                                  name="trash-can-outline"
                                  size={18}
                                  color="#EF4444"
                                />
                              )}
                            </TouchableOpacity>
                          </View>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                )}

                {/* Dead Letters Overlay */}
                {showDeadLettersOverlay && (
                  <View style={styles.deadLettersOverlay}>
                    <View style={styles.deadLettersHeader}>
                      <Text style={styles.deadLettersTitle}>
                        Failed Messages
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowDeadLettersOverlay(false)}
                      >
                        <Icon name="close" size={20} color="#374151" />
                      </TouchableOpacity>
                    </View>
                    {deadLetters.length === 0 ? (
                      <Text style={styles.deadLettersEmpty}>
                        No failed messages
                      </Text>
                    ) : (
                      <ScrollView style={{ maxHeight: 180 }}>
                        {deadLetters.map((d) => (
                          <View key={d.id} style={styles.deadLetterRow}>
                            <View style={{ flex: 1 }}>
                              <Text
                                numberOfLines={2}
                                style={styles.deadLetterText}
                              >
                                {d.content}
                              </Text>
                              <Text style={styles.deadLetterMeta}>
                                Attempts: {d.attempts || 0} •{' '}
                                {new Date(d.timestamp).toLocaleString()}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={styles.retryButton}
                              onPress={() => retryDeadLetter(d)}
                            >
                              <Text style={styles.retryText}>Retry</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.deleteButton}
                              onPress={() => removeDeadLetter(d.id)}
                            >
                              <Icon
                                name="trash-can-outline"
                                size={18}
                                color="#EF4444"
                              />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                )}

                {/* Messages */}
                <ScrollView
                  ref={scrollViewRef}
                  style={styles.messagesContainer}
                  showsVerticalScrollIndicator={false}
                  onScroll={onMessagesScroll}
                  scrollEventThrottle={16}
                  contentContainerStyle={styles.messagesContent}
                >
                  {messages.map(renderMessage)}
                </ScrollView>

                {/* Scroll to bottom button */}
                {showScrollToBottom && (
                  <TouchableOpacity
                    style={styles.scrollToBottom}
                    onPress={scrollToBottom}
                  >
                    <Icon name="arrow-down" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                )}

                {/* Quick Prompts */}
                <View style={styles.promptsContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {QUICK_PROMPTS.map((prompt, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.promptChip}
                        onPress={() => handlePromptPress(prompt)}
                        onLongPress={() => handlePromptPress(prompt, true)}
                      >
                        <Icon name="lightbulb-on" size={14} color="#6366F1" />
                        <Text style={styles.promptText}>{prompt}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Input Area */}
                <View style={styles.inputContainer}>
                  {!resolvedUserId && (
                    <View style={styles.inputLoadingOverlay}>
                      <ActivityIndicator size="small" color="#6366F1" />
                      <Text style={styles.inputLoadingText}>Connecting…</Text>
                    </View>
                  )}
                  <TextInput
                    ref={inputRef}
                    style={[
                      styles.textInput,
                      !resolvedUserId && { opacity: 0.5 },
                    ]}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Ask about your finances, health, or learning..."
                    placeholderTextColor={colors[theme].textSecondary}
                    multiline
                    maxLength={500}
                    onSubmitEditing={sendMessage}
                    blurOnSubmit={false}
                    editable={!!resolvedUserId && !isLoading}
                    testID="chat-input"
                  />

                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      (!inputText.trim() || isLoading || !resolvedUserId) &&
                        styles.sendButtonDisabled,
                    ]}
                    onPress={sendMessage}
                    disabled={!inputText.trim() || isLoading || !resolvedUserId}
                    testID="send-button"
                  >
                    <Icon
                      name={isLoading ? 'clock-outline' : 'send'}
                      size={20}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </View>
              </GlassCard>
            </KeyboardAvoidingView>
          </Reanimated.View>
        </Reanimated.View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingBubble: {
    position: 'absolute',
  },
  bubbleWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowEffect: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
  },
  bubbleContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bubbleBlur: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  loadingIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '80%',
  },
  keyboardView: {
    flex: 1,
  },
  chatCard: {
    margin: 16,
    marginBottom: 20,
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  messagesContent: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  aiMessage: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  typingBubble: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#1F2937',
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(107, 114, 128, 0.8)',
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 20,
    paddingTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  sessionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sessionText: {
    fontSize: 12,
    color: '#6B7280',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderRadius: 999,
  },
  newChatText: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  sessionsOverlay: {
    position: 'absolute',
    top: 56,
    left: 12,
    right: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sessionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sessionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  sessionsEmpty: {
    color: '#6B7280',
    fontSize: 12,
  },
  sessionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  sessionDelete: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  sessionItemText: {
    color: '#374151',
    fontSize: 12,
  },
  promptsContainer: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderRadius: 999,
  },
  promptText: {
    color: '#374151',
    fontSize: 12,
    marginLeft: 6,
  },
  scrollToBottom: {
    position: 'absolute',
    right: 16,
    bottom: 116,
    backgroundColor: '#6366F1',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  inputLoadingOverlay: {
    position: 'absolute',
    left: 12,
    top: 8,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  inputLoadingText: {
    color: '#4B5563',
    fontSize: 12,
    marginLeft: 6,
  },
  deadLettersOverlay: {
    position: 'absolute',
    right: 16,
    top: 56,
    width: 320,
    maxHeight: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  deadLettersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deadLettersTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  deadLettersEmpty: {
    color: '#6B7280',
    padding: 8,
  },
  deadLetterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  deadLetterText: {
    color: '#111827',
    fontSize: 13,
  },
  deadLetterMeta: {
    color: '#6B7280',
    fontSize: 11,
  },
  retryButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#10B981',
    borderRadius: 6,
    marginLeft: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});
export default FloatingChatBubble;
