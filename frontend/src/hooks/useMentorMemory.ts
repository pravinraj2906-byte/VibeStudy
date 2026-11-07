import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export type MentorRole = 'user' | 'mentor';

export interface RememberedMessage {
  id: string;
  sender: MentorRole;
  text: string;
  timestamp: string;
}

export interface MentorMemory {
  version: 1;
  goal: string;
  teachingMode: 'guided' | 'concise' | 'deep-dive';
  learnedTopics: string[];
  conversation: RememberedMessage[];
  lastVisitedAt: string;
}

const EMPTY_MEMORY: MentorMemory = {
  version: 1,
  goal: 'Understand this project well enough to explain and improve it',
  teachingMode: 'guided',
  learnedTopics: [],
  conversation: [],
  lastVisitedAt: new Date(0).toISOString(),
};

const readMemory = (key: string): MentorMemory => {
  try {
    const value = localStorage.getItem(key);
    if (!value) return EMPTY_MEMORY;
    const parsed = JSON.parse(value) as Partial<MentorMemory>;
    return {
      ...EMPTY_MEMORY,
      ...parsed,
      version: 1,
      learnedTopics: Array.isArray(parsed.learnedTopics) ? parsed.learnedTopics.slice(0, 12) : [],
      conversation: Array.isArray(parsed.conversation) ? parsed.conversation.slice(-30) : [],
    };
  } catch {
    return EMPTY_MEMORY;
  }
};

export const useMentorMemory = (projectId: number) => {
  const { user } = useAuth();
  const storageKey = useMemo(
    () => `proofforge.mentor-memory.v1:${user?.id ?? 'guest'}:${projectId}`,
    [projectId, user?.id],
  );
  const [memory, setMemory] = useState<MentorMemory>(() => readMemory(storageKey));
  const [syncState, setSyncState] = useState<'loading' | 'synced' | 'local-only'>('loading');

  useEffect(() => {
    setMemory(readMemory(storageKey));
    setSyncState(user ? 'loading' : 'local-only');

    if (!user) return;
    let active = true;
    api.getMentorMemory(projectId)
      .then((remote) => {
        if (!active) return;
        setMemory({
          version: 1,
          goal: remote.goal,
          teachingMode: remote.teaching_mode,
          learnedTopics: remote.learned_topics.slice(0, 12),
          conversation: remote.conversation.slice(-30),
          lastVisitedAt: remote.updated_at,
        });
        setSyncState('synced');
      })
      .catch(() => active && setSyncState('local-only'));
    return () => { active = false; };
  }, [projectId, storageKey, user]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(memory));
  }, [memory, storageKey]);

  useEffect(() => {
    if (!user || syncState !== 'synced') return;
    const timeout = window.setTimeout(() => {
      api.saveMentorMemory(projectId, {
        goal: memory.goal,
        teaching_mode: memory.teachingMode,
        learned_topics: memory.learnedTopics,
        conversation: memory.conversation,
      }).catch(() => setSyncState('local-only'));
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [memory, projectId, syncState, user]);

  const rememberMessage = useCallback((message: RememberedMessage) => {
    setMemory((current) => ({
      ...current,
      conversation: [...current.conversation, message].slice(-30),
      lastVisitedAt: new Date().toISOString(),
    }));
  }, []);

  const rememberTopic = useCallback((topic: string) => {
    const cleanTopic = topic.trim();
    if (!cleanTopic) return;
    setMemory((current) => ({
      ...current,
      learnedTopics: [cleanTopic, ...current.learnedTopics.filter((item) => item !== cleanTopic)].slice(0, 12),
      lastVisitedAt: new Date().toISOString(),
    }));
  }, []);

  const updatePreferences = useCallback((updates: Pick<Partial<MentorMemory>, 'goal' | 'teachingMode'>) => {
    setMemory((current) => ({ ...current, ...updates, lastVisitedAt: new Date().toISOString() }));
  }, []);

  const clearMemory = useCallback(() => {
    localStorage.removeItem(storageKey);
    setMemory({ ...EMPTY_MEMORY, lastVisitedAt: new Date().toISOString() });
  }, [storageKey]);

  return { memory, syncState, rememberMessage, rememberTopic, updatePreferences, clearMemory };
};
