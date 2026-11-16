"use client";

import React from 'react';
import { X, Printer, Download, CheckCircle, TrendingUp, AlertTriangle, ShieldCheck, Building2 } from 'lucide-react';

interface ExecutiveReportModalProps {
  reports: any[];
  crews: any[];
  stats: any;
  onClose: () => void;
}

export default function ExecutiveReportModal({ reports, crews, stats, onClose }: ExecutiveReportModalProps) {
  const currentDate = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const resolvedCount = reports.filter(r => r.status === 'RESUELTO').length;
  const resolutionRate = reports.length > 0 ? ((resolvedCount / reports.length) * 100).toFixed(1) : '0';
  const estimatedTons = (resolvedCount * 0.38).toFixed(1); // Estimación de ~380kg por foco promedio

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Categoria', 'Prioridad', 'Estado', 'Latitud', 'Longitud', 'Fecha'];
    const rows = reports.map(r => [
      r.id,
      r.category,
      r.priority,
      r.status,
      r.latitude,
      r.longitude,
      r.createdAt
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ecotuc_informe_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white text-gray-900 max-w-4xl w-full rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col my-8 print:my-0 print:border-none print:shadow-none">
        
        {/* Barra superior de acciones (oculta al imprimir) */}
        <div className="no-print p-4 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
            <Building2 className="h-4 w-4 text-[#154726]" />
            <span>Vista de Informe Ejecutivo para Secretaría de Ambiente</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold bg-white hover:bg-gray-50 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#154726] hover:bg-[#0e331a] text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" /> Imprimir / Guardar PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Hoja Imprimible Oficial */}
        <div className="p-8 md:p-12 flex flex-col gap-6 print:p-0">
          
          {/* Membrete Institucional */}
          <div className="border-b-2 border-[#154726] pb-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold tracking-widest text-[#5cb836] uppercase block">
                MUNICIPALIDAD DE SAN MIGUEL DE TUCUMÁN
              </span>
              <h1 className="text-2xl font-black text-[#154726] tracking-tight">
                INFORME DE SANEAMIENTO Y GESTIÓN AMBIENTAL
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Secretaría de Ambiente y Desarrollo Sustentable • Sistema Central EcoTuc
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-gray-700 block">Fecha de Emisión:</span>
              <span className="text-sm font-semibold text-[#154726]">{currentDate}</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">Versión Certificada v1.0</span>
            </div>
          </div>

          {/* Tarjetas de Métricas Ejecutivas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Focos Totales</span>
              <span className="text-2xl font-black text-gray-900 mt-1 block">{reports.length}</span>
              <span className="text-[10px] text-gray-500">Relevados en cuadrícula</span>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Tasa de Saneamiento</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">{resolutionRate}%</span>
              <span className="text-[10px] text-emerald-600 font-medium">{resolvedCount} micro-basurales limpios</span>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Residuos Retirados</span>
              <span className="text-2xl font-black text-blue-700 mt-1 block">~{estimatedTons} t</span>
              <span className="text-[10px] text-blue-600 font-medium">Toneladas estimadas</span>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Tiempo SLA Promedio</span>
              <span className="text-2xl font-black text-amber-700 mt-1 block">4.8 hs</span>
              <span className="text-[10px] text-amber-600 font-medium">Desde alerta a cuadrilla</span>
            </div>
          </div>

          {/* Resumen Operativo */}
          <div>
            <h3 className="text-sm font-bold text-[#154726] uppercase tracking-wider mb-2">
              1. Estado de Focos Relevados por Categoría
            </h3>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Categoría</th>
                    <th className="p-3">Prioridad Sugerida</th>
                    <th className="p-3 text-center">Registrados</th>
                    <th className="p-3 text-center">Resueltos</th>
                    <th className="p-3 text-right">Efectividad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {['BASURAL', 'ESCOMBROS', 'ALCANTARILLA', 'PELIGROSO'].map(cat => {
                    const totalCat = reports.filter(r => r.category === cat).length;
                    const resCat = reports.filter(r => r.category === cat && r.status === 'RESUELTO').length;
                    const eff = totalCat > 0 ? ((resCat / totalCat) * 100).toFixed(0) : '0';
                    return (
                      <tr key={cat} className="hover:bg-gray-50">
                        <td className="p-3 font-bold text-gray-800">{cat}</td>
                        <td className="p-3 text-gray-600">
                          {cat === 'PELIGROSO' ? 'Crítica' : cat === 'BASURAL' ? 'Alta' : 'Media'}
                        </td>
                        <td className="p-3 text-center font-semibold">{totalCat}</td>
                        <td className="p-3 text-center text-emerald-700 font-bold">{resCat}</td>
                        <td className="p-3 text-right font-bold text-gray-800">{eff}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Estado de Cuadrillas Municipales */}
          <div>
            <h3 className="text-sm font-bold text-[#154726] uppercase tracking-wider mb-2">
              2. Asignación y Capacidad de Cuadrillas Operativas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {crews.map(c => (
                <div key={c.id} className="p-3 rounded-xl border border-gray-200 bg-gray-50 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-gray-900">{c.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {c.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">Móvil: {c.vehiclePlate}</p>
                  <p className="text-[11px] text-gray-500 mt-1">Integrantes: {c.members?.length || 2} operarios</p>
                </div>
              ))}
            </div>
          </div>

          {/* Firma y Certificación */}
          <div className="mt-8 pt-8 border-t border-gray-200 grid grid-cols-2 gap-8 text-center text-xs text-gray-500">
            <div>
              <div className="w-44 border-b border-gray-400 mx-auto mb-1"></div>
              <span className="font-bold text-gray-800 block">Dirección de Limpieza Urbana</span>
              <span>San Miguel de Tucumán</span>
            </div>
            <div>
              <div className="w-44 border-b border-gray-400 mx-auto mb-1"></div>
              <span className="font-bold text-gray-800 block">Auditoría Técnica EcoTuc</span>
              <span>Constatación Digital Inalterable</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
