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

  // Filtrado de reportes
  const filtered = reports.filter(r => {
    const matchCat = filterCategory === 'ALL' || r.category === filterCategory;
    
    let matchStatus = true;
    if (filterStatus === 'ALL') {
      matchStatus = true;
    } else if (filterStatus === 'OPEN') {
      matchStatus = ['PENDIENTE', 'EN_REVISION', 'ASIGNADO', 'EN_PROCESO'].includes(r.status);
    } else if (filterStatus === 'CLOSED') {
      matchStatus = ['RESUELTO', 'RECHAZADO'].includes(r.status);
    } else if (filterStatus === 'URGENT') {
      matchStatus = ['CRITICA', 'ALTA'].includes(r.priority);
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

  const exportToCSV = () => {
    if (filtered.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const headers = ["ID", "Categoria", "Descripcion", "Latitud", "Longitud", "Prioridad", "Score Prioridad", "Estado", "Cuadrilla Asignada", "Fecha de Creacion"];
    
    const rows = filtered.map(r => [
      r.id,
      r.category,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      r.latitude,
      r.longitude,
      r.priority,
      r.priorityScore || 0,
      r.status,
      r.crewId || "Ninguna",
      r.createdAt ? new Date(r.createdAt).toISOString() : ""
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reportes_EcoTuc_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-card p-6 rounded-2xl flex flex-col gap-6">
      {/* Cabecera y Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Historial de Incidencias
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Listado y auditoría completa de los reportes urbanos</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <button
            type="button"
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-xs font-semibold transition-all border border-primary/20"
          >
            <FileText className="h-3.5 w-3.5" />
            Exportar CSV
          </button>

          <div className="flex items-center gap-1.5 bg-cardLight/50 px-3 py-1.5 rounded-lg border border-white/5">
            <ListFilter className="h-3.5 w-3.5 text-gray-400" />
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-transparent text-xs text-gray-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todas las Categorías</option>
              <option value="BASURAL">Basural</option>
              <option value="ALCANTARILLA">Alcantarilla Tapada</option>
              <option value="ESCOMBROS">Escombros</option>
              <option value="PELIGROSO">Residuos Peligrosos</option>
              <option value="OTROS">Otros</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-cardLight/50 px-3 py-1.5 rounded-lg border border-white/5">
            <ListFilter className="h-3.5 w-3.5 text-gray-400" />
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-xs text-gray-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="OPEN">Abiertos (Pendientes / En Proceso)</option>
              <option value="CLOSED">Resueltos / Cerrados</option>
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
            <tr className="bg-cardLight text-gray-400 font-semibold uppercase tracking-wider border-b border-white/5">
              <th className="py-3.5 px-4">Foto</th>
              <th className="py-3.5 px-4">Incidencia</th>
              <th className="py-3.5 px-4">Ubicación</th>
              <th className="py-3.5 px-4">Prioridad</th>
              <th className="py-3.5 px-4">Estado</th>
              <th className="py-3.5 px-4">Cuadrilla Asignada</th>
              <th className="py-3.5 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((report) => (
              <tr key={report.id} className="hover:bg-cardLight/20 transition-all">
                <td className="py-3 px-4">
                  <div className="h-10 w-10 rounded-lg overflow-hidden bg-black/40 border border-white/5">
                    <img 
                      src={getImageUrl(report.imageUrl)} 
                      alt="" 
                      className="object-cover h-full w-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop';
                      }}
                    />
                  </div>
                </td>
                <td className="py-3 px-4 max-w-[200px]">
                  <div className="font-bold text-white uppercase">{report.category}</div>
                  <div className="text-[10px] text-gray-400 truncate mt-0.5">{report.description || 'Sin descripción'}</div>
                  <div className="text-[9px] text-gray-500 mt-1">Registrado: {new Date(report.createdAt).toLocaleDateString()}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1 text-gray-300">
                    <MapPin className="h-3.5 w-3.5 text-gray-500" />
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
                    : 'Sin asignar'}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {report.status === 'PENDIENTE' && (
                      <>
                        <button 
                          onClick={() => quickStatusChange(report, 'RESUELTO')}
                          title="Marcar como Resuelto"
                          className="p-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg transition-all"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => quickStatusChange(report, 'RECHAZADO')}
                          title="Rechazar Reporte"
                          className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => openEditModal(report)}
                      title="Editar Detalle / Asignar"
                      className="p-1.5 bg-cardLight hover:bg-gray-700 text-gray-300 rounded-lg transition-all border border-white/5"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(report)}
                      title="Eliminar Reporte"
                      className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all border border-red-500/20"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center text-gray-500 py-12 bg-card/20 border-t border-white/5">
            No se encontraron incidencias con los filtros aplicados.
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
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-4">
              <div className="h-16 w-16 rounded-lg overflow-hidden bg-black/40 border border-white/5 flex-shrink-0">
                <img 
                  src={getImageUrl(activeReport.imageUrl)} 
                  alt="" 
                  className="object-cover h-full w-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop';
                  }}
                />
              </div>
              <div>
                <h5 className="font-bold text-white uppercase text-sm">{activeReport.category}</h5>
                <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{activeReport.description || 'Sin descripción'}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-semibold">Cambiar Estado:</label>
              <select 
                value={activeReport.status}
                onChange={(e) => setActiveReport({ ...activeReport, status: e.target.value })}
                className="bg-cardLight text-xs text-white py-2.5 px-3 rounded-xl border border-white/5 focus:outline-none focus:border-primary"
              >
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="EN_REVISION">EN REVISION</option>
                <option value="ASIGNADO">ASIGNADO</option>
                <option value="EN_PROCESO">EN PROCESO</option>
                <option value="RESUELTO">RESUELTO</option>
                <option value="RECHAZADO">RECHAZADO</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-semibold">Asignar Cuadrilla:</label>
              <select 
                value={selectedCrew}
                onChange={(e) => setSelectedCrew(e.target.value)}
                className="bg-cardLight text-xs text-white py-2.5 px-3 rounded-xl border border-white/5 focus:outline-none focus:border-primary"
              >
                <option value="">Sin Asignar</option>
                {crews.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.vehiclePlate})</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-semibold">Observaciones / Instrucciones de Limpieza:</label>
              <textarea 
                value={obsText}
                onChange={(e) => setObsText(e.target.value)}
                rows={3}
                placeholder="Ingresa detalles sobre residuos peligrosos, accesibilidad del camión, etc."
                className="bg-cardLight text-xs text-white p-3 rounded-xl border border-white/5 focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button 
                onClick={() => setActiveReport(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-cardLight border border-white/5 transition-all text-gray-300"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdateReport}
                className="px-5 py-2 bg-primary hover:bg-primary-dark rounded-xl text-xs font-semibold text-white transition-all shadow-md shadow-primary/20"
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
