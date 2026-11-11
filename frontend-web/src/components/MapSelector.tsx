"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Check, AlertTriangle, MapPin } from 'lucide-react';

interface MapSelectorProps {
  coords: { lat: number; lng: number };
  onChange: (latlng: { lat: number; lng: number }) => void;
  onConfirm?: () => void;
  isConfirmed?: boolean;
}

// Componente para actualizar el centro del mapa si las coordenadas cambian
function RecenterMap({ coords }: { coords: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([coords.lat, coords.lng], map.getZoom());
  }, [coords.lat, coords.lng, map]);
  return null;
}

function MapEventsHelper({ onClick }: { onClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    },
  });
  return null;
}

export default function MapSelector({ coords, onChange, onConfirm, isConfirmed }: MapSelectorProps) {
  const [tileError, setTileError] = useState(false);

  // Proveedor de mapa leído de variables de entorno públicas con fallback a OpenStreetMap
  const tileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  // Icono personalizado accesible y visible para el marcador
  const customIcon = useMemo(() => {
    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          <span class="absolute inline-flex h-8 w-8 rounded-full bg-emerald-500 opacity-30 animate-ping"></span>
          <div class="w-6 h-6 rounded-full bg-primary ring-4 ring-primary/40 border-2 border-white shadow-xl glow-green flex items-center justify-center text-white cursor-grab active:cursor-grabbing">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </div>
        </div>
      `,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }, []);

  return (
    <div className="relative h-full w-full">
      <MapContainer 
        center={[coords.lat, coords.lng]} 
        zoom={14} 
        scrollWheelZoom={true} 
        className="h-full w-full dark-map-tiles"
      >
        <RecenterMap coords={coords} />
        
        <TileLayer
          attribution={attribution}
          url={tileUrl}
          eventHandlers={{
            tileerror: () => setTileError(true),
            tileload: () => setTileError(false),
          }}
        />

        <MapEventsHelper onClick={(latlng) => onChange({ lat: latlng.lat, lng: latlng.lng })} />
        
        <Marker 
          position={[coords.lat, coords.lng]} 
          icon={customIcon} 
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const position = marker.getLatLng();
              onChange({ lat: position.lat, lng: position.lng });
            },
          }}
        />
      </MapContainer>

      {/* Mensaje de error si el proveedor de teselas no puede cargarse */}
      {tileError && (
        <div className="absolute top-3 left-3 right-3 bg-red-900/90 text-white text-xs p-3 rounded-xl border border-red-500/40 shadow-xl backdrop-blur-md z-[1000] flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-300 flex-shrink-0" />
          <span>
            No se pudieron cargar algunas teselas del mapa. Verifica tu conexión a internet o la variable <code className="bg-black/30 px-1 py-0.5 rounded">NEXT_PUBLIC_MAP_TILE_URL</code>.
          </span>
        </div>
      )}

      {/* Barra flotante de confirmación de coordenadas */}
      <div className="absolute bottom-3 left-3 right-3 bg-card/90 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md z-[1000] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Punto Seleccionado</span>
            <span className="font-mono text-white font-semibold">
              {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            </span>
          </div>
        </div>

        {onConfirm && (
          <button
            type="button"
            onClick={onConfirm}
            className={`px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
              isConfirmed 
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30' 
                : 'bg-primary hover:bg-primary-dark text-white shadow-md shadow-primary/20 cursor-pointer'
            }`}
            aria-label="Confirmar ubicación seleccionada en el mapa"
          >
            <Check className="h-3.5 w-3.5" />
            <span>{isConfirmed ? 'Ubicación Confirmada' : 'Confirmar Punto'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
