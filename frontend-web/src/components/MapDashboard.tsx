"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ListFilter, MapPin, Eye } from 'lucide-react';

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
  }, [center]);
  return null;
}

export default function MapDashboard({ reports, crews, onSelectReport, selectedReport }: MapDashboardProps) {
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [mapCenter, setMapCenter] = useState<[number, number]>([-26.828372, -65.222312]);
  
  // Posiciones simuladas de los camiones
  const [simulatedPositions, setSimulatedPositions] = useState<Record<string, { lat: number; lng: number; targetIdx: number; progress: number }>>({});

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
          const route = JSON.parse(routeStr);
          if (!route || !route.optimizedSequence || route.optimizedSequence.length === 0) return;

          const startCoords: [number, number] = [-26.828372, -65.222312]; // Plaza Independencia (Base)
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
            // Completó todo el recorrido, camión estacionado en base
            next[crew.id] = { lat: startCoords[0], lng: startCoords[1], targetIdx, progress };
            return;
          }

          const fromPoint = stops[targetIdx - 1];
          const toPoint = stops[targetIdx];

          // 5% de avance por tick de intervalo (aprox 20 ticks por tramo)
          progress += 0.05; 

          if (progress >= 1) {
            lat = toPoint[0];
            lng = toPoint[1];
            targetIdx += 1;
            progress = 0;
            
            // Disparar evento de limpieza al llegar a un reporte
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
            // Interpolación lineal
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

  // 2. Trazado de líneas de rutas activas
  const activeRoutesPaths = useMemo(() => {
    const paths: { crewId: string; crewName: string; coords: [number, number][] }[] = [];
    crews.forEach(crew => {
      if (crew.status === 'EN_RUTA') {
        const routeStr = localStorage.getItem(`route_${crew.id}`);
        if (routeStr) {
          const route = JSON.parse(routeStr);
          if (route && route.optimizedSequence && route.optimizedSequence.length > 0) {
            const startCoords: [number, number] = [-26.828372, -65.222312];
            const coords: [number, number][] = [startCoords];
            route.optimizedSequence.forEach((repId: string) => {
              const rep = reports.find(r => r.id === repId || String(r.id) === String(repId));
              if (rep) {
                coords.push([rep.latitude, rep.longitude]);
              }
            });
            coords.push(startCoords);
            paths.push({
              crewId: crew.id,
              crewName: crew.name,
              coords
            });
          }
        }
      }
    });
    return paths;
  }, [crews, reports]);

  // Configuración de iconos dinámicos usando Tailwind CSS y L.divIcon
  const getReportIcon = (priority: string, status: string, category: string) => {
    const isResolved = status === 'RESUELTO';
    
    if (isResolved) {
      return L.divIcon({
        html: `
          <div class="w-8 h-8 rounded-full bg-gray-600/90 border-2 border-gray-400 flex items-center justify-center shadow-lg text-white">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        `,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
    }

    // Colores según prioridad
    const colors: Record<string, { bg: string, ring: string, border: string, text: string }> = {
      CRITICA: {
        bg: 'bg-red-500/90',
        ring: 'ring-red-500/30',
        border: 'border-red-400',
        text: 'text-white'
      },
      ALTA: {
        bg: 'bg-orange-500/90',
        ring: 'ring-orange-500/30',
        border: 'border-orange-400',
        text: 'text-white'
      },
      MEDIA: {
        bg: 'bg-amber-500/90',
        ring: 'ring-amber-500/30',
        border: 'border-amber-400',
        text: 'text-gray-900'
      },
      BAJA: {
        bg: 'bg-green-500/90',
        ring: 'ring-green-500/30',
        border: 'border-green-400',
        text: 'text-white'
      }
    };

    const c = colors[priority] || { bg: 'bg-blue-500/90', ring: 'ring-blue-500/30', border: 'border-blue-400', text: 'text-white' };

    // Iconos SVG según categoría
    let iconSvg = '';
    switch (category) {
      case 'BASURAL':
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
        break;
      case 'ALCANTARILLA':
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M12 2v20M17 5H7M19 10H5M20 15H4M17 19H7"/></svg>`;
        break;
      case 'ESCOMBROS':
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>`;
        break;
      case 'PELIGROSO':
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
        break;
      default:
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    const showPulse = priority === 'CRITICA' || priority === 'ALTA';

    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          ${showPulse ? `<span class="absolute inline-flex h-8 w-8 rounded-full ${c.bg} opacity-20 animate-ping"></span>` : ''}
          <div class="w-8 h-8 rounded-full ${c.bg} ${c.text} border-2 ${c.border} flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-all duration-300 hover:scale-110">
            ${iconSvg}
          </div>
        </div>
      `,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const getCrewIcon = (status: string) => {
    const color = status === 'EN_RUTA' ? 'bg-accent-purple border-purple-300' : 'bg-accent-blue border-blue-300';
    return L.divIcon({
      html: `
        <div class="p-2 rounded-xl ${color} text-white border-2 flex items-center justify-center shadow-2xl relative">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 17a2 2 0 11-4 0 2 2 0 014 0zM9 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16h6a1 1 0 001-1v-4a1 1 0 00-1-1h-2m-4 6H9" />
          </svg>
          <span class="absolute -top-1 -right-1 flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${status === 'EN_RUTA' ? 'bg-purple-400' : 'bg-blue-400'} opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 ${status === 'EN_RUTA' ? 'bg-purple-500' : 'bg-blue-500'}"></span>
          </span>
        </div>
      `,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  };

  // Filtrado de reportes en base a selecciones de control
  const filteredReports = reports.filter((rep) => {
    const matchCat = filterCategory === 'ALL' || rep.category === filterCategory;
    const matchStatus = filterStatus === 'ALL' || rep.status === filterStatus;
    const matchPrior = filterPriority === 'ALL' || rep.priority === filterPriority;
    return matchCat && matchStatus && matchPrior;
  });

  // Centrar en un reporte si se selecciona en la barra lateral
  useEffect(() => {
    if (selectedReport) {
      setMapCenter([selectedReport.latitude, selectedReport.longitude]);
    }
  }, [selectedReport]);

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de Filtros del Mapa */}
      <div className="glass-card p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <ListFilter className="h-4.5 w-4.5 text-primary" />
          <span>Filtros de Mapa:</span>
        </div>

        <div className="flex flex-wrap gap-3 flex-1 lg:flex-none">
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-cardLight text-xs text-gray-200 py-2 px-3 rounded-lg border border-white/5 focus:outline-none focus:border-primary"
          >
            <option value="ALL">Todas las Categorías</option>
            <option value="BASURAL">Basural</option>
            <option value="ALCANTARILLA">Alcantarilla Tapada</option>
            <option value="ESCOMBROS">Escombros</option>
            <option value="PELIGROSO">Residuos Peligrosos</option>
            <option value="OTROS">Otros</option>
          </select>

          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-cardLight text-xs text-gray-200 py-2 px-3 rounded-lg border border-white/5 focus:outline-none focus:border-primary"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="ASIGNADO">Asignado</option>
            <option value="EN_PROCESO">En Proceso</option>
            <option value="RESUELTO">Resuelto</option>
            <option value="RECHAZADO">Rechazado</option>
          </select>

          <select 
            value={filterPriority} 
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-cardLight text-xs text-gray-200 py-2 px-3 rounded-lg border border-white/5 focus:outline-none focus:border-primary"
          >
            <option value="ALL">Todas las Prioridades</option>
            <option value="CRITICA">Crítica</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAJA">Baja</option>
          </select>
        </div>
        
        <span className="text-xs text-gray-400 font-semibold">
          {filteredReports.length} reportes filtrados
        </span>
      </div>

      {/* Contenedor del Mapa */}
      <div className="rounded-2xl overflow-hidden border border-white/5 relative h-[550px] shadow-2xl">
        <MapContainer 
          center={mapCenter} 
          zoom={13} 
          scrollWheelZoom={true} 
          className="h-full w-full"
        >
          <ChangeView center={mapCenter} />
          
          {/* Estilo oscuro del mapa usando un tile público filtrado o CartoDB Dark Matter */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Marcadores de Reportes de Basura */}
          {filteredReports.map((rep) => (
            <Marker 
              key={rep.id} 
              position={[rep.latitude, rep.longitude]}
              icon={getReportIcon(rep.priority, rep.status, rep.category)}
              eventHandlers={{
                click: () => onSelectReport(rep)
              }}
            >
              <Popup>
                <div className="p-1 max-w-[200px] flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs uppercase text-primary">{rep.category}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      rep.priority === 'CRITICA' ? 'bg-red-500/20 text-red-400' :
                      rep.priority === 'ALTA' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {rep.priority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 line-clamp-2">{rep.description || 'Sin descripción.'}</p>
                  <button 
                    onClick={() => onSelectReport(rep)}
                    className="w-full bg-cardLight hover:bg-gray-800 text-[10px] text-white font-semibold py-1.5 rounded flex items-center justify-center gap-1 border border-white/5"
                  >
                    <Eye className="h-3 w-3 text-primary" /> Ver Detalle
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Trazado de Rutas Activas */}
          {activeRoutesPaths.map((p) => (
            <Polyline 
              key={p.crewId} 
              positions={p.coords} 
              color="#a855f7"
              dashArray="8, 12" 
              weight={4}
              opacity={0.8}
            />
          ))}

          {/* Marcadores de Cuadrillas */}
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
                  <h4 className="font-bold text-sm text-white">{crew.name}</h4>
                  <p className="text-xs text-gray-400">Patente: {crew.vehiclePlate}</p>
                  <p className="text-xs text-gray-400">Estado: <span className="text-primary font-semibold">{crew.status}</span></p>
                  <div className="mt-2 pt-1.5 border-t border-white/5">
                    <p className="text-[10px] font-bold text-gray-300">Integrantes:</p>
                    <ul className="list-disc pl-3 text-[10px] text-gray-400 mt-1">
                      {crew.members.map((m: any, i: number) => (
                        <li key={i}>{m.fullName} ({m.role})</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
        </MapContainer>
      </div>
    </div>
  );
}
