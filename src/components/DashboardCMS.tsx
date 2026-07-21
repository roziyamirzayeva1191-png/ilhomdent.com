import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Calendar, MessageSquare, Shield, Lock, 
  Activity, Check, X, Trash2, Send, TrendingUp, Award, Bell, BellOff,
  Server, Database, Cpu, Layers, Globe, Terminal, ArrowRight, Settings, Key,
  RefreshCw, Zap, Cloud, Smartphone, Plus, Save, Edit, AlertTriangle, LogIn
} from 'lucide-react';
import { Appointment, Review, LanguageCode, DentalService, Doctor } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Short two-tone notification chime via the Web Audio API (no external asset needed).
function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);       // first tone
    osc.frequency.setValueAtTime(1174.66, now + 0.16); // second tone
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.56);
    osc.onended = () => ctx.close();
  } catch {
    /* audio unavailable — silently ignore */
  }
}

const ServiceImageMap: Record<string, string> = {
  implants: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&q=80&w=400",
  ortho: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&q=80&w=400",
  cosmetic: "https://images.unsplash.com/photo-1513412527319-f004eed66294?auto=format&fit=crop&q=80&w=400",
  veneers: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=400",
  whitening: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=400",
  pediatric: "https://images.unsplash.com/photo-1472457897821-70d3819a0e24?auto=format&fit=crop&q=80&w=400",
  surgery: "https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&q=80&w=400",
  rootcanal: "https://images.unsplash.com/photo-1579684389782-64d84b5e901a?auto=format&fit=crop&q=80&w=400",
  prostho: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&q=80&w=400",
  periodon: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=400"
};

interface DashboardCMSProps {
  language: LanguageCode;
  isOpen: boolean;
  onClose: () => void;
  onRefreshSiteData: () => void;
}

export default function DashboardCMS({ language, isOpen, onClose, onRefreshSiteData }: DashboardCMSProps) {
  // Global States
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    total: 0,
    pending: 0,
    approved: 0,
    reviewsCount: 0,
    rating: "5.0",
    monthly: []
  });

  // Auth States
  const [isSetup, setIsSetup] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [setupUsername, setSetupUsername] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccessMsg, setAuthSuccessMsg] = useState("");

  // Tab State
  const [activeTab, setActiveTab] = useState<'appointments' | 'reviews' | 'site_data' | 'live_chat' | 'security' | 'analytics'>('appointments');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Appointments queue: search, status filter, pagination
  const [aptSearch, setAptSearch] = useState("");
  const [aptStatusFilter, setAptStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Cancelled'>('All');
  const [aptPage, setAptPage] = useState(1);
  const APT_PAGE_SIZE = 10;

  // Derived: search + status filter + pagination over the appointments queue
  const filteredAppointments = appointments.filter((apt) => {
    if (aptStatusFilter !== 'All' && apt.status !== aptStatusFilter) return false;
    if (!aptSearch.trim()) return true;
    const q = aptSearch.trim().toLowerCase();
    return [apt.name, apt.phone, apt.doctor, apt.department, apt.comments, apt.date]
      .some((f) => (f || '').toLowerCase().includes(q));
  });
  const aptTotalPages = Math.max(1, Math.ceil(filteredAppointments.length / APT_PAGE_SIZE));
  const pagedAppointments = filteredAppointments.slice(
    (Math.min(aptPage, aptTotalPages) - 1) * APT_PAGE_SIZE,
    Math.min(aptPage, aptTotalPages) * APT_PAGE_SIZE
  );

  // Dynamic Site CMS state
  const [services, setServices] = useState<DentalService[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [beforeAfter, setBeforeAfter] = useState({
    before: "https://images.unsplash.com/photo-1579684389782-64d84b5e901a?auto=format&fit=crop&q=80&w=800&h=600",
    after: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800&h=600"
  });
  const [translations, setTranslations] = useState<any>({});
  const [contacts, setContacts] = useState<any>({
    instagram: "https://instagram.com/dr_ilhom_dental",
    telegram: "https://t.me/dr_ilhom_dental",
    whatsapp: "https://wa.me/998906134666",
    phone: "+998906134666",
    google_maps: "https://www.google.com/maps/place/41%C2%B016'58.4%22N+69%C2%B012'48.2%22E/@41.2829,69.2134,17z/",
    yandex_maps: "https://yandex.com/maps/?ll=69.2134%2C41.2829&z=17&pt=69.2134%2C41.2829"
  });
  const [siteDataLoading, setSiteDataLoading] = useState(false);
  const [cmsMessage, setCmsMessage] = useState<string | null>(null);

  // Logo and Admin credentials change states
  const [logo, setLogo] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("admin");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  // Optimized CMS 3-language and image uploading states
  const [cmsLanguage, setCmsLanguage] = useState<'uz' | 'en' | 'ru'>('uz');
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, targetType: 'doctor' | 'service' | 'gallery', targetId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(targetId);
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            type: file.type,
            data: base64Data
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.url) {
            if (targetType === 'doctor') {
              setDoctors(prev => prev.map(d => d.id === targetId ? { ...d, image: data.url } : d));
            } else if (targetType === 'gallery') {
              setGallery(prev => prev.map(item => item.id === targetId ? { ...item, image: data.url } : item));
            } else if (targetType === 'service') {
              setServices(prev => prev.map(s => s.id === targetId ? { ...s, image: data.url } : s));
            }
            setCmsMessage("Rasm muvaffaqiyatli serverga yuklandi va saqlandi!");
            setTimeout(() => setCmsMessage(null), 3000);
          } else {
            alert("Rasmni serverga yuklab bo'lmadi: " + (data.error || "Xatolik"));
          }
        } else {
          alert("Server bilan ulanishda xatolik yuz berdi");
        }
      } catch (err) {
        console.error(err);
        alert("Tarmoq xatoligi tufayli rasm yuklab bo'lmadi");
      } finally {
        setUploadingId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadBeforeAfter = async (e: React.ChangeEvent<HTMLInputElement>, field: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(`beforeafter-${field}`);
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            type: file.type,
            data: base64Data
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.url) {
            setBeforeAfter(prev => ({ ...prev, [field]: data.url }));
            setCmsMessage(`${field === 'before' ? 'Oldin' : 'Keyin'} rasmi muvaffaqiyatli yuklandi va vaqtinchalik saqlandi! Saqlash tugmasini bosing.`);
            setTimeout(() => setCmsMessage(null), 4000);
          } else {
            alert("Yuklashda xatolik: " + (data.error || "Xatolik"));
          }
        } else {
          alert("Server xatosi");
        }
      } catch (err) {
        console.error(err);
        alert("Tarmoq xatosi");
      } finally {
        setUploadingId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Active editors
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);

  // Telegram Configuration
  const [telegramConfig, setTelegramConfig] = useState({
    enabled: false,
    botToken: "",
    chatId: ""
  });
  const [tgMsg, setTgMsg] = useState<string | null>(null);

  // Live Chat Manager State
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState("");
  const [chatPollInterval, setChatPollInterval] = useState<any>(null);

  // Audible notifications: play a chime when a new chat message / appointment arrives.
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('ilhomdent_admin_sound') !== 'off'; } catch { return true; }
  });
  const prevUnreadRef = useRef<number | null>(null);
  const prevPendingRef = useRef<number | null>(null);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem('ilhomdent_admin_sound', next ? 'on' : 'off'); } catch { /* noop */ }
      if (next) playNotificationSound(); // audible confirmation + unlocks audio (user gesture)
      return next;
    });
  };

  // Security Monitor Simulation State
  const [securityState, setSecurityState] = useState<any>({
    firewallEnabled: true,
    openPorts: ["3000 (Express Ingress)"],
    threatLevel: "LOW",
    lastScanTime: "Ko'rsatilmagan",
    certificates: []
  });
  const [securityLogs, setSecurityLogs] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isRenewingCert, setIsRenewingCert] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Check auth status and fetch standard queue
  useEffect(() => {
    if (isOpen) {
      checkAuthStatus();
      fetchQueueData();
      fetchSiteCMSData();
    }
  }, [isOpen]);

  // Handle live chat polling
  useEffect(() => {
    if (isOpen && activeTab === 'live_chat') {
      fetchChatSessions();
      const interval = setInterval(fetchChatSessions, 3500);
      return () => clearInterval(interval);
    }
  }, [isOpen, activeTab]);

  // Global notification poller — plays a chime when a new unread chat or new
  // pending appointment arrives, regardless of which tab is open.
  useEffect(() => {
    if (!isOpen || !isLoggedIn) return;

    const poll = async () => {
      try {
        const [chatsRes, aptRes] = await Promise.all([
          fetch('/api/admin/chats'),
          fetch('/api/appointments'),
        ]);
        if (chatsRes.status === 401 || aptRes.status === 401) {
          setIsLoggedIn(false);
          return;
        }

        let unread = 0;
        if (chatsRes.ok) {
          const chats = await chatsRes.json();
          if (Array.isArray(chats)) {
            setChatSessions(chats);
            unread = chats.filter((c: any) => c.unread).length;
          }
        }
        let pending = 0;
        if (aptRes.ok) {
          const apts = await aptRes.json();
          if (Array.isArray(apts)) {
            setAppointments(apts);
            pending = apts.filter((a: any) => a.status === 'Pending').length;
          }
        }

        const prevUnread = prevUnreadRef.current;
        const prevPending = prevPendingRef.current;
        // Skip the first poll (baseline) so we don't chime on initial load.
        if (prevUnread !== null && prevPending !== null) {
          if (unread > prevUnread || pending > prevPending) {
            if (soundEnabled) playNotificationSound();
          }
        }
        prevUnreadRef.current = unread;
        prevPendingRef.current = pending;
      } catch {
        /* transient network error — next tick retries */
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isLoggedIn, soundEnabled]);

  // Poll individual active chat session messages
  useEffect(() => {
    if (isOpen && activeTab === 'live_chat' && selectedSessionId) {
      fetchActiveChatHistory();
      const interval = setInterval(fetchActiveChatHistory, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, activeTab, selectedSessionId]);

  // Scroll to bottom on security logs update
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [securityLogs]);

  // Scroll to bottom on chat messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatSessions, selectedSessionId]);

  // Auth Functions
  const checkAuthStatus = async () => {
    try {
      const res = await fetch("/api/admin/auth-status");
      if (res.ok) {
        const data = await res.json();
        setIsSetup(data.isSetup);
      }
      // Restore an existing server session (HttpOnly cookie) after page refresh.
      const meRes = await fetch("/api/admin/me");
      if (meRes.ok) {
        const me = await meRes.json();
        if (me.authenticated) setIsLoggedIn(true);
      }
    } catch (err) {
      console.error("Auth status check failed", err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // Even if the network call fails, drop the local session state.
    }
    setIsLoggedIn(false);
    setPassword("");
  };

  const handleSetupAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccessMsg("");
    if (!setupUsername || !setupPassword) {
      setAuthError("Iltimos, barcha maydonlarni to'ldiring.");
      return;
    }
    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: setupUsername, password: setupPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setIsSetup(true);
        setAuthSuccessMsg("Admin hisobingiz muvaffaqiyatli sozlandi! Endi login orqali kiring.");
        setUsername(setupUsername);
        setPassword("");
      } else {
        setAuthError(data.error || "Xatolik yuz berdi.");
      }
    } catch (err) {
      setAuthError("Server ulanish xatosi.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccessMsg("");
    if (!username || !password) {
      setAuthError("Login va parol talab qilinadi.");
      return;
    }
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        setIsLoggedIn(true);
      } else {
        setAuthError(data.error || "Login yoki parol noto'g'ri!");
      }
    } catch (err) {
      setAuthError("Server bilan ulanishda xatolik.");
    }
  };

  // Content CMS Functions
  const fetchSiteCMSData = async () => {
    setSiteDataLoading(true);
    try {
      const res = await fetch("/api/site-data");
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
        setDoctors(data.doctors || []);
        setGallery(data.gallery || []);
        if (data.logo) {
          setLogo(data.logo);
        }
        if (data.beforeAfter) {
          setBeforeAfter(data.beforeAfter);
        }
        setTranslations(data.translations || {});
        if (data.contacts) {
          setContacts(data.contacts);
        }
        setTelegramConfig({
          enabled: data.telegram.enabled,
          botToken: data.telegram.botToken,
          chatId: data.telegram.chatId
        });
        setSecurityState(data.security || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSiteDataLoading(false);
    }
  };

  const handleSaveCMSData = async () => {
    setCmsMessage(null);
    try {
      const res = await fetch("/api/site-data/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services, doctors, gallery, translations, contacts, beforeAfter, logo })
      });
      if (res.ok) {
        setCmsMessage("Site ma'lumotlari muvaffaqiyatli saqlandi!");
        onRefreshSiteData(); // Refresh main app homepage dynamic content
        setTimeout(() => setCmsMessage(null), 4000);
      } else {
        setCmsMessage("Saqlashda xatolik yuz berdi.");
      }
    } catch (err) {
      console.error(err);
      setCmsMessage("Server ulanish xatosi.");
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId("logo");
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            type: file.type,
            data: base64Data
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.url) {
            setLogo(data.url);
            setCmsMessage("Logo muvaffaqiyatli serverga yuklandi! O'zgarishlarni saqlash tugmasini bosing.");
            setTimeout(() => setCmsMessage(null), 4000);
          } else {
            alert("Logo yuklashda xatolik: " + (data.error || "Noma'lum xato"));
          }
        } else {
          alert("Serverda xatolik yuz berdi.");
        }
      } catch (err) {
        console.error(err);
        alert("Tarmoq xatosi.");
      } finally {
        setUploadingId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (!newAdminPassword) {
      setPwdMsg("⚠️ Iltimos, yangi parolni kiriting.");
      return;
    }
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newAdminUsername, password: newAdminPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setPwdMsg("✅ Login va parol muvaffaqiyatli almashtirildi!");
        setNewAdminPassword("");
        setTimeout(() => setPwdMsg(null), 4000);
      } else {
        setPwdMsg(`❌ Xatolik: ${data.error || "Noma'lum xatolik"}`);
      }
    } catch (err) {
      setPwdMsg("❌ Server bilan ulanishda xatolik.");
    }
  };

  const handleSaveTelegramConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setTgMsg(null);
    try {
      const res = await fetch("/api/admin/telegram-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(telegramConfig)
      });
      if (res.ok) {
        setTgMsg("Telegram sozlamalari muvaffaqiyatli saqlandi!");
        setTimeout(() => setTgMsg(null), 4000);
      } else {
        setTgMsg("Sozlamalarni saqlashda xatolik.");
      }
    } catch (err) {
      setTgMsg("Server xatoligi.");
    }
  };

  const handleTestTelegram = async () => {
    setTgMsg("Test yuborilmoqda...");
    try {
      const res = await fetch("/api/admin/telegram-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: telegramConfig.botToken,
          chatId: telegramConfig.chatId
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTgMsg(data.message || "Test xabari muvaffaqiyatli ketdi!");
      } else {
        setTgMsg(data.error || "Yuborib bo'lmadi.");
      }
    } catch (err) {
      setTgMsg("Ulanish xatosi.");
    }
  };

  // Queue Fetch Functions
  const fetchQueueData = async () => {
    setIsLoading(true);
    try {
      const [aptRes, revRes, anaRes] = await Promise.all([
        fetch('/api/appointments'),
        fetch('/api/reviews'),
        fetch('/api/analytics')
      ]);
      // Session expired or not authenticated — drop back to the login form.
      if (aptRes.status === 401 || anaRes.status === 401) {
        setIsLoggedIn(false);
        return;
      }
      if (aptRes.ok) setAppointments(await aptRes.json());
      if (revRes.ok) setReviews(await revRes.json());
      if (anaRes.ok) setAnalytics(await anaRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/appointments/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (response.ok) {
        fetchQueueData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchQueueData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Live Chat Hub Functions
  const fetchChatSessions = async () => {
    try {
      const res = await fetch("/api/admin/chats");
      if (res.ok) {
        const data = await res.json();
        setChatSessions(data);
      }
    } catch (err) {
      console.error("Error fetching live chat sessions:", err);
    }
  };

  const fetchActiveChatHistory = async () => {
    if (!selectedSessionId) return;
    try {
      const res = await fetch(`/api/chat/history?sessionId=${selectedSessionId}`);
      if (res.ok) {
        const data = await res.json();
        setChatSessions(prev => 
          prev.map(sess => sess.id === selectedSessionId ? { ...sess, messages: data } : sess)
        );
      }
    } catch (err) {
      console.error("Error fetching active session history", err);
    }
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !adminReplyText.trim()) return;

    const replyMsg = adminReplyText.trim();
    setAdminReplyText("");

    try {
      const res = await fetch("/api/admin/chats/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          text: replyMsg
        })
      });

      if (res.ok) {
        fetchActiveChatHistory();
        fetchChatSessions();
      }
    } catch (err) {
      console.error("Failed to send admin reply", err);
    }
  };

  // Security status — real system checks are performed on the server.
  const runSecurityScan = async () => {
    setIsScanning(true);
    setSecurityLogs(["[INIT] Server bilan xavfsiz ulanish o'rnatildi.", "[INFO] Real tizim holati so'ralmoqda..."]);
    try {
      const res = await fetch("/api/admin/security-scan", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSecurityState(data.security);
        setSecurityLogs(prev => [...prev, ...data.logs]);
      } else if (res.status === 401) {
        setIsLoggedIn(false);
      } else {
        setSecurityLogs(prev => [...prev, "[ERROR] Tekshiruvni bajarib bo'lmadi."]);
      }
    } catch (err) {
      setSecurityLogs(prev => [...prev, "[ERROR] Server bilan ulanish xatosi."]);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCloseDangerousPorts = async () => {
    setSecurityLogs(prev => [...prev, "[SYSTEM] Tizim holati serverdan yangilanmoqda..."]);
    try {
      const res = await fetch("/api/admin/close-ports", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSecurityState(data.security);
        setSecurityLogs(prev => [...prev, "[SUCCESS] Holat yangilandi. Ilova faqat bitta portda, Nginx reverse proxy ortida ishlaydi."]);
      }
    } catch (err) {
      setSecurityLogs(prev => [...prev, "[ERROR] Server bilan ulanish xatosi."]);
    }
  };

  const handleRenewCertificates = async () => {
    setIsRenewingCert(true);
    setSecurityLogs(["[INIT] SSL sertifikat holati serverdan so'ralmoqda..."]);
    try {
      const res = await fetch("/api/admin/renew-certificates", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSecurityState(data.security);
        setSecurityLogs(prev => [...prev, ...data.logs]);
      } else if (res.status === 401) {
        setIsLoggedIn(false);
      } else {
        setSecurityLogs(prev => [...prev, "[ERROR] Ma'lumot olib bo'lmadi."]);
      }
    } catch (err) {
      setSecurityLogs(prev => [...prev, "[ERROR] Server bilan ulanish xatosi."]);
    } finally {
      setIsRenewingCert(false);
    }
  };

  // Inline State editors helper
  const handleEditService = (servId: string, field: string, val: any, langKey?: string) => {
    setServices(prev => 
      prev.map(s => {
        if (s.id === servId) {
          if (langKey) {
            // Update the translation dictionary key dynamically!
            setTranslations((prevTrans: any) => {
              const updated = { ...prevTrans };
              if (!updated[langKey]) updated[langKey] = {};
              updated[langKey][s.titleKey] = val; // Assuming we edit title text directly
              return updated;
            });
            return s;
          } else {
            return { ...s, [field]: val };
          }
        }
        return s;
      })
    );
  };

  const handleAddService = () => {
    const timestamp = Date.now();
    const id = `service_${timestamp}`;
    const titleKey = `service_title_${timestamp}`;
    const descKey = `service_desc_${timestamp}`;
    
    const newService: DentalService = {
      id,
      titleKey,
      descKey,
      iconName: "Activity",
      priceFrom: 100000,
      currency: "so'm",
      image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=400"
    };

    setTranslations((prev: any) => {
      const updated = { ...prev };
      ['uz', 'en', 'ru'].forEach((lang) => {
        if (!updated[lang]) updated[lang] = {};
        updated[lang][titleKey] = "Yangi xizmat nomi";
        updated[lang][descKey] = "Xizmat haqida batafsil ma'lumot";
      });
      return updated;
    });

    setServices((prev) => [...prev, newService]);
  };

  const handleDeleteService = (id: string) => {
    if (confirm("Ushbu xizmatni o'chirib tashlamoqchimisiz?")) {
      setServices((prev) => prev.filter(s => s.id !== id));
    }
  };

  const handleAddDoctor = () => {
    const timestamp = Date.now();
    const id = `doctor_${timestamp}`;
    const specializationKey = `doctor_spec_${timestamp}`;

    const newDoctor: Doctor = {
      id,
      name: "Yangi Shifokor",
      specializationKey,
      experience: 5,
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400",
      socials: {
        telegram: "https://t.me/dr_ilhom_dental",
        phone: "+998906134666"
      },
      certificates: []
    };

    setTranslations((prev: any) => {
      const updated = { ...prev };
      ['uz', 'en', 'ru'].forEach((lang) => {
        if (!updated[lang]) updated[lang] = {};
        updated[lang][specializationKey] = lang === 'uz' ? "Stomatolog-Terapevt" : lang === 'en' ? "General Dentist" : "Стоматолог-Терапевт";
      });
      return updated;
    });

    setDoctors((prev) => [...prev, newDoctor]);
  };

  const handleDeleteDoctor = (id: string) => {
    if (confirm("Ushbu shifokorni o'chirib tashlamoqchimisiz?")) {
      setDoctors((prev) => prev.filter(d => d.id !== id));
    }
  };

  const activeSession = chatSessions.find(s => s.id === selectedSessionId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans text-yellow-200 admin-theme-yellow-black">
      
      {/* SECURITY GATED LOCK SCREEN */}
      {!isLoggedIn ? (
        <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-2xl"></div>
          
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Shield className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 font-display">Dr. Ilhom Dental CMS Control</h2>
            <p className="text-xs text-slate-500 mt-1">
              {!isSetup 
                ? "Tizimdan foydalanish uchun avval xavfsiz login parol o'rnating."
                : "Administrator sahifasiga xavfsiz kirish"
              }
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex gap-2 items-center mb-4">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs flex gap-2 items-center mb-4">
              <Check className="w-4 h-4 flex-shrink-0 text-emerald-500" />
              <span>{authSuccessMsg}</span>
            </div>
          )}

          {/* Setup Form */}
          {!isSetup ? (
            <form onSubmit={handleSetupAdmin} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1.5 font-bold">Yangi Login (Username)</label>
                <input 
                  type="text" 
                  value={setupUsername} 
                  onChange={(e) => setSetupUsername(e.target.value)} 
                  placeholder="Masalan: admin" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1.5 font-bold">Yangi Parol (Password)</label>
                <input 
                  type="password" 
                  value={setupPassword} 
                  onChange={(e) => setSetupPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs tracking-wide shadow-md shadow-blue-500/10 active:scale-95 transition-all mt-4 cursor-pointer"
              >
                Login va Parol o'rnatish
              </button>
            </form>
          ) : (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1.5 font-bold">Foydalanuvchi nomi</label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="admin" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1.5 font-bold">Maxfiy parol</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs tracking-wide shadow-md shadow-blue-500/10 active:scale-95 transition-all mt-4 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Xavfsiz Kirish</span>
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-500" />
              <span>SSL Secured Tunnel</span>
            </span>
            <button onClick={onClose} className="hover:text-slate-700 cursor-pointer">Ortga qaytish</button>
          </div>
        </div>
      ) : (
        /* FULLY AUTHENTICATED ADMIN DASHBOARD */
        <div className="w-full max-w-6xl bg-slate-50 border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="p-4 sm:p-6 bg-white border-b border-slate-150 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 shadow-sm">
                <Shield className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-md sm:text-lg font-bold text-slate-800 font-display tracking-tight flex items-center gap-2">
                  <span>Dr Ilhom CMS & Admin</span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold">Authorized</span>
                </h2>
                <p className="text-xs text-slate-500 hidden sm:block">Klinika ma'lumotlari, xavfsizlik va telegram boshqaruvi</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-bold">
                <Lock className="w-3 h-3" />
                <span>SSL Secured</span>
              </div>
              
              {telegramConfig.enabled && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-bold">
                  <Send className="w-3 h-3" />
                  <span>TG Bot: Active</span>
                </div>
              )}

              <button
                onClick={toggleSound}
                title={soundEnabled ? "Ovozli bildirishnoma yoqilgan" : "Ovozli bildirishnoma o'chirilgan"}
                aria-label={soundEnabled ? "Ovozli bildirishnomani o'chirish" : "Ovozli bildirishnomani yoqish"}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] transition-all font-semibold cursor-pointer ${
                  soundEnabled
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : 'bg-slate-100 border-slate-200 text-slate-400'
                }`}
              >
                {soundEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                <span>Ovoz</span>
              </button>

              <button
                onClick={handleLogout}
                className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-[10px] transition-all font-semibold cursor-pointer"
              >
                Chiqish
              </button>

              <button 
                onClick={onClose}
                className="px-4 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 hover:text-rose-700 transition-all text-xs font-bold cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-4 bg-white border-b border-slate-150 flex items-center gap-1 sm:gap-4 overflow-x-auto whitespace-nowrap scrollbar-none">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`py-3 px-2 text-xs sm:text-sm font-semibold border-b-2 transition-all relative cursor-pointer ${
                activeTab === 'appointments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Arizalar Queue
              {appointments.filter(a => a.status === 'Pending').length > 0 && (
                <span className="absolute top-2 right-0 w-1.5 h-1.5 rounded-full bg-yellow-500 animate-ping"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('live_chat')}
              className={`py-3 px-2 text-xs sm:text-sm font-semibold border-b-2 transition-all relative flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'live_chat' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Live Support Chat</span>
              {chatSessions.filter(s => s.unread).length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-cyan-500 text-[8px] font-black text-slate-950">
                  {chatSessions.filter(s => s.unread).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('site_data')}
              className={`py-3 px-2 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'site_data' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Site Tahrirlash</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`py-3 px-2 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'security' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Xavfsizlik monitori</span>
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`py-3 px-2 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'reviews' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Izohlar Moderatsiyasi
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-3 px-2 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'analytics' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Analitika
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
            
            {/* 1. APPOINTMENTS QUEUE */}
            {activeTab === 'appointments' && (
              <div className="space-y-4 text-slate-800 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 font-display">Tashrif arizalarini boshqarish</h3>
                  <button
                    onClick={fetchQueueData}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 animate-spin" /> Yangilash
                  </button>
                </div>

                {/* Search & status filter toolbar */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={aptSearch}
                    onChange={(e) => { setAptSearch(e.target.value); setAptPage(1); }}
                    placeholder="Qidirish: ism, telefon, shifokor, xizmat..."
                    className="flex-1 bg-white border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none transition-all"
                  />
                  <div className="flex gap-1.5">
                    {(['All', 'Pending', 'Approved', 'Cancelled'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => { setAptStatusFilter(st); setAptPage(1); }}
                        className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                          aptStatusFilter === st
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {st === 'All' ? 'Barchasi' : st}
                      </button>
                    ))}
                  </div>
                </div>

                {appointments.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-white shadow-sm">
                    <p className="text-sm text-slate-500">Arizalar mavjud emas.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-mono tracking-wider text-slate-500 uppercase">
                          <th className="p-4">Bemor</th>
                          <th className="p-4">Telefon</th>
                          <th className="p-4">Sana va Vaqt</th>
                          <th className="p-4">Yonalish / Shifokor</th>
                          <th className="p-4">Holat</th>
                          <th className="p-4 text-right">Amallar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {pagedAppointments.map((apt) => (
                          <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 font-semibold text-slate-800">
                              <div>{apt.name}</div>
                              {apt.comments && (
                                <div className="text-xs text-slate-500 mt-1 font-normal max-w-xs truncate italic">
                                  "{apt.comments}"
                                </div>
                              )}
                            </td>
                            <td className="p-4 font-mono text-slate-600">{apt.phone}</td>
                            <td className="p-4 text-slate-600">
                              <span className="block font-medium">{apt.date}</span>
                              <span className="text-[10px] font-mono text-slate-400">{apt.time}</span>
                            </td>
                            <td className="p-4 text-slate-600">
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[11px] font-medium">
                                {apt.department}
                              </span>
                              <span className="block text-[10px] text-slate-400 mt-1">{apt.doctor}</span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                apt.status === 'Approved' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : apt.status === 'Pending' 
                                  ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}>
                                {apt.status}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-1 whitespace-nowrap">
                              {apt.status === 'Pending' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(apt.id, 'Approved')}
                                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-all cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(apt.id, 'Cancelled')}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDeleteAppointment(apt.id)}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {pagedAppointments.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                              Qidiruv yoki filter bo'yicha ariza topilmadi.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    {aptTotalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/60">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {filteredAppointments.length} ta ariza · {Math.min(aptPage, aptTotalPages)}/{aptTotalPages}-sahifa
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setAptPage((p) => Math.max(1, p - 1))}
                            disabled={Math.min(aptPage, aptTotalPages) <= 1}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:border-blue-300 transition-all cursor-pointer"
                          >
                            Oldingi
                          </button>
                          <button
                            onClick={() => setAptPage((p) => Math.min(aptTotalPages, p + 1))}
                            disabled={Math.min(aptPage, aptTotalPages) >= aptTotalPages}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:border-blue-300 transition-all cursor-pointer"
                          >
                            Keyingi
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. DYNAMIC CONTENT SITE EDITOR */}
            {activeTab === 'site_data' && (
              <div className="space-y-6 text-slate-800 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div>
                    <h3 className="text-base font-bold text-slate-800 font-display">Tahrirlash va Media Markazi</h3>
                    <p className="text-xs text-slate-500 mt-1">Matnlarni uch tilda optimallashtirilgan rejimda tahrirlang va kompyuteringizdan rasm yuklang.</p>
                  </div>
                  
                  {/* Save Button */}
                  <button
                    onClick={handleSaveCMSData}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/10 active:scale-95 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>O'zgarishlarni Saqlash</span>
                  </button>
                </div>

                {cmsMessage && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs flex gap-2.5 items-center">
                    <Check className="w-4 h-4 text-emerald-600 animate-bounce" />
                    <span className="font-medium">{cmsMessage}</span>
                  </div>
                )}

                {/* 3-LANGUAGE SELECTION OPTIMIZER HEADER */}
                <div className="bg-slate-100/80 p-1.5 rounded-2xl flex gap-1.5 max-w-md">
                  {(['uz', 'en', 'ru'] as const).map((langKey) => (
                    <button
                      key={langKey}
                      onClick={() => setCmsLanguage(langKey)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        cmsLanguage === langKey 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-slate-600 hover:bg-white/40'
                      }`}
                    >
                      <span>
                        {langKey === 'uz' ? "🇺🇿 O'zbekcha" : langKey === 'en' ? "🇬🇧 English" : "🇷🇺 Русский"}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column: Doctors & Services (7 cols) */}
                  <div className="lg:col-span-7 space-y-6">
                    
                    {/* Services Editor */}
                    <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                        <h4 className="text-xs uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-500" />
                          <span>Xizmatlar va Narxlar ({cmsLanguage.toUpperCase()})</span>
                        </h4>
                        <button
                          onClick={handleAddService}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Xizmat qo'shish</span>
                        </button>
                      </div>

                      <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                        {services.map((serv) => (
                          <div key={serv.id} className="p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl flex flex-col gap-3 transition-colors relative">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-800">
                                {translations[cmsLanguage]?.[serv.titleKey] || serv.titleKey}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-mono bg-white px-2 py-0.5 rounded-md border border-slate-100">ID: {serv.id}</span>
                                <button
                                  onClick={() => handleDeleteService(serv.id)}
                                  className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                                  title="Xizmatni o'chirish"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                                <img 
                                  src={serv.image || ServiceImageMap[serv.id] || "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=400"} 
                                  className="w-16 h-12 object-cover rounded-lg border border-slate-200 bg-white shadow-sm" 
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.onerror = null;
                                    target.src = "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=400";
                                  }}
                                />
                                <label className="relative cursor-pointer">
                                  <span className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 text-[8px] font-bold block transition-all text-center select-none">
                                    {uploadingId === serv.id ? "Yuklanmoqda..." : "Media yuklash"}
                                  </span>
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => handleUploadImage(e, 'service', serv.id)}
                                    disabled={uploadingId !== null}
                                  />
                                </label>
                              </div>

                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[9px] text-slate-500 mb-1 uppercase font-mono font-semibold">Boshlang'ich Narxi (UZS)</label>
                                  <input 
                                    type="number" 
                                    value={serv.priceFrom} 
                                    onChange={(e) => handleEditService(serv.id, 'priceFrom', Number(e.target.value))}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-[9px] text-slate-500 mb-1 uppercase font-mono font-semibold">Xizmat nomi ({cmsLanguage.toUpperCase()})</label>
                                  <input 
                                    type="text" 
                                    value={translations[cmsLanguage]?.[serv.titleKey] || ""} 
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTranslations((prevTrans: any) => {
                                        const updated = { ...prevTrans };
                                        if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                        updated[cmsLanguage][serv.titleKey] = val;
                                        return updated;
                                      });
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[9px] text-slate-500 mb-1 uppercase font-mono font-semibold">Xizmat tavsifi ({cmsLanguage.toUpperCase()})</label>
                              <textarea 
                                rows={2}
                                value={translations[cmsLanguage]?.[serv.descKey] || ""} 
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTranslations((prevTrans: any) => {
                                    const updated = { ...prevTrans };
                                    if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                    updated[cmsLanguage][serv.descKey] = val;
                                    return updated;
                                  });
                                }}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                              />
                            </div>

                            <div>
                              <label className="text-[8px] text-slate-500 block uppercase font-mono font-semibold mb-1">Background Rasm URL</label>
                              <input 
                                type="text" 
                                value={serv.image || ServiceImageMap[serv.id] || ""} 
                                onChange={(e) => setServices(prev => prev.map(s => s.id === serv.id ? { ...s, image: e.target.value } : s))}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-500 focus:outline-none font-mono"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Doctors Editor */}
                    <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                        <h4 className="text-xs uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-500" />
                          <span>Shifokorlar va Foto yuklagich ({cmsLanguage.toUpperCase()})</span>
                        </h4>
                        <button
                          onClick={handleAddDoctor}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Xodim qo'shish</span>
                        </button>
                      </div>

                      <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                        {doctors.map((doc) => (
                          <div key={doc.id} className="p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl space-y-3 transition-colors relative">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-800">
                                {doc.name}
                              </span>
                              <button
                                onClick={() => handleDeleteDoctor(doc.id)}
                                className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                                title="Xodimni o'chirish"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                              <div className="flex flex-col items-center gap-2">
                                <img src={doc.image} className="w-14 h-14 object-cover rounded-2xl border border-slate-200 bg-white" />
                                
                                {/* Photo Upload Trigger */}
                                <label className="relative cursor-pointer">
                                  <span className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 text-[9px] font-bold block transition-all">
                                    {uploadingId === doc.id ? "Yuklanmoqda..." : "Rasm yuklash"}
                                  </span>
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => handleUploadImage(e, 'doctor', doc.id)}
                                    disabled={uploadingId !== null}
                                  />
                                </label>
                              </div>

                              <div className="flex-1 space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[8px] text-slate-500 block uppercase font-mono font-semibold">Doktor ismi</label>
                                    <input 
                                      type="text" 
                                      value={doc.name} 
                                      onChange={(e) => setDoctors(prev => prev.map(d => d.id === doc.id ? { ...d, name: e.target.value } : d))}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] text-slate-500 block uppercase font-mono font-semibold">Mutaxassisligi ({cmsLanguage.toUpperCase()})</label>
                                    <input 
                                      type="text" 
                                      value={translations[cmsLanguage]?.[doc.specializationKey] || ""} 
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setTranslations((prevTrans: any) => {
                                          const updated = { ...prevTrans };
                                          if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                          updated[cmsLanguage][doc.specializationKey] = val;
                                          return updated;
                                        });
                                      }}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[8px] text-slate-500 block uppercase font-mono font-semibold">Tajribasi (yil)</label>
                                    <input 
                                      type="number" 
                                      value={doc.experience} 
                                      onChange={(e) => setDoctors(prev => prev.map(d => d.id === doc.id ? { ...d, experience: Number(e.target.value) } : d))}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] text-slate-500 block uppercase font-mono font-semibold">Mutaxassisligi ID</label>
                                    <span className="text-[10px] text-blue-600 font-mono block mt-1">{doc.specializationKey}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-[8px] text-slate-500 block uppercase font-mono font-semibold">Rasm URL manzili</label>
                              <input 
                                type="text" 
                                value={doc.image} 
                                onChange={(e) => setDoctors(prev => prev.map(d => d.id === doc.id ? { ...d, image: e.target.value } : d))}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-500 focus:outline-none font-mono"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Site Translations (5 cols) */}
                  <div className="lg:col-span-5 space-y-6">

                    {/* Logo & Security Card */}
                    <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                        <Settings className="w-4 h-4 text-amber-500" />
                        <h4 className="text-xs uppercase font-mono tracking-wider text-slate-500 font-bold">
                          Klinika Logotipi & Admin Paroli
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Logo Uploading Widget */}
                        <div className="space-y-2 border border-slate-100 p-3 rounded-xl bg-slate-50/50">
                          <label className="block text-[8px] text-slate-500 uppercase font-mono font-bold">Klinika Logotipi (Logo)</label>
                          <div className="relative w-16 h-16 rounded-full overflow-hidden border border-slate-200 bg-white mx-auto shadow-sm">
                            <img src={logo || "/src/assets/images/gold_tooth_logo_1784383827217.jpg"} className="w-full h-full object-cover" />
                            {uploadingId === "logo" && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <RefreshCw className="w-4 h-4 text-white animate-spin" />
                              </div>
                            )}
                          </div>
                          
                          <label className="cursor-pointer block pt-1">
                            <span className="w-full text-center py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold block transition-all cursor-pointer">
                              {uploadingId === "logo" ? "Yuklanmoqda..." : "Rasm Yuklash"}
                            </span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleUploadLogo}
                              disabled={uploadingId !== null}
                            />
                          </label>
                        </div>

                        {/* Password Changer Form */}
                        <form onSubmit={handleUpdatePassword} className="space-y-2 border border-slate-100 p-3 rounded-xl bg-slate-50/50 flex flex-col justify-between">
                          <div>
                            <label className="block text-[8px] text-slate-500 uppercase font-mono font-bold mb-1">Admin Parolini O'zgartirish</label>
                            <input 
                              type="text" 
                              value={newAdminUsername}
                              onChange={(e) => setNewAdminUsername(e.target.value)}
                              placeholder="Login (username)"
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] text-slate-800 focus:outline-none mb-1.5"
                            />
                            <input 
                              type="password" 
                              value={newAdminPassword}
                              onChange={(e) => setNewAdminPassword(e.target.value)}
                              placeholder="Yangi parol..."
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] text-slate-800 focus:outline-none"
                            />
                          </div>

                          <div className="pt-1.5">
                            <button 
                              type="submit"
                              className="w-full text-center py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold block transition-all cursor-pointer"
                            >
                              Parolni Saqlash
                            </button>
                          </div>
                        </form>
                      </div>

                      {pwdMsg && (
                        <div className={`p-2 rounded-lg text-[10px] font-bold ${pwdMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                          {pwdMsg}
                        </div>
                      )}
                    </div>
                    
                    {/* Key Translations Form */}
                    <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                        <Globe className="w-4 h-4 text-blue-500" />
                        <h4 className="text-xs uppercase font-mono tracking-wider text-slate-500 font-bold">
                          <span>Asosiy Matnlar ({cmsLanguage.toUpperCase()})</span>
                        </h4>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[8px] text-slate-500 uppercase font-mono font-semibold mb-1">Klinika nomi / Brend sarlavhasi</label>
                          <input 
                            type="text" 
                            value={translations[cmsLanguage]?.clinic_title || ""} 
                            onChange={(e) => {
                              const val = e.target.value;
                              setTranslations((prev: any) => {
                                const updated = { ...prev };
                                if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                updated[cmsLanguage].clinic_title = val;
                                return updated;
                              });
                            }}
                            className="w-full bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] text-slate-500 uppercase font-mono font-semibold mb-1">Hero Bosh Sarlavha (Katta matn)</label>
                          <textarea 
                            rows={2}
                            value={translations[cmsLanguage]?.hero_title || ""} 
                            onChange={(e) => {
                              const val = e.target.value;
                              setTranslations((prev: any) => {
                                const updated = { ...prev };
                                if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                updated[cmsLanguage].hero_title = val;
                                return updated;
                              });
                            }}
                            className="w-full bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 transition-all leading-relaxed"
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] text-slate-500 uppercase font-mono font-semibold mb-1">Hero Sub-Sarlavha (Kichik matn)</label>
                          <textarea 
                            rows={3}
                            value={translations[cmsLanguage]?.hero_subtitle || ""} 
                            onChange={(e) => {
                              const val = e.target.value;
                              setTranslations((prev: any) => {
                                const updated = { ...prev };
                                if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                updated[cmsLanguage].hero_subtitle = val;
                                return updated;
                              });
                            }}
                            className="w-full bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 transition-all leading-relaxed"
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] text-slate-500 uppercase font-mono font-semibold mb-1">Klinika manzili</label>
                          <input 
                            type="text" 
                            value={translations[cmsLanguage]?.contact_address || ""} 
                            onChange={(e) => {
                              const val = e.target.value;
                              setTranslations((prev: any) => {
                                const updated = { ...prev };
                                if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                updated[cmsLanguage].contact_address = val;
                                return updated;
                              });
                            }}
                            className="w-full bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] text-slate-500 uppercase font-mono font-semibold mb-1">Kafolat va Sertifikatlar matni</label>
                          <input 
                            type="text" 
                            value={translations[cmsLanguage]?.footer_rights || ""} 
                            onChange={(e) => {
                              const val = e.target.value;
                              setTranslations((prev: any) => {
                                const updated = { ...prev };
                                if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                updated[cmsLanguage].footer_rights = val;
                                return updated;
                              });
                            }}
                            className="w-full bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
                          />
                        </div>

                        {/* Biz Haqimizda Bo'limi Matnlari */}
                        <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
                          <h5 className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">"Biz Haqimizda" Bo'limi</h5>
                          
                          <div>
                            <label className="block text-[8px] text-slate-500 uppercase font-mono font-semibold mb-1">Bo'lim Sarlavhasi (About Title)</label>
                            <input 
                              type="text" 
                              value={translations[cmsLanguage]?.about_title || ""} 
                              onChange={(e) => {
                                const val = e.target.value;
                                setTranslations((prev: any) => {
                                  const updated = { ...prev };
                                  if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                  updated[cmsLanguage].about_title = val;
                                  return updated;
                                });
                              }}
                              className="w-full bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-[8px] text-slate-500 uppercase font-mono font-semibold mb-1">Bo'lim Sub-Sarlavhasi (About Subtitle)</label>
                            <textarea 
                              rows={2}
                              value={translations[cmsLanguage]?.about_subtitle || ""} 
                              onChange={(e) => {
                                const val = e.target.value;
                                setTranslations((prev: any) => {
                                  const updated = { ...prev };
                                  if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                  updated[cmsLanguage].about_subtitle = val;
                                  return updated;
                                });
                              }}
                              className="w-full bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 transition-all leading-relaxed"
                            />
                          </div>

                          <div>
                            <label className="block text-[8px] text-slate-500 uppercase font-mono font-semibold mb-1">Asosiy Tavsif Matni (About Text)</label>
                            <textarea 
                              rows={3}
                              value={translations[cmsLanguage]?.about_text || ""} 
                              onChange={(e) => {
                                const val = e.target.value;
                                setTranslations((prev: any) => {
                                  const updated = { ...prev };
                                  if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                  updated[cmsLanguage].about_text = val;
                                  return updated;
                                });
                              }}
                              className="w-full bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 transition-all leading-relaxed"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[8px] text-slate-500 uppercase font-mono font-semibold mb-1">Afzallik 1 (Point 1)</label>
                              <input 
                                type="text" 
                                value={translations[cmsLanguage]?.about_point_1 || ""} 
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTranslations((prev: any) => {
                                    const updated = { ...prev };
                                    if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                    updated[cmsLanguage].about_point_1 = val;
                                    return updated;
                                  });
                                }}
                                className="w-full bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] text-slate-500 uppercase font-mono font-semibold mb-1">Afzallik 2 (Point 2)</label>
                              <input 
                                type="text" 
                                value={translations[cmsLanguage]?.about_point_2 || ""} 
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTranslations((prev: any) => {
                                    const updated = { ...prev };
                                    if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                    updated[cmsLanguage].about_point_2 = val;
                                    return updated;
                                  });
                                }}
                                className="w-full bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] text-slate-500 uppercase font-mono font-semibold mb-1">Afzallik 3 (Point 3)</label>
                              <input 
                                type="text" 
                                value={translations[cmsLanguage]?.about_point_3 || ""} 
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTranslations((prev: any) => {
                                    const updated = { ...prev };
                                    if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                    updated[cmsLanguage].about_point_3 = val;
                                    return updated;
                                  });
                                }}
                                className="w-full bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] text-slate-500 uppercase font-mono font-semibold mb-1">Afzallik 4 (Point 4)</label>
                              <input 
                                type="text" 
                                value={translations[cmsLanguage]?.about_point_4 || ""} 
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTranslations((prev: any) => {
                                    const updated = { ...prev };
                                    if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                    updated[cmsLanguage].about_point_4 = val;
                                    return updated;
                                  });
                                }}
                                className="w-full bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[8px] text-slate-500 uppercase font-mono font-semibold mb-1">Tugma matni (About Button)</label>
                            <input 
                              type="text" 
                              value={translations[cmsLanguage]?.about_more_btn || ""} 
                              onChange={(e) => {
                                const val = e.target.value;
                                setTranslations((prev: any) => {
                                  const updated = { ...prev };
                                  if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                  updated[cmsLanguage].about_more_btn = val;
                                  return updated;
                                });
                              }}
                              className="w-full bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
                            />
                          </div>
                        </div>

                        {/* Bo'lim Sarlavhalari (Section Titles) */}
                        <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
                          <h5 className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Bo'lim Sarlavhalari (Section Titles & Subtitles)</h5>

                          <div className="grid grid-cols-1 gap-4">
                            {/* Xizmatlar */}
                            <div className="border border-slate-100 p-2.5 rounded-xl bg-slate-50/30 space-y-2">
                              <span className="block text-[9px] font-bold text-slate-600 uppercase font-mono">Xizmatlar bo'limi</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[7px] text-slate-400 uppercase font-mono">Sarlavha (services_title)</label>
                                  <input 
                                    type="text" 
                                    value={translations[cmsLanguage]?.services_title || ""} 
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTranslations((prev: any) => {
                                        const updated = { ...prev };
                                        if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                        updated[cmsLanguage].services_title = val;
                                        return updated;
                                      });
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[7px] text-slate-400 uppercase font-mono">Izoh (services_subtitle)</label>
                                  <input 
                                    type="text" 
                                    value={translations[cmsLanguage]?.services_subtitle || ""} 
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTranslations((prev: any) => {
                                        const updated = { ...prev };
                                        if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                        updated[cmsLanguage].services_subtitle = val;
                                        return updated;
                                      });
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Shifokorlar */}
                            <div className="border border-slate-100 p-2.5 rounded-xl bg-slate-50/30 space-y-2">
                              <span className="block text-[9px] font-bold text-slate-600 uppercase font-mono">Shifokorlar bo'limi</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[7px] text-slate-400 uppercase font-mono">Sarlavha (doctors_title)</label>
                                  <input 
                                    type="text" 
                                    value={translations[cmsLanguage]?.doctors_title || ""} 
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTranslations((prev: any) => {
                                        const updated = { ...prev };
                                        if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                        updated[cmsLanguage].doctors_title = val;
                                        return updated;
                                      });
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[7px] text-slate-400 uppercase font-mono">Izoh (doctors_subtitle)</label>
                                  <input 
                                    type="text" 
                                    value={translations[cmsLanguage]?.doctors_subtitle || ""} 
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTranslations((prev: any) => {
                                        const updated = { ...prev };
                                        if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                        updated[cmsLanguage].doctors_subtitle = val;
                                        return updated;
                                      });
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Galereya */}
                            <div className="border border-slate-100 p-2.5 rounded-xl bg-slate-50/30 space-y-2">
                              <span className="block text-[9px] font-bold text-slate-600 uppercase font-mono">Galereya bo'limi</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[7px] text-slate-400 uppercase font-mono">Sarlavha (gallery_title)</label>
                                  <input 
                                    type="text" 
                                    value={translations[cmsLanguage]?.gallery_title || ""} 
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTranslations((prev: any) => {
                                        const updated = { ...prev };
                                        if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                        updated[cmsLanguage].gallery_title = val;
                                        return updated;
                                      });
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[7px] text-slate-400 uppercase font-mono">Izoh (gallery_subtitle)</label>
                                  <input 
                                    type="text" 
                                    value={translations[cmsLanguage]?.gallery_subtitle || ""} 
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTranslations((prev: any) => {
                                        const updated = { ...prev };
                                        if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                        updated[cmsLanguage].gallery_subtitle = val;
                                        return updated;
                                      });
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Izohlar */}
                            <div className="border border-slate-100 p-2.5 rounded-xl bg-slate-50/30 space-y-2">
                              <span className="block text-[9px] font-bold text-slate-600 uppercase font-mono">Izohlar bo'limi</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[7px] text-slate-400 uppercase font-mono">Sarlavha (reviews_title)</label>
                                  <input 
                                    type="text" 
                                    value={translations[cmsLanguage]?.reviews_title || ""} 
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTranslations((prev: any) => {
                                        const updated = { ...prev };
                                        if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                        updated[cmsLanguage].reviews_title = val;
                                        return updated;
                                      });
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[7px] text-slate-400 uppercase font-mono">Izoh (reviews_subtitle)</label>
                                  <input 
                                    type="text" 
                                    value={translations[cmsLanguage]?.reviews_subtitle || ""} 
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTranslations((prev: any) => {
                                        const updated = { ...prev };
                                        if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                        updated[cmsLanguage].reviews_subtitle = val;
                                        return updated;
                                      });
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Qabulga yozilish */}
                            <div className="border border-slate-100 p-2.5 rounded-xl bg-slate-50/30 space-y-2">
                              <span className="block text-[9px] font-bold text-slate-600 uppercase font-mono">Qabulga yozilish bo'limi</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[7px] text-slate-400 uppercase font-mono">Sarlavha (booking_title)</label>
                                  <input 
                                    type="text" 
                                    value={translations[cmsLanguage]?.booking_title || ""} 
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTranslations((prev: any) => {
                                        const updated = { ...prev };
                                        if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                        updated[cmsLanguage].booking_title = val;
                                        return updated;
                                      });
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[7px] text-slate-400 uppercase font-mono">Izoh (booking_subtitle)</label>
                                  <input 
                                    type="text" 
                                    value={translations[cmsLanguage]?.booking_subtitle || ""} 
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTranslations((prev: any) => {
                                        const updated = { ...prev };
                                        if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                        updated[cmsLanguage].booking_subtitle = val;
                                        return updated;
                                      });
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Aloqa */}
                            <div className="border border-slate-100 p-2.5 rounded-xl bg-slate-50/30 space-y-2">
                              <span className="block text-[9px] font-bold text-slate-600 uppercase font-mono">Aloqa bo'limi</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[7px] text-slate-400 uppercase font-mono">Sarlavha (contact_title)</label>
                                  <input 
                                    type="text" 
                                    value={translations[cmsLanguage]?.contact_title || ""} 
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTranslations((prev: any) => {
                                        const updated = { ...prev };
                                        if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                        updated[cmsLanguage].contact_title = val;
                                        return updated;
                                      });
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[7px] text-slate-400 uppercase font-mono">Izoh (contact_subtitle)</label>
                                  <input 
                                    type="text" 
                                    value={translations[cmsLanguage]?.contact_subtitle || ""} 
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTranslations((prev: any) => {
                                        const updated = { ...prev };
                                        if (!updated[cmsLanguage]) updated[cmsLanguage] = {};
                                        updated[cmsLanguage].contact_subtitle = val;
                                        return updated;
                                      });
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Social Network / Contact URLs Section */}
                    <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-4 text-left">
                      <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                        <Settings className="w-4 h-4 text-amber-500" />
                        <h4 className="text-xs uppercase font-mono tracking-wider text-slate-500 font-bold">
                          Aloqa & Ijtimoiy Tarmoq Manzillari (URLs)
                        </h4>
                      </div>

                      <div className="space-y-3.5 text-xs text-slate-700">
                        <div>
                          <label className="block text-[8px] text-slate-500 uppercase font-mono font-semibold mb-1">Telegram Havolasi (URL / Username)</label>
                          <input 
                            type="text" 
                            value={contacts?.telegram || ""} 
                            onChange={(e) => setContacts((prev: any) => ({ ...prev, telegram: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-amber-500 transition-all"
                            placeholder="https://t.me/dr_ilhom_dental"
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] text-slate-500 uppercase font-mono font-semibold mb-1">Instagram Havolasi (URL)</label>
                          <input 
                            type="text" 
                            value={contacts?.instagram || ""} 
                            onChange={(e) => setContacts((prev: any) => ({ ...prev, instagram: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-amber-500 transition-all"
                            placeholder="https://instagram.com/dr_ilhom_dental"
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] text-slate-500 uppercase font-mono font-semibold mb-1">WhatsApp Havolasi (URL / Telefon)</label>
                          <input 
                            type="text" 
                            value={contacts?.whatsapp || ""} 
                            onChange={(e) => setContacts((prev: any) => ({ ...prev, whatsapp: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-amber-500 transition-all"
                            placeholder="https://wa.me/998906134666"
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] text-slate-500 uppercase font-mono font-semibold mb-1">Asosiy Telefon raqami</label>
                          <input 
                            type="text" 
                            value={contacts?.phone || ""} 
                            onChange={(e) => setContacts((prev: any) => ({ ...prev, phone: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-amber-500 transition-all"
                            placeholder="+998906134666"
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] text-slate-500 uppercase font-mono font-semibold mb-1">Google Maps Havolasi (URL)</label>
                          <input 
                            type="text" 
                            value={contacts?.google_maps || ""} 
                            onChange={(e) => setContacts((prev: any) => ({ ...prev, google_maps: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-amber-500 transition-all"
                            placeholder="https://google.com/maps/..."
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] text-slate-500 uppercase font-mono font-semibold mb-1">Yandex Maps Havolasi (URL)</label>
                          <input 
                            type="text" 
                            value={contacts?.yandex_maps || ""} 
                            onChange={(e) => setContacts((prev: any) => ({ ...prev, yandex_maps: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-amber-500 transition-all"
                            placeholder="https://yandex.com/maps/..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Before & After Image Comparison Slider Editor */}
                    <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        <h4 className="text-xs uppercase font-mono tracking-wider text-slate-500 font-bold">
                          Oldin va Keyin Slider Rasmlari
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Before image upload */}
                        <div className="space-y-2">
                          <label className="block text-[10px] text-slate-500 uppercase font-mono font-bold">Oldin (Before)</label>
                          <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-100 relative bg-slate-50 group">
                            <img src={beforeAfter.before} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[10px] text-white font-medium bg-black/60 px-2.5 py-1 rounded-full">Almashtirish</span>
                            </div>
                          </div>
                          
                          <label className="cursor-pointer block">
                            <span className="w-full text-center py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold block transition-all">
                              {uploadingId === "beforeafter-before" ? "Yuklanmoqda..." : "Rasm Yuklash (Oldin)"}
                            </span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handleUploadBeforeAfter(e, 'before')}
                              disabled={uploadingId !== null}
                            />
                          </label>
                        </div>

                        {/* After image upload */}
                        <div className="space-y-2">
                          <label className="block text-[10px] text-slate-500 uppercase font-mono font-bold">Keyin (After)</label>
                          <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-100 relative bg-slate-50 group">
                            <img src={beforeAfter.after} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[10px] text-white font-medium bg-black/60 px-2.5 py-1 rounded-full">Almashtirish</span>
                            </div>
                          </div>
                          
                          <label className="cursor-pointer block">
                            <span className="w-full text-center py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold block transition-all">
                              {uploadingId === "beforeafter-after" ? "Yuklanmoqda..." : "Rasm Yuklash (Keyin)"}
                            </span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handleUploadBeforeAfter(e, 'after')}
                              disabled={uploadingId !== null}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="space-y-2 text-[10px] text-slate-400">
                        <p>💡 Ushbu rasmlar saytning Galereya qismi tepasidagi interaktiv suriluvchi solishtirish oynasida ko'rinadi.</p>
                      </div>
                    </div>

                    {/* Quick Standalone Media Uploader widget */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100/50 shadow-sm space-y-4">
                      <div className="flex items-center gap-2">
                        <Cloud className="w-4 h-4 text-blue-500 animate-bounce" />
                        <h4 className="text-xs uppercase font-mono tracking-wider text-slate-600 font-bold">Mustaqil Rasm Yuklash Markazi</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Galereya yoki yangi xizmatlar uchun rasmni bu yerga yuklab, uning server manzilidan istalgan joyda foydalanishingiz mumkin:
                      </p>

                      <div className="border border-dashed border-blue-200 rounded-xl p-4 bg-white text-center">
                        <label className="cursor-pointer block">
                          <span className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-block transition-all shadow-md">
                            Kompuyuterdan fayl tanlash
                          </span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                try {
                                  const res = await fetch("/api/upload", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ name: file.name, type: file.type, data: reader.result as string })
                                  });
                                  if (res.ok) {
                                    const d = await res.json();
                                    if (d.success && d.url) {
                                      prompt("Rasm muvaffaqiyatli yuklandi! Quyidagi URL manzilidan foydalanishingiz mumkin:", d.url);
                                    }
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        <span className="text-[10px] text-slate-400 block mt-2">Formatlar: JPG, PNG, WEBP (Maks 10MB)</span>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            )}

            {/* 3. LIVE SUPPORT DESK & TELEGRAM INTEGRATION */}
            {activeTab === 'live_chat' && (
              <div className="space-y-6">
                
                {/* Telegram Bot Setup Bar */}
                <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-bold flex items-center gap-2">
                      <Send className="w-4 h-4 text-cyan-400" />
                      <span>Telegram Bot va Kanal Xabarnomalari</span>
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">Bemor xabarlari, qabullar va xavflar botga boradi</span>
                  </div>

                  <form onSubmit={handleSaveTelegramConfig} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-[9px] text-slate-500 uppercase font-mono mb-1">Telegram Bot Token</label>
                      <input 
                        type="password" 
                        value={telegramConfig.botToken}
                        onChange={(e) => setTelegramConfig(prev => ({ ...prev, botToken: e.target.value }))}
                        placeholder={telegramConfig.botToken ? "********" : "68231215:AAFlkX193..."} 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase font-mono mb-1">Telegram Chat ID / Account ID</label>
                      <input 
                        type="text" 
                        value={telegramConfig.chatId}
                        onChange={(e) => setTelegramConfig(prev => ({ ...prev, chatId: e.target.value }))}
                        placeholder="Masalan: 12458319" 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="submit"
                        className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all"
                      >
                        Saqlash
                      </button>
                      <button 
                        type="button"
                        onClick={handleTestTelegram}
                        className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-cyan-400 font-bold text-xs border border-slate-700 transition-all"
                      >
                        Test
                      </button>
                    </div>
                  </form>

                  {tgMsg && (
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px]">
                      {tgMsg}
                    </div>
                  )}
                </div>

                {/* Live Chat Messaging Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[480px]">
                  
                  {/* Left Column: Sessions List (4 cols) */}
                  <div className="lg:col-span-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex flex-col overflow-hidden">
                    <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-bold font-mono uppercase text-slate-400">Aktiv Chat Seanslari</span>
                      <button 
                        onClick={fetchChatSessions}
                        className="p-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
                      {chatSessions.length === 0 ? (
                        <div className="text-center py-12 text-slate-600 text-xs">Aktiv chat seanslari yo'q</div>
                      ) : (
                        chatSessions.map((sess) => (
                          <div 
                            key={sess.id}
                            onClick={() => setSelectedSessionId(sess.id)}
                            className={`p-3.5 cursor-pointer flex items-center justify-between transition-colors ${
                              selectedSessionId === sess.id 
                                ? 'bg-blue-600/10 border-l-4 border-blue-500' 
                                : 'hover:bg-slate-800/20'
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-xs text-slate-200 truncate">{sess.name}</span>
                                <span className="text-[9px] text-slate-500 font-mono">
                                  {sess.lastUpdated ? new Date(sess.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 truncate">
                                {sess.messages?.[sess.messages.length - 1]?.text || "Bo'sh chat..."}
                              </p>
                            </div>

                            {sess.unread && (
                              <span className="w-2 h-2 rounded-full bg-cyan-500 flex-shrink-0 animate-ping"></span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right Column: Chat Dialog Screen (8 cols) */}
                  <div className="lg:col-span-8 rounded-2xl bg-slate-950/40 border border-slate-800 flex flex-col overflow-hidden">
                    {selectedSessionId && activeSession ? (
                      <>
                        {/* Selected Header */}
                        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="block font-bold text-xs text-white">{activeSession.name}</span>
                            <span className="text-[9px] text-slate-500 font-mono">Seans ID: {activeSession.id}</span>
                          </div>
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Mijoz Online</span>
                          </span>
                        </div>

                        {/* Dialogue Stream */}
                        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/10">
                          {activeSession.messages?.map((m: any, i: number) => (
                            <div 
                              key={i}
                              className={`flex gap-2 max-w-[85%] ${m.role === 'user' ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                            >
                              <div className="flex flex-col">
                                <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                                  m.role === 'user' 
                                    ? 'bg-slate-900 border border-slate-850 text-slate-200 rounded-tl-sm'
                                    : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-tr-sm'
                                }`}>
                                  {m.text}
                                </div>
                                <span className="text-[8px] text-slate-500 mt-1 self-end font-mono">
                                  {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                </span>
                              </div>
                            </div>
                          ))}
                          <div ref={chatEndRef} />
                        </div>

                        {/* Response Input */}
                        <form onSubmit={handleSendAdminReply} className="p-3 bg-slate-950 border-t border-slate-850 flex gap-2">
                          <input 
                            type="text" 
                            value={adminReplyText}
                            onChange={(e) => setAdminReplyText(e.target.value)}
                            placeholder="Mijozga javob yozing... (TG bot xabar beradi)"
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                          />
                          <button 
                            type="submit"
                            disabled={!adminReplyText.trim()}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-50 transition-all flex items-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Javob Yozish</span>
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center space-y-2">
                        <MessageSquare className="w-10 h-10 text-slate-700 animate-bounce" />
                        <span className="text-xs font-bold">Muloqotni Boshlash</span>
                        <p className="text-[11px] text-slate-600 max-w-xs">Xabarlarga real-vaqtda javob berish va o'qish uchun chap tarafdan chat seansini tanlang.</p>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

            {/* 4. DEFENSIVE SECURITY CONTROLS (NMAP SCAN & CERTIFICATE AUTO RENEWAL) */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                
                {/* Visual Security Alerts Box */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase tracking-wider font-mono text-slate-500">Shield Protection</span>
                      <span className="text-xs font-bold text-slate-200">Express Firewall Active</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase tracking-wider font-mono text-slate-500">Security Certificate</span>
                      <span className="text-xs font-bold text-emerald-400">HTTPS Enforced 100%</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                      <Activity className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase tracking-wider font-mono text-slate-500">Security Threats</span>
                      <span className="text-xs font-bold text-slate-200">0 Hazards Detected</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Controls Column (5 cols) */}
                  <div className="lg:col-span-5 space-y-6">
                    
                    {/* Diagnostic Audit Control Panel */}
                    <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-5">
                      <div>
                        <h4 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                          <Terminal className="w-4 h-4 text-blue-400" />
                          <span>Tizim Port Security Audit (Nmap Scan)</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Server tarmoq portlarini diagnostika qilish va uning faol xizmat ulanishlarini tekshirish uchun skanerni ishga tushiring.
                        </p>
                      </div>

                      <div className="space-y-2 border-t border-slate-850 pt-3 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-mono">So'nggi Skanerlash:</span>
                          <span className="text-slate-300 font-bold font-mono">{securityState.lastScanTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-mono">Xavf Darajasi:</span>
                          <span className="text-emerald-400 font-black font-mono">LOW (PAST RISK)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-mono">Ochiq Portlar:</span>
                          <span className="text-slate-300 font-mono">{securityState.openPorts?.join(", ") || "Faqat Port 3000"}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 pt-2">
                        <button 
                          onClick={runSecurityScan}
                          disabled={isScanning}
                          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                          <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                          <span>Nmap Audit Skanerlash</span>
                        </button>

                        <button 
                          onClick={handleCloseDangerousPorts}
                          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-2"
                        >
                          <Lock className="w-4 h-4 text-emerald-400" />
                          <span>Havfli ochiq portlarni yopish</span>
                        </button>
                      </div>
                    </div>

                    {/* Auto-renew Certificates Controls */}
                    <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-5">
                      <div>
                        <h4 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                          <Key className="w-4 h-4 text-cyan-400" />
                          <span>Sertifikatlarni Avtomatik Yangilash</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Site xavfsizlik kalitlari, Let's Encrypt Wildcard SSL sertifikatlari va JWT shifrlash tokenlarini bir tugma bilan yangilang.
                        </p>
                      </div>

                      <div className="space-y-3">
                        {securityState.certificates?.map((cert: any) => (
                          <div key={cert.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-850 text-xs flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                              <span className="font-semibold text-slate-300">{cert.name}</span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{cert.expiry}</span>
                          </div>
                        ))}
                      </div>

                      <button 
                        onClick={handleRenewCertificates}
                        disabled={isRenewingCert}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold text-xs disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                        <RefreshCw className={`w-4 h-4 ${isRenewingCert ? 'animate-spin' : ''}`} />
                        <span>Sertifikatlarni yangilash</span>
                      </button>
                    </div>

                  </div>

                  {/* Right Real-time Secure Terminal Column (7 cols) */}
                  <div className="lg:col-span-7 flex flex-col rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden h-[460px]">
                    <div className="px-4 py-3 bg-slate-950 border-b border-slate-850 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <span className="text-xs font-mono text-slate-400 ml-2">secure_admin_diagnostic.sh</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Express Tunnel v2.5</span>
                    </div>

                    {/* Console log outputs */}
                    <div className="flex-1 p-4 overflow-y-auto bg-slate-950/80 font-mono text-xs text-emerald-400 space-y-2">
                      {securityLogs.length === 0 ? (
                        <div className="text-slate-600 flex flex-col items-center justify-center h-full text-center space-y-2">
                          <Terminal className="w-8 h-8 text-slate-800" />
                          <span>Xavfsizlik audit jurnali bo'sh</span>
                          <p className="text-[10px] text-slate-700 max-w-xs">Nmap Audit skaneri yoki avtomatik sertifikat yangilashni ishga tushirganingizda, bu yerda real-vaqt diagnostic ma'lumotlari chiqadi.</p>
                        </div>
                      ) : (
                        securityLogs.map((log, i) => (
                          <div key={i} className="leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-150">
                            {log}
                          </div>
                        ))
                      )}
                      <div ref={logsEndRef} />
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* 5. REVIEWS MODERATION */}
            {activeTab === 'reviews' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-200 font-display">Bemorlar fikr-mulohazalarini moderatsiya qilish</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-slate-200">{rev.name}</span>
                          <span className="text-xs font-mono text-slate-500">{rev.date}</span>
                        </div>
                        <div className="flex items-center gap-1 mb-3 text-amber-500">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <span key={i}>★</span>
                          ))}
                        </div>
                        <p className="text-sm text-slate-400 italic">"{rev.text}"</p>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800/50">
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Chop etilgan (Published)
                        </span>
                        <button
                          onClick={() => {
                            setReviews(prev => prev.filter(r => r.id !== rev.id));
                          }}
                          className="text-xs text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> O'chirish
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. PERFORMANCE ANALYTICS */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Chart Block */}
                  <div className="md:col-span-2 p-6 rounded-2xl bg-slate-950/40 border border-slate-800">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">Klinika Tashriflar Grafigi</h4>
                        <p className="text-xs text-slate-400">Oylik muvaffaqiyatli qabul arizalari tahlili</p>
                      </div>
                      {(() => {
                        // Real month-over-month growth from server analytics
                        const m = analytics.monthly || [];
                        const cur = m[m.length - 1]?.appointments || 0;
                        const prev = m[m.length - 2]?.appointments || 0;
                        const growth = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : 0;
                        return (
                          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs ${growth >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>{growth >= 0 ? '+' : ''}{growth}%</span>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorApt" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0B5FFF" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#0B5FFF" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                          <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px' }}
                            labelStyle={{ color: '#94A3B8', fontWeight: 'bold' }}
                          />
                          <Area type="monotone" dataKey="appointments" stroke="#0B5FFF" strokeWidth={2} fillOpacity={1} fill="url(#colorApt)" name="Arizalar" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200 mb-4 font-display">Qabullar Hisoboti (Real)</h4>
                      <div className="space-y-4">
                        <div>
                          <span className="text-xs text-slate-500 block uppercase font-mono">Tasdiqlangan qabullar</span>
                          <div className="text-2xl font-black text-slate-100 flex items-center gap-1 mt-1 font-display">
                            <Check className="w-6 h-6 text-emerald-500" />
                            <span>{analytics.approved}</span>
                            <span className="text-xs text-slate-400 font-normal ml-1">/ {analytics.total} ta ariza</span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800/80">
                          <span className="text-xs text-slate-500 block uppercase font-mono">Eng ko'p tanlangan shifokor</span>
                          <div className="text-sm font-semibold text-slate-200 mt-1">
                            {(() => {
                              const counts: Record<string, number> = {};
                              appointments.forEach((a) => { if (a.doctor) counts[a.doctor] = (counts[a.doctor] || 0) + 1; });
                              const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
                              return top ? `${top[0]} (${top[1]} ta)` : "Hozircha ma'lumot yo'q";
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800/80">
                      <span className="text-[10px] text-slate-500 uppercase font-mono block">Ma'lumotlar bazasi holati</span>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-semibold text-emerald-400">Doimiy Sinxronlangan</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
