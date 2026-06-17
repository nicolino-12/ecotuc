"use client";

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { 
  Trash2, AlertTriangle, Users, CheckCircle, Clock, MapPin, 
  ListFilter, ShieldAlert, PlusCircle, Smartphone, Map as MapIcon, 
  ClipboardList, LogOut, Send, Camera, User, Lock, Mail, Check, HelpCircle, Info,
  Database, RefreshCw, Eye, Phone, Home, Flame
} from 'lucide-react';

// Base de datos local persistente
import { 
  initDB, getAllReports, getAllCrews, addReport, getReportStats, 
  saveAllReports, saveAllCrews, getReportsByEmail, resetDB,
  loginUser, registerUser, supportReport,
  type Report, type Crew
} from '../lib/db';

// Cargar dinámicamente componentes Leaflet
const MapDashboard = dynamic(() => import('../components/MapDashboard'), { 
  ssr: false,
  loading: () => <div className="h-[500px] bg-card flex items-center justify-center rounded-2xl">Cargando mapa de operaciones...</div>
});

// Helper para hacer click en el mapa en el portal del ciudadano
const MapSelector = dynamic(() => import('../components/MapSelector'), { 
  ssr: false,
  loading: () => <div className="h-64 bg-black/20 animate-pulse rounded-xl border border-white/5 flex items-center justify-center text-xs text-gray-500">Cargando mapa de ubicación...</div>
});

import CrewsPanel from '../components/CrewsPanel';
import ReportsTable from '../components/ReportsTable';
import MockMobileSimulator from '../components/MockMobileSimulator';

const SAMPLE_PHOTOS = [
  {
    name: 'Basural Masivo',
    url: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop',
    category: 'BASURAL',
    desc: 'Basura tirada en esquina de baldío.'
  },
  {
    name: 'Alcantarilla Tapada',
    url: 'https://images.unsplash.com/photo-1542060748-10c28b629f6f?w=600&auto=format&fit=crop',
    category: 'ALCANTARILLA',
    desc: 'Residuos obstruyendo el paso del agua.'
  },
  {
    name: 'Escombros de Obra',
    url: 'https://images.unsplash.com/photo-1590086782792-4f9f9743479f?w=600&auto=format&fit=crop',
    category: 'ESCOMBROS',
    desc: 'Ladrillos y arena en la acera.'
  }
];

export default function AppContainer() {
  // Estado de sesión
  const [user, setUser] = useState<any | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState<'OPERATOR' | 'CITIZEN'>('OPERATOR');

  // Estados de registro y autenticación
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Campos de registro
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regRole, setRegRole] = useState<'OPERATOR' | 'CITIZEN'>('CITIZEN');

  // Estados de datos generales
  const [reports, setReports] = useState<Report[]>([]);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [activeTab, setActiveTab] = useState<'map' | 'crews' | 'table' | 'simulator'>('map');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [apiOnline, setApiOnline] = useState<boolean>(false);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    closed: 0,
    urgent: 0,
    activeCrews: 0
  });

  // Estados del formulario del ciudadano web
  const [citCategory, setCitCategory] = useState<string>('BASURAL');
  const [citDesc, setCitDesc] = useState<string>('');
  const [citPhotoIdx, setCitPhotoIdx] = useState<number | null>(null);
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [locationInput, setLocationInput] = useState<string>('');
  const [locationFeedback, setLocationFeedback] = useState<string>('');
  const [citCoords, setCitCoords] = useState<{ lat: number; lng: number }>({
    lat: -26.828372,
    lng: -65.222312
  });
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  // Vista del ciudadano: mis reportes vs nuevo reporte
  const [citizenView, setCitizenView] = useState<'new' | 'my_reports'>('new');
  const [citizenReportFilter, setCitizenReportFilter] = useState<'mine' | 'all'>('mine');

  // Filtros globales de métricas para el dashboard de operador
  const [metricFilter, setMetricFilter] = useState<string>('ALL');

  const categoryDistribution = React.useMemo(() => {
    const counts: Record<string, number> = {
      BASURAL: 0,
      ALCANTARILLA: 0,
      ESCOMBROS: 0,
      PELIGROSO: 0,
      OTROS: 0,
    };
    
    reports.forEach(r => {
      if (counts[r.category] !== undefined) {
        counts[r.category]++;
      } else {
        counts.OTROS++;
      }
    });

    const total = reports.length || 1;

    return Object.entries(counts).map(([cat, val]) => ({
      category: cat,
      count: val,
      percentage: (val / total) * 100
    })).sort((a, b) => b.count - a.count);
  }, [reports]);

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  const getImageUrl = (url: string) => {
    if (!url) return 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop';
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const cleanBackendUrl = backendUrl.replace('/api', '');
    return `${cleanBackendUrl}${url}`;
  };

  // Inicializar la base de datos local al cargar la app
  useEffect(() => {
    initDB();
  }, []);

  // Cargar datos desde la DB local (o backend si está online)
  const loadData = useCallback(async () => {
    try {
      const resReports = await fetch(`${backendUrl}/reports`);
      if (!resReports.ok) throw new Error();
      const dataReports = await resReports.json();
      
      const resCrews = await fetch(`${backendUrl}/crews`);
      const dataCrews = await resCrews.json();

      const resStats = await fetch(`${backendUrl}/reports/stats`);
      const dataStats = await resStats.json();

      setReports(dataReports);
      setCrews(dataCrews);
      setStats({
        total: dataStats.total,
        open: dataStats.open,
        closed: dataStats.closed,
        urgent: dataStats.urgent,
        activeCrews: dataStats.activeCrews
      });
      setApiOnline(true);
    } catch (e) {
      // ===== MODO OFFLINE: Leer desde localStorage =====
      const localReports = getAllReports();
      const localCrews = getAllCrews();
      const localStats = getReportStats();

      setReports(localReports);
      setCrews(localCrews);
      setStats(localStats);
      setApiOnline(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);


  // Manejar Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const res = loginUser(loginEmail, loginPassword);
    if (!res.success) {
      setAuthError(res.error || 'Credenciales inválidas');
      return;
    }

    setUser(res.session);

    // Recargar datos al loguearse (para ver reportes actualizados)
    setTimeout(() => loadData(), 100);

    if (res.session?.role === 'CITIZEN') {
      setActiveTab('map'); 
      setCitizenView('new');
    }
  };

  // Manejar Registro
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const res = registerUser({
      fullName: regFullName,
      email: regEmail,
      password: regPassword,
      phone: regPhone,
      address: regAddress,
      role: regRole,
    });

    if (!res.success) {
      setAuthError(res.error || 'Error al registrar el usuario');
      return;
    }

    setAuthSuccess('Usuario registrado con éxito. Iniciando sesión...');
    
    // Auto-login tras registro
    setTimeout(() => {
      setUser({
        id: res.user?.id,
        email: res.user?.email,
        fullName: res.user?.fullName,
        role: res.user?.role,
        phone: res.user?.phone,
        address: res.user?.address,
        avatarColor: res.user?.avatarColor,
      });
      loadData();
      
      // Limpiar campos
      setRegFullName('');
      setRegEmail('');
      setRegPassword('');
      setRegPhone('');
      setRegAddress('');
      setAuthSuccess(null);

      if (res.user?.role === 'CITIZEN') {
        setActiveTab('map'); 
        setCitizenView('new');
      }
    }, 1500);
  };

  const handlePreFill = (role: 'OPERATOR' | 'CITIZEN') => {
    setLoginRole(role);
    setLoginEmail(role === 'OPERATOR' ? 'operador@ecotuc.gov.ar' : 'ciudadano1@gmail.com');
    setLoginPassword('password123');
    setAuthError(null);
  };

  // Buscar dirección con Nominatim
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  const handleGPSLocation = () => {
    if (!navigator.geolocation) {
      alert("La geolocalización no es compatible con este navegador.");
      return;
    }
    setLocationFeedback("Obteniendo coordenadas GPS...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCitCoords({ lat: latitude, lng: longitude });
        setLocationInput(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setLocationFeedback("Ubicación GPS obtenida con éxito.");
      },
      (error) => {
        console.error(error);
        setLocationFeedback("No se pudo obtener la ubicación GPS.");
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSearchAddress = async () => {
    if (!locationInput.trim()) return;
    setIsSearchingAddress(true);
    setLocationFeedback("Buscando dirección...");
    try {
      const query = encodeURIComponent(`${locationInput}, Tucumán, Argentina`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          setCitCoords({ lat, lng });
          setLocationFeedback(`Dirección: ${data[0].display_name.split(',')[0]}`);
        } else {
          processLocationInput(locationInput);
        }
      } else {
        processLocationInput(locationInput);
      }
    } catch (err) {
      console.error(err);
      processLocationInput(locationInput);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  // Helper para convertir formato DMS (Grados Minutos Segundos) a Decimal
  const parseDMS = (dmsStr: string): number | null => {
    const regex = /(\d+)\s*[°d]\s*(\d+)\s*['m]\s*(\d+(?:\.\d+)?)\s*["s]\s*([NSEWnsew])/i;
    const match = dmsStr.match(regex);
    if (!match) return null;

    const degrees = parseFloat(match[1]);
    const minutes = parseFloat(match[2]);
    const seconds = parseFloat(match[3]);
    const direction = match[4].toUpperCase();

    let decimal = degrees + minutes / 60 + seconds / 3600;
    if (direction === 'S' || direction === 'W') {
      decimal = -decimal;
    }
    return decimal;
  };

  // Procesador inteligente de pegado de ubicación (coordenadas / enlace de maps)
  const processLocationInput = (val: string) => {
    setLocationInput(val);
    if (!val.trim()) {
      setLocationFeedback('');
      return;
    }

    // 1. Intentar parsear formato DMS (e.g. "26°49'42.1"S 65°13'20.3"W")
    const dmsMatches = val.match(/(\d+\s*[°d]\s*\d+\s*['m]\s*\d+(?:\.\d+)?\s*["s]\s*[NSns])\s*[, \t]?\s*(\d+\s*[°d]\s*\d+\s*['m]\s*\d+(?:\.\d+)?\s*["s]\s*[EWew])/i);
    if (dmsMatches) {
      const latDec = parseDMS(dmsMatches[1]);
      const lngDec = parseDMS(dmsMatches[2]);
      if (latDec !== null && lngDec !== null) {
        setCitCoords({ lat: latDec, lng: lngDec });
        setLocationFeedback('Coordenadas DMS de Google Maps procesadas y convertidas.');
        return;
      }
    }

    // 2. Intentar buscar coordenadas decimales "lat,lng" dentro de cualquier URL de Google Maps
    const urlCoordsRegex = /(?:place\/|query=|q=|@)(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
    const matchUrl = val.match(urlCoordsRegex);
    if (matchUrl) {
      const lat = parseFloat(matchUrl[1]);
      const lng = parseFloat(matchUrl[2]);
      setCitCoords({ lat, lng });
      setLocationFeedback('Enlace de Google Maps procesado con éxito.');
      return;
    }

    // 3. Intentar parsear coordenadas decimales simples "lat, lng" o "lat lng"
    const coordsRegex = /(-?\d+\.\d{3,})\s*[, \t]\s*(-?\d+\.\d{3,})/;
    const matchCoords = val.match(coordsRegex);
    if (matchCoords) {
      const lat = parseFloat(matchCoords[1]);
      const lng = parseFloat(matchCoords[2]);
      
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setCitCoords({ lat, lng });
        setLocationFeedback('Coordenadas decimales copiadas de Maps detectadas.');
        return;
      }
    }

    // 4. Simulación de Geocodificador de dirección de Tucumán
    let hash = 0;
    for (let i = 0; i < val.length; i++) {
      hash = val.charCodeAt(i) + ((hash << 5) - hash);
    }
    const offsetLat = (hash % 100) / 4000; 
    const offsetLng = ((hash >> 2) % 100) / 4000;
    
    const geocodedLat = -26.828372 + offsetLat;
    const geocodedLng = -65.222312 + offsetLng;

    setCitCoords({ lat: geocodedLat, lng: geocodedLng });
    setLocationFeedback('Dirección interpretada (Geocodificador Simulado).');
  };

  // Crear reporte desde Ciudadano Web — PERSISTENTE
  const handleCitizenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (citPhotoIdx === null && !customPhoto) return;
    setIsSubmittingReport(true);

    const priority = citCategory === 'PELIGROSO' ? 'CRITICA' 
      : citCategory === 'BASURAL' ? 'ALTA' 
      : citCategory === 'ALCANTARILLA' ? 'ALTA' 
      : 'MEDIA';
    
    const score = citCategory === 'PELIGROSO' ? 92 
      : citCategory === 'BASURAL' ? 80 
      : citCategory === 'ALCANTARILLA' ? 75 
      : 50;

    let reportPhotoUrl = customPhoto || (citPhotoIdx !== null ? SAMPLE_PHOTOS[citPhotoIdx].url : '');

    const reportData = {
      category: citCategory,
      description: citDesc,
      imageUrl: reportPhotoUrl,
      latitude: citCoords.lat,
      longitude: citCoords.lng,
      priority,
      priorityScore: score,
      status: 'PENDIENTE',
      crewId: null,
      observations: null,
      citizenEmail: user?.email || 'anonimo@ecotuc.com',
      citizenName: user?.fullName || 'Ciudadano Anónimo',
      upvotes: 0,
      supportedBy: [],
    };

    if (apiOnline) {
      try {
        // Si hay una foto personalizada y estamos online, subirla primero al backend
        if (customFile) {
          const formData = new FormData();
          formData.append('image', customFile);
          
          const uploadRes = await fetch(`${backendUrl}/reports/upload`, {
            method: 'POST',
            body: formData
          });
          
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            reportPhotoUrl = uploadData.imageUrl;
          }
        }

        const payload = {
          citizenId: 'c7c5a81e-927b-4029-bb88-29470c634b33',
          category: citCategory as any,
          description: citDesc,
          latitude: citCoords.lat,
          longitude: citCoords.lng,
          imageUrl: reportPhotoUrl
        };

        const res = await fetch(`${backendUrl}/reports`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          setShowSuccessAlert(true);
          setCitDesc('');
          setCitPhotoIdx(null);
          setCustomPhoto(null);
          setCustomFile(null);
          setLocationInput('');
          setLocationFeedback('');
          loadData();
        } else {
          throw new Error('La respuesta de la API no fue exitosa');
        }
      } catch (err) {
        console.warn('Fallo al guardar en API, guardando en local storage:', err);
        // Fallback local
        const newReport = addReport(reportData);
        setReports(getAllReports());
        setStats(getReportStats());

        setShowSuccessAlert(true);
        setCitDesc('');
        setCitPhotoIdx(null);
        setCustomPhoto(null);
        setCustomFile(null);
        setLocationInput('');
        setLocationFeedback('');
      } finally {
        setIsSubmittingReport(false);
      }
    } else {
      // ===== GUARDAR EN BASE DE DATOS LOCAL (localStorage) =====
      setTimeout(() => {
        const newReport = addReport(reportData);

        // Recargar todo desde la DB local
        const updatedReports = getAllReports();
        const updatedStats = getReportStats();

        setReports(updatedReports);
        setStats(updatedStats);

        setShowSuccessAlert(true);
        setCitDesc('');
        setCitPhotoIdx(null);
        setCustomPhoto(null);
        setCustomFile(null);
        setLocationInput('');
        setLocationFeedback('');
        setIsSubmittingReport(false);
      }, 600);
    }
  };

  // Calcular reportes del ciudadano actual
  const myReports = user?.email ? getReportsByEmail(user.email) : [];

  // Helper para badge de estado
  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'PENDIENTE': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'EN_REVISION': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'ASIGNADO': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'EN_PROCESO': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      'RESUELTO': 'bg-green-500/10 text-green-400 border-green-500/20',
      'RECHAZADO': 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return styles[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  // VISTA 1: LOGIN Y REGISTRO (Página de Inicio sin autenticar)
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* Luces de fondo decorativas animadas */}
        <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] bg-primary/15 rounded-full blur-[100px] text-primary animate-float-1"></div>
        <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] bg-accent-purple/10 rounded-full blur-[100px] text-accent-purple animate-float-2"></div>

        <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-white/5 flex flex-col gap-6 relative z-10 shadow-2xl transition-all duration-300">
          {/* Logo */}
          <div className="text-center flex flex-col items-center gap-2">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shadow-lg glow-green flex items-center justify-center mb-1 bg-black/20">
              <img src="/logo.png" alt="EcoTuc Logo" className="object-cover w-full h-full" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">EcoTuc</h2>
            <p className="text-xs text-gray-400">Sistema Inteligente para Reportes y Recolección Urbana</p>
          </div>

          {/* Indicador de DB */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500">
            <Database className="h-3 w-3" />
            <span>Base de datos local activa — Persistencia de reportes y usuarios</span>
          </div>

          {/* Mensajes de Feedback */}
          {authError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-start gap-2 animate-pulse">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}
          {authSuccess && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3.5 rounded-xl text-xs flex items-start gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{authSuccess}</span>
            </div>
          )}

          {authMode === 'login' ? (
            /* --- FORMULARIO DE INICIAR SESIÓN --- */
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              {/* Roles */}
              <div className="grid grid-cols-2 gap-3 p-1 bg-black/30 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setLoginRole('OPERATOR')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    loginRole === 'OPERATOR' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Operador Municipal
                </button>
                <button
                  type="button"
                  onClick={() => setLoginRole('CITIZEN')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    loginRole === 'CITIZEN' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Ciudadano
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5 bg-cardLight/50 p-3.5 rounded-xl border border-white/5">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <input 
                    type="email" 
                    required
                    placeholder="Correo Electrónico"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none flex-1"
                  />
                </div>
                <div className="flex items-center gap-2.5 bg-cardLight/50 p-3.5 rounded-xl border border-white/5">
                  <Lock className="h-4 w-4 text-gray-400" />
                  <input 
                    type="password" 
                    required
                    placeholder="Contraseña"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none flex-1"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                Ingresar a la Plataforma
              </button>

              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError(null);
                    setAuthSuccess(null);
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  ¿No tienes una cuenta? Regístrate aquí
                </button>
              </div>
            </form>
          ) : (
            /* --- FORMULARIO DE REGISTRO DE NUEVO USUARIO --- */
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center font-sans">Registrar Nuevo Usuario</span>
              
              {/* Selección de Rol en Registro */}
              <div className="grid grid-cols-2 gap-3 p-1 bg-black/30 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setRegRole('OPERATOR')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    regRole === 'OPERATOR' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Operador Municipal
                </button>
                <button
                  type="button"
                  onClick={() => setRegRole('CITIZEN')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    regRole === 'CITIZEN' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Ciudadano
                </button>
              </div>

              <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1 select-custom-scroll">
                {/* Nombre Completo */}
                <div className="flex items-center gap-2.5 bg-cardLight/50 p-3 rounded-xl border border-white/5">
                  <User className="h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    required
                    placeholder="Nombre Completo"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none flex-1"
                  />
                </div>

                {/* Correo Electrónico */}
                <div className="flex items-center gap-2.5 bg-cardLight/50 p-3 rounded-xl border border-white/5">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <input 
                    type="email" 
                    required
                    placeholder="Correo Electrónico"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none flex-1"
                  />
                </div>

                {/* Contraseña */}
                <div className="flex items-center gap-2.5 bg-cardLight/50 p-3 rounded-xl border border-white/5">
                  <Lock className="h-4 w-4 text-gray-400" />
                  <input 
                    type="password" 
                    required
                    minLength={6}
                    placeholder="Contraseña (mín. 6 caracteres)"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none flex-1"
                  />
                </div>

                {/* Teléfono */}
                <div className="flex items-center gap-2.5 bg-cardLight/50 p-3 rounded-xl border border-white/5">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <input 
                    type="tel" 
                    required
                    placeholder="Teléfono de Contacto"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none flex-1"
                  />
                </div>

                {/* Dirección */}
                <div className="flex items-center gap-2.5 bg-cardLight/50 p-3 rounded-xl border border-white/5">
                  <Home className="h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Dirección (Calle, Altura / Barrio) (Opcional)"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none flex-1"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                Completar Registro y Entrar
              </button>

              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                    setAuthSuccess(null);
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  ¿Ya tienes cuenta? Inicia sesión aquí
                </button>
              </div>
            </form>
          )}

          {/* Botones de Prellenado para prueba rápida (Sólo visible en modo login) */}
          {authMode === 'login' && (
            <div className="border-t border-white/5 pt-4 flex flex-col gap-2">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider text-center">Credenciales de prueba rápida:</span>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => handlePreFill('OPERATOR')}
                  className="bg-cardLight hover:bg-gray-800 text-[10px] text-gray-300 py-2 rounded-lg border border-white/5"
                >
                  🔑 Rol Operador
                </button>
                <button 
                  onClick={() => handlePreFill('CITIZEN')}
                  className="bg-cardLight hover:bg-gray-800 text-[10px] text-gray-300 py-2 rounded-lg border border-white/5"
                >
                  🔑 Rol Ciudadano
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // VISTA 2: CITIZEN PORTAL (Si el rol logueado es ciudadano)
  if (user.role === 'CITIZEN') {
    return (
      <div className="min-h-screen bg-background text-gray-100 flex flex-col font-sans relative overflow-hidden">
        {/* Luces de fondo animadas premium */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none animate-float-1"></div>
        <div className="absolute bottom-[20%] right-[-5%] w-[450px] h-[450px] bg-accent-purple/5 rounded-full blur-[100px] pointer-events-none animate-float-2"></div>
        {/* Navbar Ciudadano */}
        <header className="w-full glass-panel sticky top-0 z-40 border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-white/10 shadow-lg glow-green flex items-center justify-center bg-black/20">
              <img src="/logo.png" alt="EcoTuc Logo" className="object-cover w-full h-full" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">EcoTuc Ciudadano</h1>
              <p className="text-xs text-gray-400">Portal Web de Reporte y Seguimiento</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-300 font-semibold">{user.fullName}</span>
            <button 
              onClick={() => setUser(null)}
              className="text-red-400 hover:text-red-300 flex items-center gap-1.5 text-xs bg-red-500/10 py-1.5 px-3 rounded-lg border border-red-500/20"
            >
              <LogOut className="h-3.5 w-3.5" /> Salir
            </button>
          </div>
        </header>

        {/* Tabs: Nuevo Reporte / Mis Reportes */}
        <div className="px-6 md:px-12 pt-4">
          <div className="flex bg-card/60 p-1.5 rounded-xl border border-white/5 self-start gap-1 w-fit">
            <button 
              onClick={() => setCitizenView('new')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                citizenView === 'new' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-gray-400 hover:text-white'
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              Nuevo Reporte
            </button>
            <button 
              onClick={() => { setCitizenView('my_reports'); loadData(); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                citizenView === 'my_reports' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Eye className="h-4 w-4" />
              Mis Reportes ({myReports.length})
            </button>
          </div>
        </div>

        {/* ALERTA DE EXITO REPORTES */}
        {showSuccessAlert && (
          <div className="mx-6 md:mx-12 mt-4 bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-primary" />
              <div>
                <div className="text-sm font-bold text-white">¡Incidencia Reportada con Éxito!</div>
                <div className="text-xs text-gray-400">Tu reporte fue guardado en la base de datos y será visible para los operadores.</div>
              </div>
            </div>
            <button 
              onClick={() => setShowSuccessAlert(false)}
              className="text-primary font-bold text-xs"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Contenido basado en la vista seleccionada con transiciones fluidas */}
        <div key={citizenView} className="flex-1 flex flex-col animate-in fade-in-50 slide-in-from-bottom-3 duration-300 ease-out">
          {citizenView === 'new' ? (
            /* ===== FORMULARIO DE NUEVO REPORTE ===== */
            <main className="flex-1 p-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
            
            {/* Formulario de Reporte Web */}
            <div className="glass-card p-6 md:p-8 rounded-2xl flex flex-col gap-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-primary" />
                  Registrar Reporte de Basura
                </h3>
                <p className="text-xs text-gray-400 mt-1">Completa los campos e indica el punto en el mapa derecho.</p>
              </div>

              <form onSubmit={handleCitizenSubmit} className="flex flex-col gap-4">
                {/* Fotos del basural */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Fotografía del Incidente:</label>
                  
                  {/* Cargar foto real */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <label className="flex-1 flex items-center justify-center gap-2 bg-cardLight/50 hover:bg-gray-800 text-xs text-white p-3.5 rounded-xl border border-dashed border-white/10 hover:border-primary cursor-pointer transition-all">
                        <Camera className="h-4 w-4 text-primary" />
                        <span className="font-sans">{customPhoto ? '📷 Cambiar foto cargada' : '📷 Subir foto desde dispositivo'}</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setCustomFile(file);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setCustomPhoto(reader.result as string);
                                setCitPhotoIdx(null); // Deseleccionar predeterminadas
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {customPhoto && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomPhoto(null);
                            setCustomFile(null);
                          }}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-3.5 rounded-xl border border-red-500/20 text-xs font-semibold font-sans"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>

                    {/* Vista previa de foto cargada */}
                    {customPhoto && (
                      <div className="h-32 w-full rounded-xl overflow-hidden border border-primary/20 relative shadow-inner">
                        <img src={customPhoto} alt="Vista previa" className="object-cover w-full h-full" />
                        <div className="absolute top-2 left-2 bg-primary text-[9px] text-white px-2 py-0.5 rounded-full font-bold uppercase font-sans">
                          Foto del vecino cargada
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fotos preestablecidas para prueba rápida */}
                  <div className="mt-1 flex flex-col gap-1.5">
                    <span className="text-[10px] text-gray-500 font-bold uppercase font-sans">O selecciona una simulación rápida:</span>
                    <div className="grid grid-cols-3 gap-3">
                      {SAMPLE_PHOTOS.map((photo, index) => (
                        <div 
                          key={index}
                          onClick={() => {
                            setCitPhotoIdx(index);
                            setCustomPhoto(null); // Limpiar foto cargada
                            setCustomFile(null);
                            setCitCategory(photo.category);
                            setCitDesc(photo.desc);
                          }}
                          className={`h-20 rounded-xl overflow-hidden cursor-pointer border-2 transition-all relative ${
                            citPhotoIdx === index ? 'border-primary ring-4 ring-primary/20 scale-95' : 'border-white/5'
                          }`}
                        >
                          <img src={photo.url} alt="" className="object-cover w-full h-full" />
                          {citPhotoIdx === index && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <Check className="h-5 w-5 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Input Inteligente de Dirección / Coordenadas / Maps Link */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400 font-semibold">Dirección de Tucumán o Coordenadas de Maps:</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="text"
                        placeholder="Ej: Av. Mate de Luna 2000  o  coordenadas..."
                        value={locationInput}
                        onChange={(e) => processLocationInput(e.target.value)}
                        className="bg-cardLight text-xs text-white p-3.5 pr-10 rounded-xl border border-white/5 focus:outline-none focus:border-primary w-full"
                      />
                      {locationFeedback && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-primary" title={locationFeedback}>
                          <Check className="h-4 w-4 bg-primary/10 p-0.5 rounded-full" />
                        </div>
                      )}
                    </div>
                    
                    {/* Botón de GPS Real */}
                    <button
                      type="button"
                      onClick={handleGPSLocation}
                      title="Usar mi ubicación GPS actual"
                      className="bg-primary/10 hover:bg-primary/20 text-primary p-3 rounded-xl border border-primary/20 transition-all flex items-center justify-center"
                    >
                      <MapPin className="h-4 w-4" />
                    </button>

                    {/* Botón de buscar dirección con Nominatim */}
                    <button
                      type="button"
                      onClick={handleSearchAddress}
                      disabled={isSearchingAddress}
                      title="Buscar dirección en el mapa"
                      className="bg-accent-purple/10 hover:bg-accent-purple/20 text-accent-purple p-3 rounded-xl border border-accent-purple/20 transition-all flex items-center justify-center"
                    >
                      {isSearchingAddress ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {locationFeedback ? (
                    <p className="text-[10px] text-primary flex items-center gap-1 mt-0.5 font-sans">
                      <Info className="h-3 w-3" /> {locationFeedback}
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-500 font-sans">Escribe una dirección y haz clic en actualizar, o usa el GPS del dispositivo.</p>
                  )}
                </div>

                {/* Categoría */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400 font-semibold">Categoría de Incidencia:</label>
                  <select
                    value={citCategory}
                    onChange={(e) => setCitCategory(e.target.value)}
                    className="bg-cardLight text-xs text-white p-3 rounded-xl border border-white/5 focus:outline-none focus:border-primary"
                  >
                    <option value="BASURAL">Basural Masivo</option>
                    <option value="ALCANTARILLA">Alcantarilla Tapada</option>
                    <option value="ESCOMBROS">Escombros</option>
                    <option value="PELIGROSO">Residuos Peligrosos</option>
                    <option value="OTROS">Otros</option>
                  </select>
                </div>

                {/* Descripción */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400 font-semibold">Observaciones / Descripción:</label>
                  <textarea
                    value={citDesc}
                    onChange={(e) => setCitDesc(e.target.value)}
                    rows={3}
                    placeholder="Describe el estado de acumulación, presencia de plásticos, roedores, etc."
                    className="bg-cardLight text-xs text-white p-3 rounded-xl border border-white/5 focus:outline-none focus:border-primary resize-none"
                  />
                </div>

                {/* Coordenadas GPS */}
                <div className="bg-black/30 p-4 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Ubicación Seleccionada:</span>
                    <span className="text-white font-semibold mt-1 block">
                      {citCoords.lat.toFixed(6)}, {citCoords.lng.toFixed(6)}
                    </span>
                  </div>
                  <div className="text-primary font-semibold text-[10px] uppercase bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                    📍 Geolocalización
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={(citPhotoIdx === null && !customPhoto) || isSubmittingReport}
                  className={`w-full py-3.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${
                    (citPhotoIdx === null && !customPhoto) || isSubmittingReport
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary-dark text-white shadow-primary/20'
                  }`}
                >
                  <Send className="h-4 w-4" />
                  {isSubmittingReport ? 'Guardando en Base de Datos...' : 'Enviar Reporte al Municipio'}
                </button>
              </form>
            </div>

            {/* Selector de Mapa para Citizen */}
            <div className="flex flex-col gap-4">
              <div className="glass-card p-4 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-gray-300 font-bold flex items-center gap-2">
                  <MapPin className="h-4.5 w-4.5 text-primary" />
                  Haz clic en el mapa de Tucumán para ubicar el basural
                </span>
                <span className="text-gray-400">Interactúa con el selector</span>
              </div>

              <div className="rounded-2xl overflow-hidden border border-white/5 h-[480px] shadow-2xl">
                <MapSelector 
                  coords={citCoords} 
                  onChange={(latlng) => {
                    setCitCoords({ lat: latlng.lat, lng: latlng.lng });
                    setLocationInput(`${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`);
                    setLocationFeedback('Ubicación seleccionada en el mapa.');
                  }} 
                />
              </div>
            </div>
          </main>
        ) : (
          /* ===== MIS REPORTES / REPORTES DEL BARRIO ===== */
          <main className="flex-1 p-6 md:px-12 pb-12">
            <div className="glass-card p-6 md:p-8 rounded-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    {citizenReportFilter === 'mine' ? 'Mis Reportes Enviados' : 'Incidencias del Barrio'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {citizenReportFilter === 'mine' 
                      ? 'Historial de incidencias reportadas con tu cuenta.' 
                      : 'Apoya los reportes de otros vecinos para alertar al municipio con mayor prioridad.'}
                  </p>
                </div>

                {/* Filtro: Mis Reportes vs Todos */}
                <div className="flex items-center gap-3">
                  <div className="flex bg-black/30 p-1 rounded-xl border border-white/5 text-xs">
                    <button
                      onClick={() => setCitizenReportFilter('mine')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        citizenReportFilter === 'mine' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Mis Reportes
                    </button>
                    <button
                      onClick={() => setCitizenReportFilter('all')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        citizenReportFilter === 'all' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Reportes del Barrio
                    </button>
                  </div>

                  <button
                    onClick={loadData}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 bg-cardLight px-3.5 py-2.5 rounded-xl border border-white/5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Actualizar
                  </button>
                </div>
              </div>

              {/* Lista Filtrada */}
              {((citizenReportFilter === 'mine' ? myReports : reports).length === 0) ? (
                <div className="text-center py-16 flex flex-col items-center gap-4">
                  <div className="p-4 rounded-2xl bg-cardLight/50 border border-white/5">
                    <ClipboardList className="h-10 w-10 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-300 font-semibold">No se encontraron reportes</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {citizenReportFilter === 'mine' 
                        ? 'Crea tu primer reporte desde la pestaña "Nuevo Reporte".' 
                        : 'No hay reportes activos registrados por vecinos.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {(citizenReportFilter === 'mine' ? myReports : reports).map((report) => {
                    const alreadySupported = report.supportedBy?.includes(user.email.toLowerCase());
                    const isOwnReport = report.citizenEmail?.toLowerCase() === user.email.toLowerCase();

                    return (
                      <div key={report.id} className="bg-cardLight/50 border border-white/5 rounded-xl p-5 flex flex-col sm:flex-row gap-5 items-start hover:border-white/10 transition-all">
                        {/* Imagen */}
                        <div className="w-24 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-black/30 border border-white/5 self-center sm:self-start">
                          <img src={getImageUrl(report.imageUrl)} alt="" className="object-cover w-full h-full" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 w-full">
                          <div className="flex flex-wrap items-center gap-3 mb-1.5">
                            <span className="text-xs font-bold text-white uppercase">{report.category}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${statusBadge(report.status)}`}>
                              {report.status.replace('_', ' ')}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                              report.priority === 'CRITICA' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              report.priority === 'ALTA' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                              'bg-gray-500/10 text-gray-400 border-gray-500/20'
                            }`}>
                              {report.priority}
                            </span>
                            
                            {/* Mostrar upvotes */}
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                              <Flame className="h-3 w-3 fill-amber-400" />
                              {report.upvotes || 0} apoyos
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 mb-2">{report.description}</p>
                          <div className="flex items-center gap-4 text-[10px] text-gray-500 font-sans">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(report.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Botón de Votación / Apoyo Vecinal */}
                        {!isOwnReport && (
                          <button
                            onClick={() => {
                              supportReport(report.id, user.email);
                              loadData();
                            }}
                            disabled={alreadySupported}
                            className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border uppercase ${
                              alreadySupported 
                                ? 'bg-green-500/10 text-green-400 border-green-500/20 cursor-default' 
                                : 'bg-primary hover:bg-primary-dark text-white border-primary/20 shadow-lg shadow-primary/10'
                            }`}
                          >
                            <Flame className={`h-4.5 w-4.5 ${alreadySupported ? 'fill-green-400' : ''}`} />
                            <span>{alreadySupported ? 'Apoyado' : 'Apoyar'}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        )}
        </div>
      </div>
    );
  }

  // VISTA 3: OPERATOR DASHBOARD (Si es operador municipal)
  return (
    <div className="min-h-screen bg-background text-gray-100 flex flex-col font-sans relative overflow-hidden">
      {/* Luces de fondo animadas premium */}
      <div className="absolute top-[-10%] left-[-10%] w-[550px] h-[550px] bg-primary/4 rounded-full blur-[130px] pointer-events-none animate-float-1"></div>
      <div className="absolute bottom-[10%] right-[-5%] w-[500px] h-[500px] bg-accent-purple/4 rounded-full blur-[110px] pointer-events-none animate-float-2"></div>
      {/* Navbar Superior */}
      <header className="w-full glass-panel sticky top-0 z-40 border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-white/10 shadow-lg glow-green flex items-center justify-center bg-black/20">
            <img src="/logo.png" alt="EcoTuc Logo" className="object-cover w-full h-full" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              EcoTuc 
              <span className="text-xs font-normal text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                Municipal v1.0
              </span>
            </h1>
            <p className="text-xs text-gray-400">Plataforma Inteligente de Gestión Ambiental</p>
          </div>
        </div>

        {/* Estado del Servidor Backend */}
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-xs">
            <Database className="h-3.5 w-3.5 text-primary" />
            <span className="text-gray-400">
              DB Local: <span className="text-primary font-semibold">{reports.length} reportes</span>
            </span>
          </div>
          <div className="hidden md:flex flex-col items-end text-xs">
            <span className="text-white font-bold">{user.fullName}</span>
            <span className="text-gray-400">Rol: {user.role}</span>
          </div>

          <button 
            onClick={() => setUser(null)}
            className="text-red-400 hover:text-red-300 flex items-center gap-1 text-xs bg-red-500/10 py-1.5 px-3 rounded-lg border border-red-500/20"
          >
            <LogOut className="h-3.5 w-3.5" /> Salir
          </button>
        </div>
      </header>

      {/* Grid de Métricas Principales */}
      <section className="p-6 md:px-12 grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        <button
          onClick={() => {
            setActiveTab('table');
            setMetricFilter('ALL');
          }}
          className={`glass-card p-5 rounded-2xl flex items-center gap-4 text-left transition-all ${
            metricFilter === 'ALL' && activeTab === 'table'
              ? 'ring-2 ring-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.02] border-primary/30'
              : 'hover:scale-[1.01] hover:border-white/10 cursor-pointer'
          }`}
        >
          <div className="p-3 rounded-xl bg-gray-500/10 text-gray-400">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-gray-400">Total de Reportes</div>
          </div>
        </button>

        <button
          onClick={() => {
            setActiveTab('table');
            setMetricFilter('OPEN');
          }}
          className={`glass-card p-5 rounded-2xl flex items-center gap-4 text-left transition-all ${
            ['OPEN', 'PENDIENTE', 'ASIGNADO', 'EN_PROCESO'].includes(metricFilter) && activeTab === 'table'
              ? 'ring-2 ring-amber-500 bg-amber-500/5 shadow-lg shadow-amber-500/10 scale-[1.02] border-amber-500/30'
              : 'hover:scale-[1.01] hover:border-white/10 cursor-pointer'
          }`}
        >
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{stats.open}</div>
            <div className="text-xs text-gray-400">Reportes Abiertos</div>
          </div>
        </button>

        <button
          onClick={() => {
            setActiveTab('table');
            setMetricFilter('CLOSED');
          }}
          className={`glass-card p-5 rounded-2xl flex items-center gap-4 text-left transition-all ${
            ['CLOSED', 'RESUELTO', 'RECHAZADO'].includes(metricFilter) && activeTab === 'table'
              ? 'ring-2 ring-green-500 bg-green-500/5 shadow-lg shadow-green-500/10 scale-[1.02] border-green-500/30'
              : 'hover:scale-[1.01] hover:border-white/10 cursor-pointer'
          }`}
        >
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{stats.closed}</div>
            <div className="text-xs text-gray-400">Resueltos / Cerrados</div>
          </div>
        </button>

        <button
          onClick={() => {
            setActiveTab('table');
            setMetricFilter('URGENT');
          }}
          className={`glass-card p-5 rounded-2xl flex items-center gap-4 text-left transition-all relative overflow-hidden group ${
            metricFilter === 'URGENT' && activeTab === 'table'
              ? 'ring-2 ring-red-500 bg-red-500/5 shadow-lg shadow-red-500/10 scale-[1.02] border-red-500/30'
              : 'hover:scale-[1.01] hover:border-white/10 cursor-pointer'
          }`}
        >
          <div className="absolute top-0 right-0 h-full w-1.5 bg-red-500"></div>
          <div className="p-3 rounded-xl bg-red-500/10 text-red-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white flex items-center gap-1.5">
              {stats.urgent}
              {stats.urgent > 0 && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping"></span>}
            </div>
            <div className="text-xs text-gray-400">Reportes Urgentes</div>
          </div>
        </button>

        <button
          onClick={() => {
            setActiveTab('crews');
            setMetricFilter('ALL');
          }}
          className={`glass-card p-5 rounded-2xl flex items-center gap-4 text-left transition-all ${
            activeTab === 'crews'
              ? 'ring-2 ring-accent-blue bg-accent-blue/5 shadow-lg shadow-accent-blue/10 scale-[1.02] border-accent-blue/30'
              : 'hover:scale-[1.01] hover:border-white/10 cursor-pointer'
          }`}
        >
          <div className="p-3 rounded-xl bg-accent-blue/10 text-accent-blue">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{stats.activeCrews}</div>
            <div className="text-xs text-gray-400">Cuadrillas Activas</div>
          </div>
        </button>
      </section>

      {/* Tabs y Panel de Control Principal */}
      <main className="flex-1 px-6 md:px-12 pb-12 flex flex-col gap-6">
        {/* Selectores de Pestaña */}
        <div className="flex bg-card/60 p-1.5 rounded-xl border border-white/5 self-start gap-1">
          <button 
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'map' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-gray-400 hover:text-white'
            }`}
          >
            <MapIcon className="h-4.5 w-4.5" />
            Mapa de Operaciones
          </button>
          <button 
            onClick={() => setActiveTab('crews')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'crews' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="h-4.5 w-4.5" />
            Gestión de Cuadrillas
          </button>
          <button 
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'table' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-gray-400 hover:text-white'
            }`}
          >
            <ClipboardList className="h-4.5 w-4.5" />
            Historial e Incidencias
          </button>
          <button 
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all border border-transparent ${
              activeTab === 'simulator' ? 'bg-accent-purple text-white shadow-md shadow-purple/20' : 'text-gray-400 hover:text-white hover:border-purple-500/20'
            }`}
          >
            <Smartphone className="h-4.5 w-4.5" />
            Simulador de Ciudadano
          </button>
        </div>

        {/* Banner de Filtro Activo */}
        {activeTab === 'table' && metricFilter !== 'ALL' && (
          <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl flex items-center justify-between text-xs text-gray-300 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <span>
                Filtro activo desde el panel superior: Mostrando únicamente <strong>{
                  metricFilter === 'OPEN' ? 'Reportes Abiertos' :
                  metricFilter === 'CLOSED' ? 'Reportes Resueltos / Cerrados' :
                  metricFilter === 'URGENT' ? 'Reportes Urgentes' :
                  metricFilter === 'PENDIENTE' ? 'Reportes Pendientes' :
                  metricFilter === 'ASIGNADO' ? 'Reportes Asignados' :
                  metricFilter === 'EN_PROCESO' ? 'Reportes En Proceso' :
                  metricFilter === 'RESUELTO' ? 'Reportes Resueltos' :
                  metricFilter === 'RECHAZADO' ? 'Reportes Rechazados' : metricFilter
                }</strong>.
              </span>
            </div>
            <button 
              onClick={() => setMetricFilter('ALL')}
              className="text-primary font-bold hover:underline bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20"
            >
              Mostrar todos
            </button>
          </div>
        )}

        {/* Contenido de la pestaña con transiciones de entrada animadas */}
        <div key={activeTab} className="flex-1 animate-in fade-in-50 slide-in-from-bottom-3 duration-300 ease-out">
          {activeTab === 'map' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <MapDashboard 
                  reports={reports} 
                  crews={crews} 
                  onSelectReport={(rep) => setSelectedReport(rep)}
                  selectedReport={selectedReport}
                />
              </div>
              <div className="lg:col-span-1">
                {selectedReport ? (
                  <div className="glass-card p-6 rounded-2xl flex flex-col gap-5 border border-white/10 sticky top-24">
                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                        selectedReport.priority === 'CRITICA' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                        selectedReport.priority === 'ALTA' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                        selectedReport.priority === 'MEDIA' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                        'bg-primary/10 text-primary border border-primary/20'
                      }`}>
                        Prioridad {selectedReport.priority}
                      </span>
                      <button 
                        onClick={() => setSelectedReport(null)}
                        className="text-gray-400 hover:text-white text-xs"
                      >
                        Cerrar
                      </button>
                    </div>

                    <div className="rounded-xl overflow-hidden h-40 relative bg-black/30 border border-white/5">
                      <img 
                        src={getImageUrl(selectedReport.imageUrl)} 
                        alt={selectedReport.category} 
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop';
                        }}
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-white">{selectedReport.category}</h3>
                      <p className="text-xs text-gray-400 mt-1">Reportado el: {new Date(selectedReport.createdAt).toLocaleString()}</p>
                      {selectedReport.citizenName && (
                        <p className="text-xs text-gray-400 mt-0.5">Por: <span className="text-white font-semibold">{selectedReport.citizenName}</span></p>
                      )}
                      <p className="text-sm text-gray-300 mt-3">{selectedReport.description || 'Sin descripción detallada.'}</p>
                    </div>

                    <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Estado:</span>
                        <span className="font-semibold text-white uppercase">{selectedReport.status}</span>
                      </div>
                      <div className="flex flex-col gap-1.5 pt-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400 font-semibold uppercase tracking-wider text-[10px]">Score de Prioridad:</span>
                          <span className="font-bold text-white text-sm">{selectedReport.priorityScore?.toFixed(1) || '0.0'} / 100</span>
                        </div>
                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-[1px]">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              selectedReport.priorityScore >= 85 ? 'bg-gradient-to-r from-orange-500 to-red-500 glow-red' :
                              selectedReport.priorityScore >= 65 ? 'bg-gradient-to-r from-amber-500 to-orange-500 glow-orange' :
                              'bg-gradient-to-r from-green-500 to-amber-500 glow-green'
                            }`}
                            style={{ width: `${selectedReport.priorityScore || 0}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{selectedReport.latitude.toFixed(6)}, {selectedReport.longitude.toFixed(6)}</span>
                      </div>
                    </div>

                    {selectedReport.status === 'PENDIENTE' && (
                      <button 
                        onClick={() => {
                          setActiveTab('crews');
                        }}
                        className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-primary/20 mt-2"
                      >
                        Asignar Cuadrilla
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="glass-card p-6 rounded-2xl flex flex-col gap-5 border border-white/5 animate-in fade-in-50 duration-300">
                    <div>
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <ClipboardList className="h-4.5 w-4.5 text-primary" />
                        Distribución de Incidencias
                      </h4>
                      <p className="text-[10px] text-gray-400 mt-1">Desglose de focos de basura por tipo.</p>
                    </div>

                    <div className="flex flex-col gap-3.5">
                      {categoryDistribution.map((item) => {
                        const barColors: Record<string, string> = {
                          BASURAL: 'bg-gradient-to-r from-blue-500 to-cyan-500 glow-blue',
                          ALCANTARILLA: 'bg-gradient-to-r from-cyan-400 to-teal-400',
                          ESCOMBROS: 'bg-gradient-to-r from-orange-400 to-amber-500 glow-orange',
                          PELIGROSO: 'bg-gradient-to-r from-red-500 to-orange-500 glow-red',
                          OTROS: 'bg-gradient-to-r from-gray-500 to-gray-400',
                        };

                        const color = barColors[item.category] || 'bg-primary';

                        return (
                          <div key={item.category} className="flex flex-col gap-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-gray-300 text-[9px] uppercase tracking-wider">{item.category}</span>
                              <span className="font-bold text-white text-[10px]">{item.count} ({item.percentage.toFixed(0)}%)</span>
                            </div>
                            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-[1px]">
                              <div 
                                className={`h-full rounded-full transition-all duration-700 ${color}`}
                                style={{ width: `${item.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="border-t border-white/5 pt-4 text-center">
                      <p className="text-[10px] text-gray-500">Haz clic en un marcador del mapa para ver sus detalles específicos.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'crews' && (
            <CrewsPanel 
              crews={crews} 
              reports={reports} 
              backendUrl={backendUrl}
              onRouteGenerated={loadData}
              apiOnline={apiOnline}
              onLocalUpdate={(updatedCrews, updatedReports) => {
                setCrews(updatedCrews);
                setReports(updatedReports);
                // Persistir en DB local
                saveAllCrews(updatedCrews);
                saveAllReports(updatedReports);
                setStats(getReportStats());
              }}
            />
          )}

          {activeTab === 'table' && (
            <ReportsTable 
              reports={reports} 
              crews={crews}
              backendUrl={backendUrl}
              onReportUpdated={loadData}
              apiOnline={apiOnline}
              statusFilter={metricFilter}
              setStatusFilter={setMetricFilter}
              onLocalUpdate={(updatedReports) => {
                setReports(updatedReports);
                // Persistir en DB local
                saveAllReports(updatedReports);
                setStats(getReportStats());
              }}
            />
          )}

          {activeTab === 'simulator' && (
            <MockMobileSimulator 
              backendUrl={backendUrl}
              onNewReport={loadData}
              apiOnline={apiOnline}
              onLocalReportAdd={(newReport) => {
                // Guardar en la DB local también desde el simulador
                const reportToSave = addReport({
                  ...newReport,
                  citizenEmail: 'simulador@ecotuc.com',
                  citizenName: 'Ciudadano (Simulador)',
                });

                const updatedReports = getAllReports();
                const updatedStats = getReportStats();
                setReports(updatedReports);
                setStats(updatedStats);
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
