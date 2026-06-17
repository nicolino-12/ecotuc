"use client";

import React, { useState } from 'react';
import { 
  Users, Trash2, Route, Navigation, CheckCircle2, Play, 
  MapPin, Clock, Calendar, CheckSquare, Plus, Check 
} from 'lucide-react';

interface CrewsPanelProps {
  crews: any[];
  reports: any[];
  backendUrl: string;
  onRouteGenerated: () => void;
  apiOnline: boolean;
  onLocalUpdate?: (crews: any[], reports: any[]) => void;
}

export default function CrewsPanel({ 
  crews, reports, backendUrl, onRouteGenerated, apiOnline, onLocalUpdate 
}: CrewsPanelProps) {
  const [selectedCrewId, setSelectedCrewId] = useState<string>('');
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Estados para creación de cuadrilla
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCrewName, setNewCrewName] = useState('');
  const [newCrewPlate, setNewCrewPlate] = useState('');
  const [newCrewDriver, setNewCrewDriver] = useState('');
  const [newCrewCollector, setNewCrewCollector] = useState('');
  const [isCreatingCrew, setIsCreatingCrew] = useState(false);

  const handleCreateCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCrewName.trim() || !newCrewPlate.trim()) {
      alert('El nombre y la patente son obligatorios.');
      return;
    }
    setIsCreatingCrew(true);

    if (apiOnline) {
      try {
        const res = await fetch(`${backendUrl}/crews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newCrewName.trim(),
            vehiclePlate: newCrewPlate.trim()
          })
        });

        if (res.ok) {
          const createdCrew = await res.json();
          
          // Agregar miembros si se especificaron
          if (newCrewDriver.trim()) {
            await fetch(`${backendUrl}/crews/${createdCrew.id}/members`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fullName: newCrewDriver.trim(), role: 'CHOFER' })
            });
          }
          if (newCrewCollector.trim()) {
            await fetch(`${backendUrl}/crews/${createdCrew.id}/members`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fullName: newCrewCollector.trim(), role: 'RECOLECTOR' })
            });
          }

          // Recargar datos
          onRouteGenerated();
          // Resetear form
          setNewCrewName('');
          setNewCrewPlate('');
          setNewCrewDriver('');
          setNewCrewCollector('');
          setShowCreateForm(false);
        } else {
          const err = await res.json();
          alert(err.message || 'Error al crear cuadrilla.');
        }
      } catch (e) {
        console.error('Error al crear cuadrilla:', e);
      }
    } else {
      // Modo local/offline
      const newId = `c_${Date.now()}`;
      const members: any[] = [];
      if (newCrewDriver.trim()) {
        members.push({ fullName: newCrewDriver.trim(), role: 'CHOFER' });
      }
      if (newCrewCollector.trim()) {
        members.push({ fullName: newCrewCollector.trim(), role: 'RECOLECTOR' });
      }

      const newCrew = {
        id: newId,
        name: newCrewName.trim(),
        vehiclePlate: newCrewPlate.trim(),
        status: 'ACTIVA',
        latitude: -26.828372,
        longitude: -65.222312,
        members
      };

      const updatedCrews = [...crews, newCrew];
      if (onLocalUpdate) {
        onLocalUpdate(updatedCrews, reports);
      }

      setNewCrewName('');
      setNewCrewPlate('');
      setNewCrewDriver('');
      setNewCrewCollector('');
      setShowCreateForm(false);
    }
    setIsCreatingCrew(false);
  };

  // Filtrar reportes elegibles para ser limpiados (Pendientes o En Revisión)
  const assignableReports = reports.filter(r => ['PENDIENTE', 'EN_REVISION'].includes(r.status));

  // Manejar selección de reportes para la ruta
  const toggleReportSelection = (id: string) => {
    if (selectedReportIds.includes(id)) {
      setSelectedReportIds(prev => prev.filter(rId => rId !== id));
    } else {
      setSelectedReportIds(prev => [...prev, id]);
    }
  };

  // Encontrar la ruta activa para la cuadrilla seleccionada
  const loadActiveRoute = async (crewId: string) => {
    setSelectedCrewId(crewId);
    setActiveRoute(null);
    if (!crewId) return;

    if (apiOnline) {
      try {
        const res = await fetch(`${backendUrl}/routes/crew/${crewId}/active`);
        if (res.ok) {
          const route = await res.json();
          setActiveRoute(route);
        }
      } catch (e) {
        console.error('Error al cargar ruta activa:', e);
      }
    } else {
      // Mock active route check
      const localRoute = localStorage.getItem(`route_${crewId}`);
      if (localRoute) {
        setActiveRoute(JSON.parse(localRoute));
      }
    }
  };

  // Algoritmo de optimización de rutas (TSP Greedy local para modo offline)
  const generateRouteLocal = (crewId: string, rIds: string[]) => {
    const crew = crews.find(c => c.id === crewId);
    const selectedReports = reports.filter(r => rIds.includes(r.id));

    if (!crew || selectedReports.length === 0) return;

    let currentLat = crew.latitude;
    let currentLng = crew.longitude;
    const remaining = [...selectedReports];
    const sequence: string[] = [];
    let totalDist = 0;

    const priorityFactors: Record<string, number> = {
      CRITICA: 1.0,
      ALTA: 0.7,
      MEDIA: 0.4,
      BAJA: 0.1,
    };

    while (remaining.length > 0) {
      let minCost = Infinity;
      let bestIndex = -1;
      let bestDist = 0;

      for (let i = 0; i < remaining.length; i++) {
        const rep = remaining[i];
        // Distancia euclidiana aproximada
        const dx = rep.longitude - currentLng;
        const dy = rep.latitude - currentLat;
        const distKm = Math.sqrt(dx * dx + dy * dy) * 111.32; // ~111.32 km por grado

        const factor = priorityFactors[rep.priority] || 0.1;
        const cost = distKm * (1.0 - factor * 0.4);

        if (cost < minCost) {
          minCost = cost;
          bestIndex = i;
          bestDist = distKm;
        }
      }

      if (bestIndex !== -1) {
        const next = remaining.splice(bestIndex, 1)[0];
        sequence.push(next.id);
        totalDist += bestDist;
        currentLat = next.latitude;
        currentLng = next.longitude;
      }
    }

    const travelTime = (totalDist / 30) * 60;
    const cleaningTime = rIds.length * 15;

    return {
      id: 'local_route_' + Date.now(),
      crewId,
      status: 'PENDIENTE',
      totalDistanceKm: Math.round(totalDist * 100) / 100,
      estimatedTimeMins: Math.round(travelTime + cleaningTime),
      optimizedSequence: sequence,
    };
  };

  // Disparar generación de ruta
  const handleGenerateRoute = async () => {
    if (!selectedCrewId || selectedReportIds.length === 0) return;
    setIsGenerating(true);

    if (apiOnline) {
      try {
        const res = await fetch(`${backendUrl}/routes/optimize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            crewId: selectedCrewId,
            reportIds: selectedReportIds
          })
        });

        if (res.ok) {
          const route = await res.json();
          setActiveRoute(route);
          setSelectedReportIds([]);
          onRouteGenerated();
        }
      } catch (e) {
        console.error('Error al generar ruta por API:', e);
      } finally {
        setIsGenerating(false);
      }
    } else {
      // Flujo local
      setTimeout(() => {
        const route = generateRouteLocal(selectedCrewId, selectedReportIds);
        if (route) {
          // Guardar ruta local
          localStorage.setItem(`route_${selectedCrewId}`, JSON.stringify(route));
          setActiveRoute(route);

          // Actualizar reportes locales a ASIGNADO
          const updatedReports = reports.map(r => {
            if (selectedReportIds.includes(r.id)) {
              return { ...r, status: 'ASIGNADO', crewId: selectedCrewId };
            }
            return r;
          });

          // Poner cuadrilla en estado EN_RUTA
          const updatedCrews = crews.map(c => {
            if (c.id === selectedCrewId) {
              return { ...c, status: 'EN_RUTA' };
            }
            return c;
          });

          setSelectedReportIds([]);
          if (onLocalUpdate) {
            onLocalUpdate(updatedCrews, updatedReports);
          }
        }
        setIsGenerating(false);
      }, 1000);
    }
  };

  // Completar Ruta
  const handleCompleteRoute = async (routeId: string) => {
    if (apiOnline) {
      try {
        const res = await fetch(`${backendUrl}/routes/${routeId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'COMPLETADA' })
        });
        if (res.ok) {
          setActiveRoute(null);
          onRouteGenerated();
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      // Flujo local
      localStorage.removeItem(`route_${selectedCrewId}`);
      
      const routeSeq = activeRoute.optimizedSequence;
      
      // Actualizar reportes locales a RESUELTO
      const updatedReports = reports.map(r => {
        if (routeSeq.includes(r.id)) {
          return { ...r, status: 'RESUELTO', resolvedAt: new Date().toISOString() };
        }
        return r;
      });

      // Devolver cuadrilla a ACTIVA
      const updatedCrews = crews.map(c => {
        if (c.id === selectedCrewId) {
          return { ...c, status: 'ACTIVA' };
        }
        return c;
      });

      setActiveRoute(null);
      if (onLocalUpdate) {
        onLocalUpdate(updatedCrews, updatedReports);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Panel de Cuadrillas */}
      <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Cuadrillas Activas
          </h3>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-xs font-semibold transition-all border border-primary/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Crear
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateCrew} className="p-4 rounded-xl bg-black/20 border border-white/5 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Nueva Cuadrilla</span>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400">Nombre de Cuadrilla *</label>
              <input 
                type="text" 
                placeholder="Ej: Cuadrilla Centro - Camión 03"
                value={newCrewName}
                onChange={e => setNewCrewName(e.target.value)}
                className="bg-cardLight border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400">Patente del Vehículo *</label>
              <input 
                type="text" 
                placeholder="Ej: AD-456-OP"
                value={newCrewPlate}
                onChange={e => setNewCrewPlate(e.target.value)}
                className="bg-cardLight border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400">Nombre del Chofer (Opcional)</label>
              <input 
                type="text" 
                placeholder="Nombre completo"
                value={newCrewDriver}
                onChange={e => setNewCrewDriver(e.target.value)}
                className="bg-cardLight border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400">Nombre del Recolector (Opcional)</label>
              <input 
                type="text" 
                placeholder="Nombre completo"
                value={newCrewCollector}
                onChange={e => setNewCrewCollector(e.target.value)}
                className="bg-cardLight border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex gap-2 mt-1">
              <button 
                type="submit"
                disabled={isCreatingCrew}
                className="flex-1 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-primary/10"
              >
                {isCreatingCrew ? 'Creando...' : 'Confirmar'}
              </button>
              <button 
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-2 bg-cardLight hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg text-xs font-semibold border border-white/5"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="flex flex-col gap-3 mt-2">
          {crews.map(crew => (
            <div 
              key={crew.id}
              onClick={() => loadActiveRoute(crew.id)}
              className={`p-4 rounded-xl cursor-pointer border transition-all ${
                selectedCrewId === crew.id 
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-cardLight/50 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-white">{crew.name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  crew.status === 'EN_RUTA' ? 'bg-purple-500/20 text-purple-400' :
                  crew.status === 'ACTIVA' ? 'bg-primary/20 text-primary' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {crew.status}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">Patente: {crew.vehiclePlate}</div>
              
              <div className="text-xs text-gray-300 mt-3 flex flex-wrap gap-1">
                {crew.members.map((m: any, idx: number) => (
                  <span key={idx} className="bg-card px-2 py-1 rounded border border-white/5 text-[10px]">
                    {m.fullName} ({m.role === 'CHOFER' ? 'Ch' : 'Rec'})
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Asignación y Generación de Rutas */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {selectedCrewId ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Lista de Incidencias Pendientes */}
            <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckSquare className="h-4.5 w-4.5 text-primary" />
                  Puntos de Limpieza
                </h4>
                <p className="text-xs text-gray-400 mt-1">Selecciona los reportes que deseas limpiar en este recorrido.</p>
              </div>

              {activeRoute ? (
                <div className="bg-purple-500/5 border border-purple-500/10 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-2 h-48">
                  <Route className="h-8 w-8 text-purple-400" />
                  <span className="font-bold text-white text-sm">Cuadrilla en Ruta Activa</span>
                  <span className="text-xs text-gray-400 max-w-[200px]">Debes completar o cancelar la ruta en curso antes de asignar una nueva tarea.</span>
                </div>
              ) : assignableReports.length === 0 ? (
                <div className="text-center text-xs text-gray-400 p-8 border border-dashed border-white/5 rounded-xl">
                  No hay incidencias pendientes para limpiar.
                </div>
              ) : (
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[350px] pr-1">
                  {assignableReports.map(rep => (
                    <div 
                      key={rep.id}
                      onClick={() => toggleReportSelection(rep.id)}
                      className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-all ${
                        selectedReportIds.includes(rep.id)
                          ? 'bg-primary/5 border-primary'
                          : 'bg-cardLight/30 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className={`h-4 w-4 rounded flex items-center justify-center border transition-all ${
                        selectedReportIds.includes(rep.id)
                          ? 'bg-primary border-primary text-white'
                          : 'border-white/20'
                      }`}>
                        {selectedReportIds.includes(rep.id) && <Check className="h-3 w-3" />}
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-white">{rep.category}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            rep.priority === 'CRITICA' ? 'bg-red-500/10 text-red-500' :
                            rep.priority === 'ALTA' ? 'bg-orange-500/10 text-orange-500' :
                            'bg-amber-500/10 text-amber-500'
                          }`}>
                            {rep.priority}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 line-clamp-1 mt-1">{rep.description || 'Sin descripción.'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!activeRoute && assignableReports.length > 0 && (
                <button 
                  disabled={selectedReportIds.length === 0 || isGenerating}
                  onClick={handleGenerateRoute}
                  className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
                    selectedReportIds.length === 0 
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary-dark text-white shadow-primary/20'
                  }`}
                >
                  <Route className="h-4.5 w-4.5" />
                  {isGenerating ? 'Calculando Ruta...' : `Generar Ruta con (${selectedReportIds.length}) Reportes`}
                </button>
              )}
            </div>

            {/* Visualización de la Ruta Activa */}
            <div className="glass-card p-6 rounded-2xl flex flex-col gap-5">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Navigation className="h-4.5 w-4.5 text-accent-purple" />
                Ruta Sugerida
              </h4>

              {activeRoute ? (
                <div className="flex flex-col gap-4 flex-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-cardLight p-3 rounded-xl border border-white/5">
                      <div className="text-[10px] text-gray-400">Kilometraje Total</div>
                      <div className="text-lg font-bold text-white mt-1 flex items-baseline gap-1">
                        {activeRoute.totalDistanceKm} <span className="text-xs text-gray-400">km</span>
                      </div>
                    </div>
                    <div className="bg-cardLight p-3 rounded-xl border border-white/5">
                      <div className="text-[10px] text-gray-400">Tiempo Estimado</div>
                      <div className="text-lg font-bold text-white mt-1 flex items-baseline gap-1">
                        {activeRoute.estimatedTimeMins} <span className="text-xs text-gray-400">min</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="text-xs font-bold text-gray-300 mb-2">Secuencia de Recolección (TSP):</div>
                    <div className="flex flex-col gap-2 overflow-y-auto max-h-[160px] pr-1">
                      {activeRoute.optimizedSequence.map((repId: string, index: number) => {
                        const repInfo = reports.find(r => r.id === repId);
                        return (
                          <div key={repId} className="flex items-center gap-3 bg-cardLight/30 p-2.5 rounded-lg border border-white/5">
                            <span className="h-5 w-5 bg-accent-purple text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <div className="text-xs font-semibold text-white">{repInfo?.category || 'Cargando...'}</div>
                              <div className="text-[9px] text-gray-400 truncate max-w-[150px]">{repInfo?.description || 'Sin descripción.'}</div>
                            </div>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                              repInfo?.priority === 'CRITICA' ? 'bg-red-500/15 text-red-400' :
                              repInfo?.priority === 'ALTA' ? 'bg-orange-500/15 text-orange-400' :
                              'bg-amber-500/15 text-amber-400'
                            }`}>
                              {repInfo?.priority}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button 
                    onClick={() => handleCompleteRoute(activeRoute.id)}
                    className="w-full bg-accent-purple hover:bg-purple-600 text-white font-bold py-2.5 rounded-xl transition-all shadow-md shadow-purple/20 flex items-center justify-center gap-2 mt-auto"
                  >
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    Finalizar Recolección
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/5 rounded-xl gap-2 h-64 text-gray-500">
                  <Route className="h-10 w-10 text-gray-600" />
                  <div>
                    <h5 className="font-semibold text-gray-400 text-sm">Sin Ruta Generada</h5>
                    <p className="text-[10px] text-gray-500 max-w-[180px] mx-auto mt-1">Selecciona reportes pendientes a la izquierda y presiona "Generar Ruta".</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="glass-card p-12 rounded-2xl flex flex-col items-center justify-center text-center gap-4 h-[350px] border border-dashed border-white/10 text-gray-500">
            <Users className="h-12 w-12 text-gray-600" />
            <div>
              <h4 className="font-bold text-white text-base">Planificación de Recorrido</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-[280px]">Selecciona una cuadrilla del panel izquierdo para comenzar a gestionar sus tareas y optimizar su ruta de recolección.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
