"use client";

import React, { useState } from 'react';
import { 
  Eye, Check, X, AlertCircle, Edit, Trash, FileText, 
  MapPin, CheckCircle, HelpCircle, ListFilter 
} from 'lucide-react';

interface ReportsTableProps {
  reports: any[];
  crews: any[];
  backendUrl: string;
  onReportUpdated: () => void;
  apiOnline: boolean;
  onLocalUpdate?: (reports: any[]) => void;
  statusFilter?: string;
  setStatusFilter?: (status: string) => void;
}

export default function ReportsTable({ 
  reports, crews, backendUrl, onReportUpdated, apiOnline, onLocalUpdate,
  statusFilter, setStatusFilter
}: ReportsTableProps) {
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [localFilterStatus, setLocalFilterStatus] = useState<string>('ALL');
  const [activeReport, setActiveReport] = useState<any>(null);
  const [obsText, setObsText] = useState<string>('');
  const [selectedCrew, setSelectedCrew] = useState<string>('');

  const filterStatus = statusFilter !== undefined ? statusFilter : localFilterStatus;
  const setFilterStatus = setStatusFilter !== undefined ? setStatusFilter : setLocalFilterStatus;

  const getImageUrl = (url: string) => {
    if (!url) return 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop';
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const cleanBackendUrl = backendUrl.replace('/api', '');
    return `${cleanBackendUrl}${url}`;
  };

  // Filtrado coherente de reportes con la misma lógica global
  const filtered = reports.filter(r => {
    const matchCat = filterCategory === 'ALL' || r.category === filterCategory;
    
    let matchStatus = true;
    if (filterStatus === 'ALL') {
      matchStatus = true;
    } else if (filterStatus === 'OPEN') {
      matchStatus = ['PENDIENTE', 'EN_REVISION', 'ASIGNADO', 'EN_PROCESO'].includes(r.status);
    } else if (filterStatus === 'CLOSED') {
      matchStatus = ['RESUELTO', 'RECHAZADO', 'CERRADO'].includes(r.status);
    } else if (filterStatus === 'URGENT') {
      matchStatus = ['CRITICA', 'ALTA'].includes(r.priority) && !['RESUELTO', 'RECHAZADO', 'CERRADO'].includes(r.status);
    } else {
      matchStatus = r.status === filterStatus;
    }
    
    return matchCat && matchStatus;
  });

  const openEditModal = (report: any) => {
    setActiveReport(report);
    setObsText(report.observations || '');
    setSelectedCrew(report.crewId || '');
  };

  const handleUpdateReport = async () => {
    if (!activeReport) return;

    const newStatus = selectedCrew ? 'ASIGNADO' : activeReport.status;

    if (apiOnline) {
      try {
        const res = await fetch(`${backendUrl}/reports/${activeReport.id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: newStatus,
            observations: obsText,
            crewId: selectedCrew || null
          })
        });

        if (res.ok) {
          onReportUpdated();
          setActiveReport(null);
        }
      } catch (e) {
        console.error('Error al actualizar reporte:', e);
      }
    } else {
      // Flujo local
      const updatedReports = reports.map(r => {
        if (r.id === activeReport.id) {
          return {
            ...r,
            status: newStatus,
            observations: obsText,
            crewId: selectedCrew || null,
            resolvedAt: newStatus === 'RESUELTO' ? new Date().toISOString() : r.resolvedAt
          };
        }
        return r;
      });

      if (onLocalUpdate) {
        onLocalUpdate(updatedReports);
      }
      setActiveReport(null);
    }
  };

  const quickStatusChange = async (report: any, newStatus: string) => {
    if (apiOnline) {
      try {
        await fetch(`${backendUrl}/reports/${report.id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: newStatus,
            resolvedAt: newStatus === 'RESUELTO' ? new Date() : null
          })
        });
        onReportUpdated();
      } catch (e) {
        console.error(e);
      }
    } else {
      const updatedReports = reports.map(r => {
        if (r.id === report.id) {
          return {
            ...r,
            status: newStatus,
            resolvedAt: newStatus === 'RESUELTO' ? new Date().toISOString() : null
          };
        }
        return r;
      });
      if (onLocalUpdate) {
        onLocalUpdate(updatedReports);
      }
    }
  };

  const handleDeleteClick = async (report: any) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este reporte?')) return;

    if (apiOnline) {
      try {
        const res = await fetch(`${backendUrl}/reports/${report.id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          onReportUpdated();
        }
      } catch (e) {
        console.error('Error al eliminar reporte:', e);
      }
    } else {
      const updatedReports = reports.filter(r => r.id !== report.id);
      if (onLocalUpdate) {
        onLocalUpdate(updatedReports);
      }
    }
  };

  return (
    <div className="glass-card p-6 rounded-2xl flex flex-col gap-6">
      {/* Cabecera con Filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Bandeja de Incidencias Urbanas
          </h3>
          <p className="text-xs text-gray-300 mt-1">
            Gestión operativa de microbasurales, alcantarillas y escombros de Tucumán.
          </p>
        </div>

        {/* Filtros de la tabla */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-cardLight/50 px-3 py-1.5 rounded-lg border border-white/5">
            <label htmlFor="table-filter-cat" className="sr-only">Filtrar por categoría</label>
            <select 
              id="table-filter-cat"
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-transparent text-xs text-gray-200 focus:outline-none cursor-pointer focus-visible:ring-1 focus-visible:ring-primary rounded"
            >
              <option value="ALL">Todas las Categorías</option>
              <option value="BASURAL">Basural Masivo</option>
              <option value="ALCANTARILLA">Alcantarilla Tapada</option>
              <option value="ESCOMBROS">Escombros</option>
              <option value="PELIGROSO">Residuos Peligrosos</option>
              <option value="OTROS">Otros</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-cardLight/50 px-3 py-1.5 rounded-lg border border-white/5">
            <ListFilter className="h-3.5 w-3.5 text-gray-400" />
            <label htmlFor="table-filter-stat" className="sr-only">Filtrar por estado</label>
            <select 
              id="table-filter-stat"
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-xs text-gray-200 focus:outline-none cursor-pointer focus-visible:ring-1 focus-visible:ring-primary rounded"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="OPEN">Abiertos (Pendientes / Asignados / Proceso)</option>
              <option value="CLOSED">Cerrados (Resueltos / Rechazados)</option>
              <option value="URGENT">Urgentes (Prioridad Alta / Crítica)</option>
              <option value="PENDIENTE">Solo Pendientes</option>
              <option value="ASIGNADO">Solo Asignados</option>
              <option value="EN_PROCESO">Solo En Proceso</option>
              <option value="RESUELTO">Solo Resueltos</option>
              <option value="RECHAZADO">Solo Rechazados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla Desplazable */}
      <div className="overflow-x-auto rounded-xl border border-white/5">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-cardLight text-gray-300 font-semibold uppercase tracking-wider border-b border-white/5">
              <th scope="col" className="py-3.5 px-4">Foto</th>
              <th scope="col" className="py-3.5 px-4">Incidencia</th>
              <th scope="col" className="py-3.5 px-4">Ubicación</th>
              <th scope="col" className="py-3.5 px-4">Prioridad</th>
              <th scope="col" className="py-3.5 px-4">Estado</th>
              <th scope="col" className="py-3.5 px-4">Cuadrilla Asignada</th>
              <th scope="col" className="py-3.5 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((report) => {
              const isDemo = report.isDemo || report.id.startsWith('demo_rep_') || report.description?.startsWith('[DEMO]');

              return (
                <tr key={report.id} className="hover:bg-cardLight/20 transition-all">
                  <td className="py-3 px-4">
                    <div className="h-10 w-10 rounded-lg overflow-hidden bg-black/40 border border-white/5">
                      <img 
                        src={getImageUrl(report.imageUrl)} 
                        alt={report.category} 
                        className="object-cover h-full w-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop';
                        }}
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4 max-w-[220px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white uppercase">{report.category}</span>
                      {isDemo && (
                        <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          DEMO
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-300 truncate mt-0.5">{report.description || 'Sin descripción'}</div>
                    <div className="text-[9px] text-gray-400 mt-1">Registrado: {new Date(report.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-gray-300">
                      <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <span>{report.latitude?.toFixed(5) || 0}, {report.longitude?.toFixed(5) || 0}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      report.priority === 'CRITICA' ? 'bg-red-500/20 text-red-400' :
                      report.priority === 'ALTA' ? 'bg-orange-500/20 text-orange-400' :
                      report.priority === 'MEDIA' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-primary/20 text-primary'
                    }`}>
                      {report.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                      report.status === 'RESUELTO' ? 'bg-primary/10 text-primary border border-primary/20' :
                      report.status === 'RECHAZADO' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      report.status === 'ASIGNADO' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    {report.crewId 
                      ? crews.find(c => c.id === report.crewId)?.name || 'Cuadrilla Asignada' 
                      : <span className="text-gray-400 italic">Sin asignar</span>}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {report.status === 'PENDIENTE' && (
                        <>
                          <button 
                            onClick={() => quickStatusChange(report, 'RESUELTO')}
                            title="Marcar como Resuelto"
                            aria-label="Marcar reporte como resuelto"
                            className="p-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => quickStatusChange(report, 'RECHAZADO')}
                            title="Rechazar Reporte"
                            aria-label="Rechazar reporte"
                            className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => openEditModal(report)}
                        title="Editar Detalle / Asignar"
                        aria-label="Editar reporte o asignar cuadrilla"
                        className="p-1.5 bg-cardLight hover:bg-gray-700 text-gray-300 rounded-lg transition-all border border-white/5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(report)}
                        title="Eliminar Reporte"
                        aria-label="Eliminar reporte"
                        className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all border border-red-500/20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Estado vacío cuando no hay coincidencias con filtros */}
        {filtered.length === 0 && (
          <div className="text-center text-gray-300 py-16 bg-card/20 border-t border-white/5 flex flex-col items-center gap-3">
            <div className="p-3 bg-cardLight rounded-xl text-gray-400">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">No se encontraron reportes</p>
              <p className="text-xs text-gray-400 mt-1">
                {filterCategory !== 'ALL' || filterStatus !== 'ALL' 
                  ? 'Prueba modificando los filtros de categoría o estado.' 
                  : 'No hay incidencias registradas en este momento.'}
              </p>
            </div>
            {(filterCategory !== 'ALL' || filterStatus !== 'ALL') && (
              <button
                onClick={() => { setFilterCategory('ALL'); setFilterStatus('ALL'); }}
                className="text-xs text-primary font-bold hover:underline mt-1 focus-visible:ring-2 focus-visible:ring-primary rounded p-1"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de Edición de Incidencia */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-white/10 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center">
              <h4 className="text-base font-bold text-white">Editar Incidencia</h4>
              <button 
                onClick={() => setActiveReport(null)}
                aria-label="Cerrar ventana de edición"
                className="text-gray-400 hover:text-white text-xs p-1 rounded focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-gray-400 block font-semibold mb-1">Categoría</label>
                <input 
                  type="text" 
                  disabled 
                  value={activeReport.category} 
                  className="w-full bg-cardLight/50 text-gray-300 p-2.5 rounded-lg border border-white/5 cursor-not-allowed" 
                />
              </div>

              <div>
                <label className="text-gray-400 block font-semibold mb-1">Asignar a Cuadrilla</label>
                <select 
                  value={selectedCrew} 
                  onChange={(e) => setSelectedCrew(e.target.value)}
                  className="w-full bg-cardLight text-white p-2.5 rounded-lg border border-white/5 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
                >
                  <option value="">Sin Cuadrilla Asignada</option>
                  {crews.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.vehiclePlate})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 block font-semibold mb-1">Observaciones Operativas</label>
                <textarea 
                  value={obsText}
                  onChange={(e) => setObsText(e.target.value)}
                  placeholder="Detalles sobre recolección, maquinaria necesaria, etc."
                  rows={3}
                  className="w-full bg-cardLight text-white p-2.5 rounded-lg border border-white/5 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <button 
                onClick={() => setActiveReport(null)}
                className="px-4 py-2 rounded-xl text-xs text-gray-300 hover:text-white bg-cardLight hover:bg-gray-800 transition-all border border-white/5"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdateReport}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-dark transition-all shadow-md shadow-primary/20"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
