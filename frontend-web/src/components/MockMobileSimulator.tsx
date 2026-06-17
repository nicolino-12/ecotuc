"use client";

import React, { useState } from 'react';
import { 
  Smartphone, Camera, MapPin, Send, History, 
  Bell, CheckCircle2, User, ChevronRight, Lock, Mail, ArrowLeft, Check 
} from 'lucide-react';

interface MockMobileSimulatorProps {
  backendUrl: string;
  onNewReport: () => void;
  apiOnline: boolean;
  onLocalReportAdd?: (report: any) => void;
}

// Preset de fotos realistas para facilitar pruebas rápidas sin buscar archivos locales
const SAMPLE_PHOTOS = [
  {
    name: 'Micro-basural',
    url: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop',
    category: 'BASURAL',
    desc: 'Montículo de basura acumulado en la esquina, restos de poda y plásticos.'
  },
  {
    name: 'Alcantarilla Tapada',
    url: 'https://images.unsplash.com/photo-1542060748-10c28b629f6f?w=600&auto=format&fit=crop',
    category: 'ALCANTARILLA',
    desc: 'Rejilla pluvial colapsada por botellas y suciedad de arrastre.'
  },
  {
    name: 'Escombros de Obra',
    url: 'https://images.unsplash.com/photo-1590086782792-4f9f9743479f?w=600&auto=format&fit=crop',
    category: 'ESCOMBROS',
    desc: 'Ladrillos, bolsas de cemento y restos de pared obstaculizando la acera.'
  },
  {
    name: 'Residuos Peligrosos',
    url: 'https://images.unsplash.com/photo-1605647540924-852290f6b0d5?w=600&auto=format&fit=crop',
    category: 'PELIGROSO',
    desc: 'Envases vacíos de pesticida y restos de hidrocarburos sobre suelo natural.'
  }
];

export default function MockMobileSimulator({ 
  backendUrl, onNewReport, apiOnline, onLocalReportAdd 
}: MockMobileSimulatorProps) {
  // Estados del dispositivo simulado
  const [isLoggedIn, setIsLoggedIn] = useState(true); // Saltamos por defecto al menu
  const [currentScreen, setCurrentScreen] = useState<'home' | 'report' | 'history' | 'notifications'>('home');
  const [citizenEmail, setCitizenEmail] = useState('vecinotuc@gmail.com');
  const [citizenName, setCitizenName] = useState('Vecino EcoTuc');
  
  // Estados del formulario de Reporte
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number | null>(null);
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string>('');
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>('BASURAL');
  const [description, setDescription] = useState<string>('');
  
  // Coordenadas GPS simuladas (cerca de Plaza Independencia, Tucumán)
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number }>({
    lat: -26.828372 + (Math.random() - 0.5) * 0.02,
    lng: -65.222312 + (Math.random() - 0.5) * 0.02
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  // Historial interno simulado del ciudadano
  const [localHistory, setLocalHistory] = useState<any[]>([
    {
      id: 'h1',
      category: 'BASURAL',
      description: 'Acumulación de bolsas en mi cuadra.',
      priority: 'MEDIA',
      status: 'PENDIENTE',
      createdAt: new Date().toISOString()
    }
  ]);

  // Push Notifications simuladas
  const [notifications, setNotifications] = useState<any[]>([
    {
      id: 'n1',
      title: '¡Reporte Asignado!',
      body: 'Tu reporte de Alcantarilla Tapada ha sido asignado a una cuadrilla.',
      time: 'Hace 5m'
    },
    {
      id: 'n2',
      title: 'Incidencia Resuelta',
      body: 'La cuadrilla Sur completó la limpieza del basural reportado. ¡Gracias!',
      time: 'Ayer'
    }
  ]);

  // Generar coordenadas GPS aleatorias representativas de Tucumán
  const simulateNewGps = () => {
    const randomLat = -26.828372 + (Math.random() - 0.5) * 0.03;
    const randomLng = -65.222312 + (Math.random() - 0.5) * 0.03;
    setGpsCoords({ lat: randomLat, lng: randomLng });
  };

  // Enviar Reporte
  const handleSubmitReport = async () => {
    let finalPhoto = selectedPhotoIdx !== null ? SAMPLE_PHOTOS[selectedPhotoIdx].url : customPhotoUrl;
    if (!finalPhoto) return;

    setIsSubmitting(true);

    if (apiOnline) {
      try {
        // Subir archivo propio primero si existe y está online
        if (customFile) {
          const formData = new FormData();
          formData.append('image', customFile);
          const uploadRes = await fetch(`${backendUrl}/reports/upload`, {
            method: 'POST',
            body: formData
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            finalPhoto = uploadData.imageUrl;
          }
        }

        const payload = {
          citizenId: 'c7c5a81e-927b-4029-bb88-29470c634b33', // ID del ciudadano mock
          category: category as any,
          description,
          latitude: gpsCoords.lat,
          longitude: gpsCoords.lng,
          imageUrl: finalPhoto
        };

        const res = await fetch(`${backendUrl}/reports`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const newRep = await res.json();
          setShowSuccessAlert(true);
          onNewReport();
          
          // Reset form
          setSelectedPhotoIdx(null);
          setCustomPhotoUrl('');
          setCustomFile(null);
          setDescription('');
          simulateNewGps();
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Simulación offline
      setTimeout(() => {
        // Calcular prioridad de simulación local aproximada
        let priority: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA' = 'MEDIA';
        let score = 55;
        if (category === 'PELIGROSO') {
          priority = 'CRITICA';
          score = 88;
        }

        const newReport = {
          id: 'report_mob_' + Date.now(),
          category,
          description,
          imageUrl: finalPhoto,
          latitude: gpsCoords.lat,
          longitude: gpsCoords.lng,
          priority,
          priorityScore: score,
          status: 'PENDIENTE',
          createdAt: new Date().toISOString(),
          crewId: null
        };

        if (onLocalReportAdd) {
          onLocalReportAdd(newReport);
        }

        setLocalHistory(prev => [newReport, ...prev]);
        setShowSuccessAlert(true);
        setIsSubmitting(false);

        // Limpiar
        setSelectedPhotoIdx(null);
        setCustomPhotoUrl('');
        setCustomFile(null);
        setDescription('');
        simulateNewGps();
      }, 800);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-8 py-4">
      {/* 1. Celular Mockup Visual */}
      <div className="relative w-[340px] h-[660px] bg-black rounded-[48px] border-[10px] border-gray-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden ring-4 ring-gray-900">
        
        {/* Cámara frontal y parlante (Notch) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-6 bg-black rounded-b-2xl z-30 flex items-center justify-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-gray-900 border border-gray-800"></div>
          <div className="w-12 h-1 bg-gray-800 rounded-full"></div>
        </div>

        {/* Pantalla del Celular */}
        <div className="w-full h-full bg-[#0d0e12] flex flex-col pt-8 text-white relative">
          
          {/* Status Bar */}
          <div className="px-5 py-1 text-[11px] font-semibold flex justify-between items-center text-gray-400">
            <span>23:04</span>
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <div className="w-5 h-2.5 border border-gray-400 rounded-sm p-0.5 flex items-center">
                <div className="w-full h-full bg-primary rounded-2xs"></div>
              </div>
            </div>
          </div>

          {/* ALERTA DE ÉXITO */}
          {showSuccessAlert && (
            <div className="absolute inset-x-4 top-14 z-40 bg-primary text-white p-4 rounded-2xl flex flex-col items-center text-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-4 duration-200">
              <CheckCircle2 className="h-8 w-8" />
              <span className="font-bold text-xs">¡Reporte Enviado con Éxito!</span>
              <p className="text-[10px] text-primary-dark/80">El municipio de Tucumán ha recibido tu incidencia para su evaluación inteligente.</p>
              <button 
                onClick={() => {
                  setShowSuccessAlert(false);
                  setCurrentScreen('home');
                }}
                className="mt-1 bg-black/20 hover:bg-black/30 text-white font-bold py-1 px-4 rounded-lg text-[10px]"
              >
                Entendido
              </button>
            </div>
          )}

          {/* VISTAS DE PANTALLA */}
          {!isLoggedIn ? (
            // Pantalla de Login / Auth
            <div className="flex-1 flex flex-col justify-center px-6 gap-5">
              <div className="text-center">
                <div className="bg-primary/10 inline-block p-4 rounded-full text-primary mb-2">
                  <Smartphone className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold">EcoTuc Ciudadano</h3>
                <p className="text-xs text-gray-400 mt-1">Regístrate y reporta focos de basura</p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 bg-[#1b1c24] p-3 rounded-xl border border-white/5">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <input 
                    type="email" 
                    value={citizenEmail}
                    onChange={(e) => setCitizenEmail(e.target.value)}
                    placeholder="Correo Electrónico"
                    className="bg-transparent text-xs text-white focus:outline-none flex-1"
                  />
                </div>
                <div className="flex items-center gap-2 bg-[#1b1c24] p-3 rounded-xl border border-white/5">
                  <Lock className="h-4 w-4 text-gray-500" />
                  <input 
                    type="password" 
                    placeholder="Contraseña"
                    className="bg-transparent text-xs text-white focus:outline-none flex-1"
                  />
                </div>
              </div>

              <button 
                onClick={() => setIsLoggedIn(true)}
                className="bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/10"
              >
                Ingresar
              </button>
            </div>
          ) : (
            // Pantallas una vez Autenticado
            <div className="flex-1 flex flex-col">
              
              {/* Header de la App */}
              <header className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                {currentScreen !== 'home' ? (
                  <button 
                    onClick={() => setCurrentScreen('home')}
                    className="text-gray-400 hover:text-white flex items-center gap-1 text-xs"
                  >
                    <ArrowLeft className="h-4 w-4" /> Atrás
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                      V
                    </div>
                    <div>
                      <div className="text-xs font-bold">{citizenName}</div>
                      <div className="text-[9px] text-gray-500">Tucumán, Arg</div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentScreen('notifications')}
                    className="relative text-gray-400 hover:text-white"
                  >
                    <Bell className="h-4.5 w-4.5" />
                    <span className="absolute top-0 right-0 h-1.5 w-1.5 bg-red-500 rounded-full"></span>
                  </button>
                </div>
              </header>

              {/* Contenido Dinámico de la pantalla */}
              <div className="flex-1 overflow-y-auto p-4">
                
                {/* 1. HOME SCREEN */}
                {currentScreen === 'home' && (
                  <div className="flex flex-col gap-5">
                    {/* Banner ambiental */}
                    <div className="bg-gradient-to-r from-primary/30 to-accent-purple/30 p-4 rounded-2xl border border-white/5">
                      <h4 className="text-xs font-bold text-white">Cuidemos San Miguel</h4>
                      <p className="text-[10px] text-gray-300 mt-1">Reporta basura acumulada, micro-basurales o escombros para que el camión municipal acuda al rescate.</p>
                    </div>

                    {/* Botón de Acción Principal */}
                    <button 
                      onClick={() => setCurrentScreen('report')}
                      className="bg-primary hover:bg-primary-dark p-4 rounded-2xl flex items-center justify-between text-white font-bold transition-all shadow-lg shadow-primary/10 border-b border-black/20"
                    >
                      <div className="flex items-center gap-3">
                        <Camera className="h-5 w-5" />
                        <span className="text-xs">Reportar Foco de Basura</span>
                      </div>
                      <ChevronRight className="h-4.5 w-4.5" />
                    </button>

                    {/* Menú Secundario */}
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setCurrentScreen('history')}
                        className="bg-[#1b1c24]/50 border border-white/5 hover:border-white/10 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-2 transition-all"
                      >
                        <History className="h-5 w-5 text-accent-blue" />
                        <span className="text-[10px] font-bold text-white">Mis Reportes</span>
                      </button>
                      <button 
                        onClick={() => setCurrentScreen('notifications')}
                        className="bg-[#1b1c24]/50 border border-white/5 hover:border-white/10 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-2 transition-all"
                      >
                        <Bell className="h-5 w-5 text-accent-purple" />
                        <span className="text-[10px] font-bold text-white">Notificaciones</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. REPORT SCREEN (Formulario) */}
                {currentScreen === 'report' && (
                  <div className="flex flex-col gap-4">
                    {/* Fotos de prueba */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-gray-400 font-semibold uppercase">Fotografía Obligatoria (Vecino):</label>
                      <div className="grid grid-cols-4 gap-2 mb-1">
                        {SAMPLE_PHOTOS.map((photo, idx) => (
                          <div 
                            key={idx}
                            onClick={() => {
                              setSelectedPhotoIdx(idx);
                              setCustomPhotoUrl('');
                              setCustomFile(null);
                              setCategory(photo.category);
                              setDescription(photo.desc);
                            }}
                            className={`h-14 rounded-lg overflow-hidden border cursor-pointer transition-all relative ${
                              selectedPhotoIdx === idx && !customPhotoUrl ? 'border-primary ring-2 ring-primary/20 scale-95' : 'border-white/5'
                            }`}
                          >
                            <img src={photo.url} alt="" className="object-cover w-full h-full" />
                            {selectedPhotoIdx === idx && !customPhotoUrl && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Subir foto real en simulador */}
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center justify-center gap-1.5 bg-[#1b1c24] hover:bg-[#20212b] text-[10px] text-white p-2 rounded-xl border border-dashed border-white/10 hover:border-primary cursor-pointer transition-all font-sans">
                          <Camera className="h-3.5 w-3.5 text-primary" />
                          <span>{customPhotoUrl ? '📷 Cambiar foto cargada' : '📷 Cargar foto real del vecino'}</span>
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
                                  setCustomPhotoUrl(reader.result as string);
                                  setSelectedPhotoIdx(null); // Deseleccionar preestablecidas
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        {customPhotoUrl && (
                          <div className="relative h-20 w-full rounded-xl overflow-hidden border border-primary/20">
                            <img src={customPhotoUrl} alt="Propia" className="object-cover w-full h-full" />
                            <button
                              type="button"
                              onClick={() => {
                                setCustomPhotoUrl('');
                                setCustomFile(null);
                              }}
                              className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white px-2 py-0.5 rounded text-[8px] font-bold"
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Categoría */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-400 font-semibold uppercase">Categoría:</label>
                      <select 
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="bg-[#1b1c24] text-xs text-white p-2.5 rounded-xl border border-white/5 focus:outline-none"
                      >
                        <option value="BASURAL">Basural</option>
                        <option value="ALCANTARILLA">Alcantarilla Tapada</option>
                        <option value="ESCOMBROS">Escombros</option>
                        <option value="PELIGROSO">Residuos Peligrosos</option>
                        <option value="OTROS">Otros</option>
                      </select>
                    </div>

                    {/* Descripción */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-400 font-semibold uppercase">Descripción:</label>
                      <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        placeholder="Describe el foco de basura..."
                        className="bg-[#1b1c24] text-xs text-white p-2.5 rounded-xl border border-white/5 focus:outline-none resize-none"
                      />
                    </div>

                    {/* Ubicación GPS Simulada */}
                    <div className="bg-[#1b1c24] p-3 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-gray-400 uppercase font-semibold">Ubicación GPS:</span>
                        <button 
                          onClick={simulateNewGps}
                          className="text-primary font-bold hover:underline"
                        >
                          Simular GPS
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-white">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>{gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}</span>
                      </div>
                    </div>

                    <button 
                      disabled={(selectedPhotoIdx === null && !customPhotoUrl) || isSubmitting}
                      onClick={handleSubmitReport}
                      className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg mt-2 ${
                        (selectedPhotoIdx === null && !customPhotoUrl)
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          : 'bg-primary hover:bg-primary-dark text-white'
                      }`}
                    >
                      <Send className="h-4 w-4" />
                      {isSubmitting ? 'Enviando...' : 'Enviar Reporte'}
                    </button>
                  </div>
                )}

                {/* 3. HISTORY SCREEN */}
                {currentScreen === 'history' && (
                  <div className="flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Mis Reportes</h4>
                    
                    {localHistory.map((h, i) => (
                      <div key={i} className="bg-[#1b1c24]/80 p-3.5 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-white uppercase">{h.category}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                            h.status === 'RESUELTO' ? 'bg-primary/20 text-primary' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {h.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 line-clamp-1 mt-1">{h.description || 'Sin descripción.'}</p>
                        <div className="text-[8px] text-gray-500 mt-2">Enviado: {new Date(h.createdAt).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. NOTIFICATIONS SCREEN */}
                {currentScreen === 'notifications' && (
                  <div className="flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Notificaciones Push</h4>
                    {notifications.map(n => (
                      <div key={n.id} className="bg-[#1b1c24]/50 border border-white/5 p-3 rounded-xl flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[10px] font-bold text-white">
                          <span>{n.title}</span>
                          <span className="text-gray-500 font-normal text-[8px]">{n.time}</span>
                        </div>
                        <p className="text-[9px] text-gray-400 leading-normal">{n.body}</p>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* Botón Home de Software del celular */}
              <div 
                onClick={() => setCurrentScreen('home')}
                className="w-24 h-1 bg-gray-700 rounded-full mx-auto my-2 cursor-pointer hover:bg-white transition-all"
              ></div>
            </div>
          )}

        </div>
      </div>

      {/* 2. Panel Explicativo del Simulador */}
      <div className="flex-1 flex flex-col gap-5 max-w-md">
        <div className="bg-card p-6 rounded-2xl border border-white/5 flex flex-col gap-3">
          <h4 className="text-lg font-bold text-white flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-accent-purple" />
            Simulador de Ciudadano Integrado
          </h4>
          <p className="text-sm text-gray-300 leading-relaxed">
            Hemos diseñado esta utilidad interactiva para que puedas simular el envío de incidentes de micro-basurales 
            desde la perspectiva de un ciudadano con su aplicación móvil.
          </p>
          
          <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">¿Cómo probarlo?</h5>
            <ol className="list-decimal pl-4 text-xs text-gray-400 flex flex-col gap-2 leading-relaxed">
              <li>Haz clic en <strong>Reportar Foco de Basura</strong> en el celular simulado.</li>
              <li>Selecciona una de las <strong>fotografías de muestra</strong> (ej. Alcantarilla Tapada).</li>
              <li>Haz clic en <strong>Simular GPS</strong> para generar coordenadas aleatorias en Tucumán.</li>
              <li>Haz clic en <strong>Enviar Reporte</strong>.</li>
              <li>¡Dirígete a la pestaña <strong>Mapa de Operaciones</strong> o <strong>Historial</strong> en el dashboard para ver el nuevo reporte clasificado y geolocalizado al instante!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
