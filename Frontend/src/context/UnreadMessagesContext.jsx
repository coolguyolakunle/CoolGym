import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL, api } from '../api';
import { useAuth } from './AuthContext';

const UnreadMessagesContext = createContext({ unreadCount: 0, refreshUnreadCount: async () => {} });

export function UnreadMessagesProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const inbox = await api.get('/api/messages');
      setUnreadCount(inbox.convos.reduce((total, convo) => total + convo.unread, 0));
    } catch {
      // Keep the last known count during a transient request failure.
    }
  }, [user]);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!user) return undefined;

    const socket = io(API_URL, { transports: ['polling'], withCredentials: true });
    socket.on('message:unread', refreshUnreadCount);
    return () => socket.disconnect();
  }, [user?.id, refreshUnreadCount]);

  return (
    <UnreadMessagesContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </UnreadMessagesContext.Provider>
  );
}

export function useUnreadMessages() {
  return useContext(UnreadMessagesContext);
}
