"use client";

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

interface MapSelectorProps {
  coords: { lat: number; lng: number };
  onChange: (latlng: { lat: number; lng: number }) => void;
}

// Componente para actualizar el centro del mapa si las coordenadas cambian
function RecenterMap({ coords }: { coords: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([coords.lat, coords.lng], map.getZoom());
  }, [coords]);
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

export default function MapSelector({ coords, onChange }: MapSelectorProps) {
  // Icono personalizado para el marcador seleccionado
  const customIcon = L.divIcon({
    html: `<div class="w-5 h-5 rounded-full bg-primary ring-4 ring-primary/30 border-2 border-white animate-pulse shadow-lg glow-green"></div>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  return (
    <MapContainer 
      center={[coords.lat, coords.lng]} 
      zoom={14} 
      scrollWheelZoom={true} 
      className="h-full w-full"
    >
      <RecenterMap coords={coords} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <MapEventsHelper onClick={(latlng) => onChange({ lat: latlng.lat, lng: latlng.lng })} />
      <Marker position={[coords.lat, coords.lng]} icon={customIcon} />
    </MapContainer>
  );
}
