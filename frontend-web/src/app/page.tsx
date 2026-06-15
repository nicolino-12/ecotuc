"use client";

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { 
  Trash2, AlertTriangle, Users, CheckCircle, Clock, MapPin, 
  ListFilter, ShieldAlert, PlusCircle, Smartphone, Map as MapIcon, 
  ClipboardList, LogOut, Send, Camera, User, Lock, Mail, Check, HelpCircle, Info,
  Database, RefreshCw, Eye, Phone, Home
} from 'lucide-react';

// Base de datos local persistente
import { 
  initDB, getAllReports, getAllCrews, addReport, getReportStats, 
  saveAllReports, saveAllCrews, getReportsByEmail, resetDB,
  loginUser, registerUser,
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

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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
    if (citPhotoIdx === null) return;
    setIsSubmittingReport(true);

    const priority = citCategory === 'PELIGROSO' ? 'CRITICA' 
      : citCategory === 'BASURAL' ? 'ALTA' 
      : citCategory === 'ALCANTARILLA' ? 'ALTA' 
      : 'MEDIA';
    
    const score = citCategory === 'PELIGROSO' ? 92 
      : citCategory === 'BASURAL' ? 80 
      : citCategory === 'ALCANTARILLA' ? 75 
      : 50;

    const reportData = {
      category: citCategory,
      description: citDesc,
      imageUrl: SAMPLE_PHOTOS[citPhotoIdx].url,
      latitude: citCoords.lat,
      longitude: citCoords.lng,
      priority,
      priorityScore: score,
      status: 'PENDIENTE',
      crewId: null,
      observations: null,
      citizenEmail: user?.email || 'anonimo@ecotuc.com',
      citizenName: user?.fullName || 'Ciudadano Anónimo',
    };

    if (apiOnline) {
      try {
        const payload = {
          citizenId: 'c7c5a81e-927b-4029-bb88-29470c634b33',
          category: citCategory as any,
          description: citDesc,
          latitude: citCoords.lat,
          longitude: citCoords.lng,
          imageUrl: SAMPLE_PHOTOS[citPhotoIdx].url
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
          setLocationInput('');
          setLocationFeedback('');
          loadData();
        }
      } catch (err) {
        console.error(err);
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
        {/* Luces de fondo decorativas */}
        <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] bg-primary/20 rounded-full blur-3xl text-primary"></div>
        <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] bg-accent-purple/15 rounded-full blur-3xl text-accent-purple"></div>

        <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-white/5 flex flex-col gap-6 relative z-10 shadow-2xl transition-all duration-300">
          {/* Logo */}
          <div className="text-center flex flex-col items-center gap-2">
            <div className="bg-primary p-3 rounded-2xl glow-green flex items-center justify-center mb-1">
              <Trash2 className="h-7 w-7 text-white" />
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
      <div className="min-h-screen bg-background text-gray-100 flex flex-col font-sans">
        {/* Navbar Ciudadano */}
        <header className="w-full glass-panel sticky top-0 z-40 border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2.5 rounded-xl glow-green flex items-center justify-center">
              <Trash2 className="h-6 w-6 text-white" />
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

        {/* Contenido basado en la vista seleccionada */}
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
                  <label className="text-xs text-gray-400 font-semibold uppercase">Fotografía Obligatoria (Selecciona una de prueba):</label>
                  <div className="grid grid-cols-3 gap-3">
                    {SAMPLE_PHOTOS.map((photo, index) => (
                      <div 
                        key={index}
                        onClick={() => {
                          setCitPhotoIdx(index);
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

                {/* Input Inteligente de Dirección / Coordenadas / Maps Link */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400 font-semibold">Dirección, Coordenadas (Decimales / DMS) o Enlace de Google Maps:</label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Pega: -26.828, -65.222  o  26°49'42.1&quot;S 65°13'20.3&quot;W  o  enlace..."
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
                  {locationFeedback ? (
                    <p className="text-[10px] text-primary flex items-center gap-1 mt-0.5">
                      <Info className="h-3 w-3" /> {locationFeedback}
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-500">Puedes copiar y pegar las coordenadas directamente de Google Maps en cualquier formato.</p>
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
                  disabled={citPhotoIdx === null || isSubmittingReport}
                  className={`w-full py-3.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${
                    citPhotoIdx === null || isSubmittingReport
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
          /* ===== MIS REPORTES ===== */
          <main className="flex-1 p-6 md:px-12 pb-12">
            <div className="glass-card p-6 md:p-8 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Mis Reportes Enviados
                </h3>
                <button
                  onClick={loadData}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 bg-cardLight px-3 py-1.5 rounded-lg border border-white/5"
                >
                  <RefreshCw className="h-3 w-3" /> Actualizar
                </button>
              </div>

              {myReports.length === 0 ? (
                <div className="text-center py-16 flex flex-col items-center gap-4">
                  <div className="p-4 rounded-2xl bg-cardLight/50 border border-white/5">
                    <ClipboardList className="h-10 w-10 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-300 font-semibold">No tienes reportes registrados</p>
                    <p className="text-xs text-gray-500 mt-1">Crea tu primer reporte desde la pestaña &quot;Nuevo Reporte&quot;</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {myReports.map((report) => (
                    <div key={report.id} className="bg-cardLight/50 border border-white/5 rounded-xl p-5 flex gap-5 items-start hover:border-white/10 transition-all">
                      {/* Imagen */}
                      <div className="w-24 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-black/30 border border-white/5">
                        <img src={report.imageUrl} alt="" className="object-cover w-full h-full" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
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
                        </div>
                        <p className="text-xs text-gray-300 truncate">{report.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500">
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        )}
      </div>
    );
  }

  // VISTA 3: OPERATOR DASHBOARD (Si es operador municipal)
  return (
    <div className="min-h-screen bg-background text-gray-100 flex flex-col font-sans">
      {/* Navbar Superior */}
      <header className="w-full glass-panel sticky top-0 z-40 border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2.5 rounded-xl glow-green flex items-center justify-center">
            <Trash2 className="h-6 w-6 text-white" />
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
        <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gray-500/10 text-gray-400">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-gray-400">Total de Reportes</div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{stats.open}</div>
            <div className="text-xs text-gray-400">Reportes Abiertos</div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{stats.closed}</div>
            <div className="text-xs text-gray-400">Resueltos / Cerrados</div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group">
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
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 rounded-xl bg-accent-blue/10 text-accent-blue">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{stats.activeCrews}</div>
            <div className="text-xs text-gray-400">Cuadrillas Activas</div>
          </div>
        </div>
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

        {/* Contenido de la pestaña */}
        <div className="flex-1">
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
                        src={selectedReport.imageUrl} 
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
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Score de Prioridad:</span>
                        <span className="font-semibold text-primary">{selectedReport.priorityScore?.toFixed(1) || '0.0'} / 100</span>
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
                  <div className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-3 h-[400px] border border-dashed border-white/10">
                    <MapPin className="h-10 w-10 text-gray-500" />
                    <div>
                      <h4 className="font-semibold text-white">Detalle de Incidencia</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-[200px] mx-auto">Selecciona un marcador en el mapa para visualizar la información del reporte.</p>
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
