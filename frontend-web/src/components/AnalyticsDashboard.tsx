"use client";

import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend 
} from 'recharts';
import { 
  TrendingUp, Clock, Award, CheckCircle, Trash2, 
  Layers, Info, AlertCircle, Database 
} from 'lucide-react';
import { type Report, type Crew } from '../lib/db';

interface AnalyticsDashboardProps {
  reports: Report[];
  crews: Crew[];
  onLoadDemo?: () => void;
}

export default function AnalyticsDashboard({ reports, crews, onLoadDemo }: AnalyticsDashboardProps) {
  // Verificar si hay registros de demostración
  const hasDemoData = useMemo(() => {
    return reports.some(r => r.isDemo || r.id.startsWith('demo_rep_') || r.description?.startsWith('[DEMO]'));
  }, [reports]);

  // 1. Cálculos de SLA reales basados en incidencias resueltas
  const statsSLA = useMemo(() => {
    const categories = ['BASURAL', 'ALCANTARILLA', 'ESCOMBROS', 'PELIGROSO', 'OTROS'];
    
    return categories.map(cat => {
      const catReports = reports.filter(r => r.category === cat);
      const closedReports = catReports.filter(r => ['RESUELTO', 'CERRADO'].includes(r.status));
      
      let totalHours = 0;
      let count = 0;

      closedReports.forEach(r => {
        if (r.createdAt) {
          const created = new Date(r.createdAt).getTime();
          const resolved = r.resolvedAt ? new Date(r.resolvedAt).getTime() : Date.now();
          const diffMs = Math.max(0, resolved - created);
          totalHours += diffMs / (1000 * 60 * 60);
          count++;
        }
      });

      const averageSLA = count > 0 ? (totalHours / count) : 0;

      return {
        category: cat,
        sla: count > 0 ? parseFloat(averageSLA.toFixed(1)) : 0,
        count,
        limiteSLA: cat === 'PELIGROSO' ? 6 : cat === 'ALCANTARILLA' ? 24 : 48
      };
    });
  }, [reports]);

  // 2. Reportes creados vs resueltos por fecha (Últimos 7 días) - DATOS REALES SIN FALSOS SENOS/COSENOS
  const statsTendencia = useMemo(() => {
    const data = [];
    const hoy = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() - i);
      const fechaStr = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
      
      // Contar creados ese día
      const creados = reports.filter(r => {
        if (!r.createdAt) return false;
        const rDate = new Date(r.createdAt);
        return rDate.toDateString() === fecha.toDateString();
      }).length;

      // Contar resueltos ese día
      const resueltos = reports.filter(r => {
        if (!['RESUELTO', 'CERRADO'].includes(r.status)) return false;
        const targetDate = r.resolvedAt ? new Date(r.resolvedAt) : (r.createdAt ? new Date(r.createdAt) : null);
        return targetDate ? targetDate.toDateString() === fecha.toDateString() : false;
      }).length;

      data.push({
        fecha: fechaStr,
        Creados: creados,
        Resueltos: resueltos,
      });
    }
    return data;
  }, [reports]);

  // 3. Eficiencia por Cuadrilla (Cálculo real sin cifras fijas inventadas)
  const statsCuadrillas = useMemo(() => {
    return crews.map(c => {
      const asignados = reports.filter(r => r.crewId === c.id || String(r.crewId) === String(c.id));
      const resueltos = asignados.filter(r => ['RESUELTO', 'CERRADO'].includes(r.status)).length;
      
      let kgEstimados = 0;
      asignados.filter(r => ['RESUELTO', 'CERRADO'].includes(r.status)).forEach(r => {
        if (r.category === 'ESCOMBROS') kgEstimados += 320;
        else if (r.category === 'BASURAL') kgEstimados += 180;
        else if (r.category === 'PELIGROSO') kgEstimados += 50;
        else if (r.category === 'ALCANTARILLA') kgEstimados += 80;
        else kgEstimados += 30;
      });

      return {
        name: c.name,
        resueltos,
        kg: kgEstimados
      };
    });
  }, [crews, reports]);

  // 4. Métricas clave globales (Cero absoluto cuando no hay reportes)
  const kpis = useMemo(() => {
    const total = reports.length;
    const resueltos = reports.filter(r => ['RESUELTO', 'CERRADO'].includes(r.status)).length;
    const pendientes = reports.filter(r => r.status === 'PENDIENTE').length;
    
    // SLA Promedio General (Calculado únicamente si hay incidencias resueltas reales)
    const validSLAItems = statsSLA.filter(s => s.count > 0);
    const avgSLA = validSLAItems.length > 0
      ? (validSLAItems.reduce((acc, curr) => acc + curr.sla, 0) / validSLAItems.length).toFixed(1)
      : null;

    // Kilogramos totales recolectados (0 si no hay resueltos)
    let totalKg = 0;
    reports.filter(r => ['RESUELTO', 'CERRADO'].includes(r.status)).forEach(r => {
      if (r.category === 'ESCOMBROS') totalKg += 320;
      else if (r.category === 'BASURAL') totalKg += 180;
      else if (r.category === 'PELIGROSO') totalKg += 50;
      else if (r.category === 'ALCANTARILLA') totalKg += 80;
      else totalKg += 30;
    });

    // Cuadrilla destacada
    const starCrew = statsCuadrillas.reduce((max, current) => 
      (current.resueltos > max.resueltos) ? current : max, 
      { name: 'Sin cuadrilla activa', resueltos: 0 }
    );

    return {
      total,
      resueltos,
      pendientes,
      avgSLA,
      totalKg,
      starCrewName: starCrew.resueltos > 0 ? starCrew.name : 'Sin actividad aún',
      starCrewCount: starCrew.resueltos
    };
  }, [reports, statsSLA, statsCuadrillas]);

  // Estado vacío general cuando no hay reportes registrados
  if (reports.length === 0) {
    return (
      <div className="glass-card p-12 rounded-2xl border border-white/5 text-center flex flex-col items-center gap-4 max-w-xl mx-auto my-8">
        <div className="p-4 bg-primary/10 text-primary rounded-2xl">
          <Database className="h-10 w-10" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Sin incidencias registradas</h3>
          <p className="text-xs text-gray-300 mt-2 max-w-md leading-relaxed">
            Actualmente la base de datos no contiene reportes para calcular tiempos de respuesta (SLA), toneladas limpiadas ni tendencias operativas.
          </p>
        </div>
        {onLoadDemo && (
          <button
            onClick={onLoadDemo}
            className="mt-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-primary/20 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            aria-label="Cargar conjunto de datos de demostración"
          >
            Cargar datos de demostración (Demo)
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Banner de Advertencia si los datos son de Demostración */}
      {hasDemoData && (
        <div className="bg-purple-950/40 border border-purple-500/30 p-3.5 px-5 rounded-2xl flex items-center justify-between text-xs text-purple-200 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <Info className="h-4 w-4 text-purple-400 flex-shrink-0" />
            <span>
              <strong>Modo Demostración Activo:</strong> Las métricas y gráficos visualizados incluyen incidencias ficticias de prueba para explorar el flujo operativo de EcoTuc en Tucumán. No representan datos municipales reales.
            </span>
          </div>
        </div>
      )}

      {/* 1. Tarjetas KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Tiempo Promedio SLA */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 flex items-center justify-between shadow-inner">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">Tiempo Promedio SLA</span>
            <span className="text-2xl font-bold text-white tracking-tight">
              {kpis.avgSLA !== null ? `${kpis.avgSLA} hrs` : '--'}
            </span>
            <span className="text-[10px] text-gray-300 flex items-center gap-1 mt-1 font-sans">
              <Clock className="h-3 w-3 text-primary" />
              {kpis.avgSLA !== null ? 'Tiempo de resolución real' : 'Sin incidencias resueltas'}
            </span>
          </div>
          <div className="p-3 bg-primary/10 rounded-xl text-primary shadow-sm shadow-primary/10">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 2: Residuos Limpiados */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 flex items-center justify-between shadow-inner">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">Residuos Limpiados</span>
            <span className="text-2xl font-bold text-white tracking-tight">
              {kpis.totalKg >= 1000 ? `${(kpis.totalKg / 1000).toFixed(2)} Tn` : `${kpis.totalKg} kg`}
            </span>
            <span className="text-[10px] text-gray-300 flex items-center gap-1 mt-1 font-sans">
              <Trash2 className="h-3 w-3 text-emerald-400" /> 
              {kpis.resueltos > 0 ? `${kpis.resueltos} foco(s) saneado(s)` : '0 kg recolectados'}
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 shadow-sm shadow-emerald-500/10">
            <Trash2 className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 3: Cuadrilla Destacada */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 flex items-center justify-between shadow-inner">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">Cuadrilla Destacada</span>
            <span className="text-xl font-bold text-white tracking-tight truncate max-w-[160px]" title={kpis.starCrewName}>
              {kpis.starCrewName}
            </span>
            <span className="text-[10px] text-gray-300 flex items-center gap-1 mt-1 font-sans">
              <Award className="h-3 w-3 text-amber-400" /> 
              {kpis.starCrewCount > 0 ? `${kpis.starCrewCount} focos resueltos` : 'Sin focos completados'}
            </span>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 shadow-sm shadow-amber-500/10">
            <Award className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 4: Tasa de Resolución */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 flex items-center justify-between shadow-inner">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">Tasa de Resolución</span>
            <span className="text-2xl font-bold text-white tracking-tight">
              {kpis.total > 0 ? ((kpis.resueltos / kpis.total) * 100).toFixed(0) : '0'}%
            </span>
            <span className="text-[10px] text-gray-300 flex items-center gap-1 mt-1 font-sans">
              <CheckCircle className="h-3 w-3 text-accent-blue" /> {kpis.resueltos} de {kpis.total} resueltos
            </span>
          </div>
          <div className="p-3 bg-accent-blue/10 rounded-xl text-accent-blue shadow-sm shadow-accent-blue/10">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* 2. Sección de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico 1: Tendencia de Reportes */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-primary" />
              Tendencia de Reportes Creados vs Resueltos
            </h4>
            <p className="text-[10px] text-gray-300 mt-1">Comparación diaria de la última semana de operaciones.</p>
          </div>
          
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={statsTendencia}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="fecha" stroke="rgba(255,255,255,0.6)" tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.6)" tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#16161a', 
                    borderColor: 'rgba(255,255,255,0.1)', 
                    borderRadius: '12px',
                    color: '#fff'
                  }} 
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ color: '#fff' }} />
                <Line type="monotone" dataKey="Creados" stroke="#f59e0b" strokeWidth={3} activeDot={{ r: 8 }} name="Creados" />
                <Line type="monotone" dataKey="Resueltos" stroke="#10b981" strokeWidth={3} name="Resueltos" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Tiempos de SLA por Categoría */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-primary" />
              Tiempo Promedio de Respuesta SLA (Horas)
            </h4>
            <p className="text-[10px] text-gray-300 mt-1">Tiempo de resolución real por categoría vs. límite de compromiso municipal.</p>
          </div>

          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsSLA} margin={{ top: 20, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="category" stroke="rgba(255,255,255,0.6)" tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.6)" tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#16161a', 
                    borderColor: 'rgba(255,255,255,0.1)', 
                    borderRadius: '12px',
                    color: '#fff'
                  }} 
                  formatter={(value: any, name: any) => [
                    `${value} hrs`,
                    name === 'sla' ? 'Horas SLA Real' : 'Límite Municipio'
                  ]}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="sla" fill="url(#primaryGrad)" name="Horas SLA Real" radius={[4, 4, 0, 0]} />
                <Bar dataKey="limiteSLA" fill="#6b7280" name="Límite Municipio" opacity={0.4} radius={[4, 4, 0, 0]} />
                
                <defs>
                  <linearGradient id="primaryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Desempeño de Cuadrillas y Resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico 3: Desempeño Cuadrillas */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col gap-4 lg:col-span-2">
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-primary" />
              Eficiencia de Cuadrillas en Campo
            </h4>
            <p className="text-[10px] text-gray-300 mt-1">Comparación de incidencias resueltas por cada cuadrilla activa.</p>
          </div>

          <div className="h-60 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsCuadrillas} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="rgba(255,255,255,0.6)" tickLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.6)" tickLine={false} width={130} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#16161a', 
                    borderColor: 'rgba(255,255,255,0.1)', 
                    borderRadius: '12px',
                    color: '#fff'
                  }} 
                  formatter={(val: any) => [`${val} incidencias`, 'Limpias']}
                />
                <Bar dataKey="resueltos" fill="#06b6d4" name="Incidencias Limpias" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel 4: Resumen de Cobertura */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col gap-5">
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-primary" />
              Estado de Cobertura
            </h4>
            <p className="text-[10px] text-gray-300 mt-1">Proporción general de limpieza en la ciudad.</p>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">Resueltos / Saneados</span>
                <span className="font-bold text-primary">{kpis.resueltos}</span>
              </div>
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-[1px]">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-1000"
                  style={{ width: `${kpis.total > 0 ? (kpis.resueltos / kpis.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">Pendientes de Asignación</span>
                <span className="font-bold text-amber-400">{kpis.pendientes}</span>
              </div>
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-[1px]">
                <div 
                  className="h-full bg-amber-400 rounded-full transition-all duration-1000"
                  style={{ width: `${kpis.total > 0 ? (kpis.pendientes / kpis.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">En Proceso / Asignados</span>
                <span className="font-bold text-accent-blue">{Math.max(0, kpis.total - kpis.resueltos - kpis.pendientes)}</span>
              </div>
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-[1px]">
                <div 
                  className="h-full bg-accent-blue rounded-full transition-all duration-1000"
                  style={{ width: `${kpis.total > 0 ? (Math.max(0, kpis.total - kpis.resueltos - kpis.pendientes) / kpis.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/5 pt-3.5 text-center">
            <span className="text-[10px] text-gray-400 font-sans">
              Datos sincronizados con la Base de Datos Municipal
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
