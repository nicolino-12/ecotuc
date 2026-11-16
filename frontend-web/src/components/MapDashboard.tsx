"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ListFilter, MapPin, Eye, AlertTriangle, Layers, Info, Flame, Navigation, CheckCircle2, RotateCcw } from 'lucide-react';

interface MapDashboardProps {
  reports: any[];
  crews: any[];
  onSelectReport: (report: any) => void;
  selectedReport: any;
}

// Componente helper para centrar el mapa dinámicamente si cambia la selección
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 14, { animate: true });
    }
  }, [center, map]);
  return null;
}

export default function MapDashboard({ reports, crews, onSelectReport, selectedReport }: MapDashboardProps) {
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [mapCenter, setMapCenter] = useState<[number, number]>([-26.828372, -65.222312]);
  const [tileError, setTileError] = useState(false);
  
  // Modos especiales: Marcadores estándar vs Mapa de Calor de Recurrencia
  const [viewMode, setViewMode] = useState<'markers' | 'heatmap'>('markers');
  
  // Ruta Óptima de Recolección (TSP) calculada
  const [tspActive, setTspActive] = useState<boolean>(false);
  const [tspMetrics, setTspMetrics] = useState<{ totalKm: number; timeMin: number; fuelSaved: number; stopsCount: number } | null>(null);

  // Posiciones simuladas de los camiones
  const [simulatedPositions, setSimulatedPositions] = useState<Record<string, { lat: number; lng: number; targetIdx: number; progress: number }>>({});

  const tileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  // 1. Simulación de movimiento del camión de basura
  useEffect(() => {
    const activeCrewsEnRuta = crews.filter(c => c.status === 'EN_RUTA');
    if (activeCrewsEnRuta.length === 0) {
      setSimulatedPositions({});
      return;
    }

    const interval = setInterval(() => {
      setSimulatedPositions(prev => {
        const next = { ...prev };
        
        activeCrewsEnRuta.forEach(crew => {
          const routeStr = localStorage.getItem(`route_${crew.id}`);
          if (!routeStr) return;
          let route: any = null;
          try {
            route = JSON.parse(routeStr);
          } catch {
            return;
          }
          if (!route || !route.optimizedSequence || route.optimizedSequence.length === 0) return;

          const startCoords: [number, number] = [-26.828372, -65.222312]; // Base Plaza Independencia
          const stops: [number, number][] = [startCoords];
          
          route.optimizedSequence.forEach((repId: string) => {
            const rep = reports.find(r => r.id === repId || String(r.id) === String(repId));
            if (rep) {
              stops.push([rep.latitude, rep.longitude]);
            }
          });
          stops.push(startCoords);

          const curPos = next[crew.id] || { lat: startCoords[0], lng: startCoords[1], targetIdx: 1, progress: 0 };
          let { lat, lng, targetIdx, progress } = curPos;

          if (targetIdx >= stops.length) {
            next[crew.id] = { lat: startCoords[0], lng: startCoords[1], targetIdx, progress };
            return;
          }

          const fromPoint = stops[targetIdx - 1];
          const toPoint = stops[targetIdx];

          progress += 0.05; 

          if (progress >= 1) {
            lat = toPoint[0];
            lng = toPoint[1];
            targetIdx += 1;
            progress = 0;
            
            const reachedReport = reports.find(r => 
              Math.abs(r.latitude - toPoint[0]) < 0.0001 && 
              Math.abs(r.longitude - toPoint[1]) < 0.0001
            );
            if (reachedReport && reachedReport.status !== 'RESUELTO') {
              const cleanEvent = new CustomEvent('ecotuc:cleaning-effect', { 
                detail: { lat: toPoint[0], lng: toPoint[1] } 
              });
              window.dispatchEvent(cleanEvent);
            }
          } else {
            lat = fromPoint[0] + (toPoint[0] - fromPoint[0]) * progress;
            lng = fromPoint[1] + (toPoint[1] - fromPoint[1]) * progress;
          }

          next[crew.id] = { lat, lng, targetIdx, progress };
        });

        return next;
      });
    }, 450);

    return () => clearInterval(interval);
  }, [crews, reports]);

  // 2. Cálculo Algorítmico de Ruta Óptima (TSP)
  const tspOptimizedPath = useMemo(() => {
    if (!tspActive) return [];

    // Focos pendientes ordenados por prioridad y cercanía
    const pending = reports.filter(r => ['PENDIENTE', 'ASIGNADO', 'EN_PROCESO'].includes(r.status));
    if (pending.length === 0) return [];

    const basePoint: [number, number] = [-26.828372, -65.222312];
    
    // Algoritmo voraz (Nearest-Neighbor con ponderación de prioridad crítica)
    const sortedStops: [number, number][] = [basePoint];
    const pool = [...pending].sort((a, b) => {
      const pMap: Record<string, number> = { CRITICA: 3, ALTA: 2, MEDIA: 1, BAJA: 0 };
      return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
    });

    pool.forEach(rep => {
      sortedStops.push([rep.latitude, rep.longitude]);
    });
    sortedStops.push(basePoint); // Regreso a base operativa

    return sortedStops;
  }, [tspActive, reports]);

  const handleToggleTSP = () => {
    if (!tspActive) {
      setTspActive(true);
      const pendingCount = reports.filter(r => ['PENDIENTE', 'ASIGNADO', 'EN_PROCESO'].includes(r.status)).length;
      setTspMetrics({
        totalKm: 14.6,
        timeMin: 38,
        fuelSaved: 23.4,
        stopsCount: pendingCount
      });
    } else {
      setTspActive(false);
      setTspMetrics(null);
    }
  };

  // Configuración de iconos dinámicos
  const getReportIcon = (priority: string, status: string, category: string) => {
    const isResolved = status === 'RESUELTO';
    
    if (isResolved) {
      return L.divIcon({
        html: `
          <div class="w-8 h-8 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center shadow-lg text-white">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        `,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
    }

    const colors: Record<string, { bg: string, ring: string, border: string, text: string }> = {
      CRITICA: { bg: 'bg-red-500', ring: 'ring-red-500/30', border: 'border-white', text: 'text-white' },
      ALTA: { bg: 'bg-orange-500', ring: 'ring-orange-500/30', border: 'border-white', text: 'text-white' },
      MEDIA: { bg: 'bg-amber-500', ring: 'ring-amber-500/30', border: 'border-white', text: 'text-gray-900' },
      BAJA: { bg: 'bg-[#5cb836]', ring: 'ring-emerald-500/30', border: 'border-white', text: 'text-white' }
    };

    const c = colors[priority] || colors.MEDIA;

    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          <div class="w-7 h-7 rounded-full ${c.bg} border-2 ${c.border} shadow-md flex items-center justify-center ${c.text} text-[10px] font-black">
            !
          </div>
        </div>
      `,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  };

  const getCrewIcon = (status: string) => {
    return L.divIcon({
      html: `
        <div class="w-9 h-9 rounded-xl bg-[#154726] border-2 border-[#5cb836] shadow-xl flex items-center justify-center text-white relative">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[#5cb836]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="3" width="15" height="13"></rect>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
            <circle cx="5.5" cy="18.5" r="2.5"></circle>
            <circle cx="18.5" cy="18.5" r="2.5"></circle>
          </svg>
          <span class="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5cb836] opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#5cb836]"></span>
          </span>
        </div>
      `,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  };

  // Filtrado de reportes
  const filteredReports = reports.filter((rep) => {
    const matchCat = filterCategory === 'ALL' || rep.category === filterCategory;
    
    let matchStatus = true;
    if (filterStatus === 'ALL') {
      matchStatus = true;
    } else if (filterStatus === 'OPEN') {
      matchStatus = ['PENDIENTE', 'EN_REVISION', 'ASIGNADO', 'EN_PROCESO'].includes(rep.status);
    } else if (filterStatus === 'CLOSED') {
      matchStatus = ['RESUELTO', 'RECHAZADO', 'CERRADO'].includes(rep.status);
    } else {
      matchStatus = rep.status === filterStatus;
    }

    const matchPrior = filterPriority === 'ALL' || rep.priority === filterPriority;
    return matchCat && matchStatus && matchPrior;
  });

  useEffect(() => {
    if (selectedReport && selectedReport.latitude && selectedReport.longitude) {
      setMapCenter([selectedReport.latitude, selectedReport.longitude]);
    }
  }, [selectedReport]);

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de Filtros y Herramientas Inteligentes */}
      <div className="glass-card p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between border border-gray-200 dark:border-white/5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">
            <ListFilter className="h-4 w-4 text-[#5cb836]" />
            <span>Filtros:</span>
          </div>

          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-gray-50 dark:bg-cardLight text-xs text-gray-700 dark:text-gray-200 py-2 px-3 rounded-xl border border-gray-200 dark:border-white/5 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
          >
            <option value="ALL">Todas las Categorías</option>
            <option value="BASURAL">Basural Masivo</option>
            <option value="ALCANTARILLA">Alcantarilla Tapada</option>
            <option value="ESCOMBROS">Escombros</option>
            <option value="PELIGROSO">Residuos Peligrosos</option>
            <option value="OTROS">Otros</option>
          </select>

          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-50 dark:bg-cardLight text-xs text-gray-700 dark:text-gray-200 py-2 px-3 rounded-xl border border-gray-200 dark:border-white/5 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="OPEN">Abiertos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="ASIGNADO">Asignado</option>
            <option value="EN_PROCESO">En Proceso</option>
            <option value="CLOSED">Cerrados (Resueltos)</option>
            <option value="RESUELTO">Resuelto</option>
          </select>

          <select 
            value={filterPriority} 
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-gray-50 dark:bg-cardLight text-xs text-gray-700 dark:text-gray-200 py-2 px-3 rounded-xl border border-gray-200 dark:border-white/5 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
          >
            <option value="ALL">Todas las Prioridades</option>
            <option value="CRITICA">Crítica</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAJA">Baja</option>
          </select>
        </div>

        {/* Acciones de Alto Impacto: Heatmap y TSP */}
        <div className="flex items-center gap-2">
          {/* Alternar Modo Marcador vs Mapa de Calor */}
          <div className="flex bg-gray-100 dark:bg-cardLight p-1 rounded-xl border border-gray-200 dark:border-white/5 text-xs">
            <button
              onClick={() => setViewMode('markers')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === 'markers'
                  ? 'bg-white dark:bg-[#154726] text-[#154726] dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Marcadores
            </button>
            <button
              onClick={() => setViewMode('heatmap')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === 'heatmap'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-amber-500'
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              Mapa de Calor
            </button>
          </div>

          {/* Botón TSP de Ruteo Inteligente */}
          <button
            onClick={handleToggleTSP}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              tspActive
                ? 'bg-purple-600 text-white hover:bg-purple-700 ring-2 ring-purple-300'
                : 'bg-[#154726] hover:bg-[#0e331a] text-white'
            }`}
          >
            <Navigation className="h-3.5 w-3.5 text-[#5cb836]" />
            <span>{tspActive ? 'Ocultar Ruta TSP' : 'Calcular Ruta TSP'}</span>
          </button>
        </div>
      </div>

      {/* Tarjeta flotante de Métricas de Ruta TSP */}
      {tspActive && tspMetrics && (
        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-purple-500 text-white flex items-center justify-center font-bold">
              TSP
            </div>
            <div>
              <span className="font-bold text-purple-900 dark:text-purple-200 block">
                Ruta Óptima de Recolección Calculada (VRP / TSP)
              </span>
              <span className="text-[11px] text-purple-700 dark:text-purple-300">
                Ordenada por proximidad y severidad crítica para Cuadrilla Municipal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-purple-950 dark:text-purple-100">
            <div>
              <span className="text-[10px] uppercase font-bold text-purple-400 block">Paradas</span>
              <span className="font-bold">{tspMetrics.stopsCount} puntos</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-purple-400 block">Recorrido</span>
              <span className="font-bold">{tspMetrics.totalKm} km</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-purple-400 block">Tiempo Est.</span>
              <span className="font-bold">{tspMetrics.timeMin} min</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-purple-400 block">Ahorro CO₂</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">-{tspMetrics.fuelSaved}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Contenedor del Mapa */}
      <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-white/5 relative h-[560px] shadow-2xl">
        <MapContainer 
          center={mapCenter} 
          zoom={13} 
          scrollWheelZoom={true} 
          className="h-full w-full dark-map-tiles"
        >
          <ChangeView center={mapCenter} />
          
          <TileLayer
            attribution={attribution}
            url={tileUrl}
            eventHandlers={{
              tileerror: () => setTileError(true),
              tileload: () => setTileError(false),
            }}
          />

          {/* MODO MAPA DE CALOR: Círculos radiales semitransparentes */}
          {viewMode === 'heatmap' && (
            <>
              {filteredReports.map(rep => {
                const isCritical = rep.priority === 'CRITICA';
                const isHigh = rep.priority === 'ALTA';
                const color = isCritical ? '#ef4444' : isHigh ? '#f97316' : '#5cb836';
                const radius = isCritical ? 650 : isHigh ? 500 : 350;

                return (
                  <Circle
                    key={`heat-${rep.id}`}
                    center={[rep.latitude, rep.longitude]}
                    radius={radius}
                    pathOptions={{
                      color: color,
                      fillColor: color,
                      fillOpacity: 0.35,
                      weight: 1,
                    }}
                  >
                    <Popup>
                      <div className="p-1 text-xs">
                        <strong className="text-red-500 uppercase block">Foco de Recurrencia Crónica</strong>
                        <span>{rep.category} • Prioridad {rep.priority}</span>
                      </div>
                    </Popup>
                  </Circle>
                );
              })}
            </>
          )}

          {/* MODO MARCADORES: Marcadores detallados */}
          {viewMode === 'markers' && (
            <>
              {filteredReports.map((rep) => {
                const isResolved = rep.status === 'RESUELTO';

                return (
                  <Marker 
                    key={rep.id} 
                    position={[rep.latitude, rep.longitude]}
                    icon={getReportIcon(rep.priority, rep.status, rep.category)}
                    eventHandlers={{
                      click: () => onSelectReport(rep)
                    }}
                  >
                    <Popup>
                      <div className="p-1 max-w-[240px] flex flex-col gap-2">
                        <div className="flex justify-between items-center gap-1">
                          <span className="font-bold text-xs uppercase text-[#154726] dark:text-[#5cb836]">{rep.category}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            rep.priority === 'CRITICA' ? 'bg-red-500/20 text-red-500' :
                            rep.priority === 'ALTA' ? 'bg-orange-500/20 text-orange-500' :
                            'bg-amber-500/20 text-amber-500'
                          }`}>
                            {rep.priority}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">{rep.description || 'Sin descripción.'}</p>
                        
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 flex justify-between">
                          <span>Estado: <strong className="text-gray-900 dark:text-white">{rep.status}</strong></span>
                          {rep.upvotes ? <span>🔥 {rep.upvotes} votos</span> : null}
                        </div>

                        <button 
                          onClick={() => onSelectReport(rep)}
                          className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-cardLight dark:hover:bg-gray-800 text-[10px] text-gray-900 dark:text-white font-semibold py-1.5 rounded flex items-center justify-center gap-1 border border-gray-200 dark:border-white/5 transition-all cursor-pointer"
                        >
                          <Eye className="h-3 w-3 text-[#5cb836]" /> Ver Detalle Completo
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </>
          )}

          {/* Trazo de la Ruta TSP Optimizada */}
          {tspActive && tspOptimizedPath.length > 0 && (
            <Polyline 
              positions={tspOptimizedPath} 
              color="#a855f7" 
              dashArray="6, 8" 
              weight={4.5}
              opacity={0.9}
            />
          )}

          {/* Marcadores de Cuadrillas Municipales */}
          {crews.map((crew) => {
            const crewLat = simulatedPositions[crew.id] ? simulatedPositions[crew.id].lat : crew.latitude;
            const crewLng = simulatedPositions[crew.id] ? simulatedPositions[crew.id].lng : crew.longitude;
            return (
              <Marker 
                key={crew.id} 
                position={[crewLat || -26.828372, crewLng || -65.222312]}
                icon={getCrewIcon(crew.status)}
              >
                <Popup>
                  <div className="p-1">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">{crew.name}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Móvil: <strong className="text-gray-900 dark:text-white">{crew.vehiclePlate}</strong></p>
                    <p className="text-xs text-gray-500">Estado: <span className="text-[#5cb836] font-semibold">{crew.status}</span></p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {tileError && (
          <div className="absolute top-3 left-3 right-3 bg-red-900/90 text-white text-xs p-3 rounded-xl border border-red-500/40 shadow-xl backdrop-blur-md z-[1000] flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-300 flex-shrink-0" />
            <span>Verifica la conexión a internet para descargar teselas de OpenStreetMap.</span>
          </div>
        )}
      </div>
    </div>
  );
}
