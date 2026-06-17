import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EcoTuc - Panel de Gestión de Micro-basurales',
  description: 'Sistema Inteligente de Gestión de Micro-Basurales y Planificación de Rutas Urbanas',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* Leaflet CSS CDN para que el mapa renderice correctamente */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        {/* Metadatos PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10b981" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="EcoTuc" />
      </head>
      <body className="antialiased">
        {children}
        
        {/* Registro del Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registrado con éxito: ', registration.scope);
                    },
                    function(err) {
                      console.log('Fallo en el registro de ServiceWorker: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
