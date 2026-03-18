import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import axios from 'axios';

type UserRole = 'agent' | 'sales' | 'admin' | null;

type SystemStats = {
  totalCards: number;
  totalBalance: number;
  totalTransactions: number;
  topupCount: number;
  topupTotal: number;
  paymentCount: number;
  paymentTotal: number;
  todayTopupCount: number;
  todayTopupTotal: number;
  todayPaymentCount: number;
  todayPaymentTotal: number;
  todayCardsServed: number;
};

type CardStats = {
  monthlySpend: number;
  savingRate: number;
  totalTransactions: number;
};

type AppContextType = {
  backendUrl: string;
  setBackendUrl: (url: string) => void;
  socketConnected: boolean;
  mqttConnected: boolean;
  currentCardData: any;
  cardPresent: boolean;
  cart: any[];
  addToCart: (product: any) => void;
  removeFromCart: (productId: string) => void;
  changeCartQty: (productId: string, delta: number) => void;
  cartTotal: number;
  clearCart: () => void;
  recentPurchases: any[];
  refreshTransactions: (uid?: string) => void;
  passcodeMode: 'set' | 'verify' | null;
  setPasscodeMode: (mode: 'set' | 'verify' | null) => void;
  darkTheme: boolean;
  setDarkTheme: (val: boolean) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  systemStats: SystemStats | null;
  cardStats: CardStats | null;
  terminalId: string;
  setTerminalId: (id: string) => void;
  authToken: string | null;
  setAuthToken: (token: string | null) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isStorageLoading: boolean;
  lastScan: number;
  requirePhysicalTap: boolean;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [backendUrl, setBackendUrlState] = useState('http://10.12.72.149:8275'); // Updated to local IP
  const [socket, setSocket] = useState<any>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [currentCardData, setCurrentCardData] = useState<any>(null);
  const [cardPresent, setCardPresent] = useState(false);
  const [terminalId, setTerminalIdState] = useState('UNSET-TERMINAL');
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState(0);
  const [isStorageLoading, setIsStorageLoading] = useState(true);

  const isAuthenticated = !!authToken;

  const [loginTime, setLoginTime] = useState(Date.now());

  const setAuthToken = async (token: string | null) => {
    if (token) {
      await AsyncStorage.setItem('authToken', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      await AsyncStorage.removeItem('authToken');
      delete axios.defaults.headers.common['Authorization'];
    }
    setAuthTokenState(token);
  };

  const logout = async () => {
    await setAuthToken(null);
    await setUserRole(null);
    setCurrentCardData(null);
    setCardPresent(false);
  };

  const setTerminalId = async (id: string) => {
    await AsyncStorage.setItem('terminalId', id);
    setTerminalIdState(id);
  };


  useEffect(() => {
    // Axios Interceptor for 401 Unauthorized
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const [cart, setCart] = useState<any[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [cardStats, setCardStats] = useState<CardStats | null>(null);

  const [userRole, setUserRoleState] = useState<UserRole>(null);
  const [passcodeMode, setPasscodeMode] = useState<'set' | 'verify' | null>(null);
  const [darkTheme, setDarkThemeState] = useState(true);

  useEffect(() => {
    if (!cardPresent) setCardStats(null);
  }, [cardPresent]);

  useEffect(() => {
    const loadStorage = async () => {
      try {
        const [theme, role, token, termId] = await Promise.all([
          AsyncStorage.getItem('darkTheme'),
          AsyncStorage.getItem('userRole'),
          AsyncStorage.getItem('authToken'),
          AsyncStorage.getItem('terminalId'),
        ]);

        if (theme !== null) setDarkThemeState(theme === 'true');
        if (role) setUserRoleState(role as UserRole);
        if (token) {
          setAuthTokenState(token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        if (termId) setTerminalIdState(termId);
      } catch (e) {
        console.error('Error loading hydration from storage:', e);
      } finally {
        setIsStorageLoading(false);
        // FRESH SESSION FIX:
        // Clear card state on initial load to ensure RFID must be tapped again
        // as requested by the user.
        setCurrentCardData(null);
        setCardPresent(false);
        setRequirePhysicalTap(true);
      }
    };
    loadStorage();
  }, []);

  const [requirePhysicalTap, setRequirePhysicalTap] = useState(false);
  const requirePhysicalTapRef = React.useRef(false);
  const [hasSeenEmpty, setHasSeenEmpty] = useState(false);
  const hasSeenEmptyRef = React.useRef(false);
  const currentCardDataRef = React.useRef<any>(null);

  useEffect(() => {
    requirePhysicalTapRef.current = requirePhysicalTap;
  }, [requirePhysicalTap]);

  useEffect(() => {
    hasSeenEmptyRef.current = hasSeenEmpty;
  }, [hasSeenEmpty]);

  useEffect(() => {
    currentCardDataRef.current = currentCardData;
  }, [currentCardData]);

  const setUserRole = async (role: UserRole) => {
    if (role) {
      await AsyncStorage.setItem('userRole', role);
      // Reset security interlock for new session
      setCurrentCardData(null);
      setCardPresent(false);
      setLoginTime(Date.now());
      setRequirePhysicalTap(true);
      setHasSeenEmpty(false);
    } else {
      await AsyncStorage.removeItem('userRole');
      setRequirePhysicalTap(false);
      setHasSeenEmpty(false);
    }
    setUserRoleState(role);
  };

  const setDarkTheme = async (val: boolean) => {
    await AsyncStorage.setItem('darkTheme', val ? 'true' : 'false');
    setDarkThemeState(val);
  };

  useEffect(() => {
    let interval: any;
    if (userRole === 'agent' && socketConnected) {
      interval = setInterval(refreshStats, 15000);
    }
    return () => clearInterval(interval);
  }, [userRole, socketConnected]);

  useEffect(() => {
    AsyncStorage.getItem('backendUrl').then(url => {
      if (url) {
        setBackendUrlState(url);
      }
    });
  }, []);

  const setBackendUrl = async (url: string) => {
    await AsyncStorage.setItem('backendUrl', url);
    setBackendUrlState(url);
  };

  // STABLE SOCKET CONNECTION
  useEffect(() => {
    if (!backendUrl) return;
    const newSocket = io(backendUrl, {
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      setSocketConnected(true);
      refreshStats();
    });

    newSocket.on('disconnect', () => {
      setSocketConnected(false);
    });

    newSocket.on('system-status', (data: any) => {
      if (data.type === 'mqtt') {
        setMqttConnected(data.status);
      }
    });

    newSocket.on('card-status', async (data: any) => {
      const isPresent = data.present !== false;
      const now = Date.now();

      if (!isPresent) {
        setCardPresent(false);
        setCurrentCardData(null);
        setHasSeenEmpty(true);
        setRequirePhysicalTap(false);
        return;
      }

      // ALWAYS update these so sub-screens can detect the physical event
      setLastScan(now);
      setCardPresent(true);

      if (data.uid) {
        const isNewIdentification = !currentCardDataRef.current || currentCardDataRef.current.uid !== data.uid;

        // PRIVACY INTERLOCK: If we just logged in and haven't confirmed an empty reader,
        // we allow identifying the UID for "Armed" sessions (checkout/topup),
        // but it will stay hidden from the Dashboard until the user re-taps.
        if (isNewIdentification) {
          setCurrentCardData({ uid: data.uid, balance: data.balance || 0, isNew: true });
        }

        if (requirePhysicalTapRef.current && !hasSeenEmptyRef.current) {
          console.log('🔒 Hardware security lock: Privacy details hidden until re-tap.');
          // We still notify that a card is present, allowing "Confirm with Tap" flows
          return;
        }

        try {
          const res = await axios.get(`${backendUrl}/card/${data.uid}`);
          setCurrentCardData({ ...res.data, isNew: false, uid: data.uid });
          refreshTransactions(data.uid);
        } catch (err: any) {
          setCurrentCardData({ isNew: true, uid: data.uid, balance: data.balance || 0 });
        }
      }
    });

    newSocket.on('payment-success', (payload: any) => {
      refreshTransactions();
      refreshStats();
    });

    setSocket(newSocket);

    return () => {
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('card-status');
      newSocket.off('system-status');
      newSocket.off('payment-success');
      newSocket.disconnect();
    };
  }, [backendUrl]); // ONLY reconnect if backendUrl changes

  const refreshStats = async () => {
    if (!backendUrl) return;
    try {
      const res = await axios.get(`${backendUrl}/stats`);
      setSystemStats(res.data);
    } catch (e) {
      console.log('Failed to fetch stats');
    }
  };

  const refreshTransactions = async (uid?: string) => {
    const targetUid = uid || currentCardData?.uid;
    if (!targetUid || !backendUrl) return;
    try {
      const res = await axios.get(`${backendUrl}/transactions/${targetUid}?limit=10`);
      setRecentPurchases(res.data || []);

      const statsRes = await axios.get(`${backendUrl}/stats/${targetUid}`);
      setCardStats(statsRes.data);

      refreshStats();
    } catch (e) {
      console.log('Failed to fetch transactions/card stats');
    }
  };

  const addToCart = (product: any) => {
    setCart(prev => {
      const ex = prev.find(p => p.product.id === product.id);
      if (ex) return prev.map(p => p.product.id === product.id ? { ...p, qty: p.qty + 1 } : p);
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(p => p.product.id !== id));
  };

  const changeCartQty = (id: string, delta: number) => {
    setCart(prev => {
      return prev.map(p => {
        if (p.product.id === id) {
          const nf = p.qty + delta;
          return nf > 0 ? { ...p, qty: nf } : p;
        }
        return p;
      }).filter(p => p.qty > 0);
    });
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((acc, c) => acc + (c.product.price * c.qty), 0);

  return (
    <AppContext.Provider value={{
      backendUrl, setBackendUrl, socketConnected, mqttConnected,
      currentCardData, cardPresent,
      cart, addToCart, removeFromCart, changeCartQty, cartTotal, clearCart,
      recentPurchases, refreshTransactions,
      passcodeMode, setPasscodeMode,
      darkTheme, setDarkTheme,
      userRole, setUserRole,
      systemStats, cardStats, terminalId, setTerminalId,
      authToken, setAuthToken, logout, isAuthenticated, isStorageLoading,
      lastScan, requirePhysicalTap
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
