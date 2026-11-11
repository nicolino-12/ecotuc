-- =========================================================================
-- EcoTuc - Migración 002: Semillas y Datos de Demostración (Ficticios)
-- Coordenadas centradas en San Miguel de Tucumán (-65.22, -26.82)
-- NOTA: Todos los datos, usuarios y patentes son 100% ficticios para pruebas.
-- =========================================================================

-- 1. Insertar Usuarios Ficticios de Prueba
-- Las contraseñas hasheadas corresponden a "password123"
INSERT INTO users (id, email, password_hash, full_name, role) VALUES
('a3c5a81e-927b-4029-bb88-29470c634b31', 'admin.demo@ecotuc.local', '$2b$10$wzW1qQZ4c2g6yN2v9YfRCuZ1xJbe.J00v1vV7C6NzeFkF8bX2gD1y', 'Administrador Demo', 'ADMIN'),
('b5c5a81e-927b-4029-bb88-29470c634b32', 'operador.demo@ecotuc.local', '$2b$10$wzW1qQZ4c2g6yN2v9YfRCuZ1xJbe.J00v1vV7C6NzeFkF8bX2gD1y', 'Operador Municipal Demo', 'OPERATOR'),
('c7c5a81e-927b-4029-bb88-29470c634b33', 'ciudadano.demo@ecotuc.local', '$2b$10$wzW1qQZ4c2g6yN2v9YfRCuZ1xJbe.J00v1vV7C6NzeFkF8bX2gD1y', 'Ciudadano Demo Tucumán', 'CITIZEN'),
('d9c5a81e-927b-4029-bb88-29470c634b34', 'vecino.demo@ecotuc.local', '$2b$10$wzW1qQZ4c2g6yN2v9YfRCuZ1xJbe.J00v1vV7C6NzeFkF8bX2gD1y', 'Vecino Demo Tucumán', 'CITIZEN')
ON CONFLICT (id) DO NOTHING;

-- 2. Insertar Cuadrillas de Demostración (Patentes ficticias de prueba ECO-DEMO-*)
INSERT INTO crews (id, name, vehicle_plate, status, current_location) VALUES
('e1c5a81e-927b-4029-bb88-29470c634b35', 'Cuadrilla Norte - Camión 01', 'ECO-DEMO-01', 'ACTIVA', ST_GeomFromText('POINT(-65.215286 -26.812354)', 4326)),
('f3c5a81e-927b-4029-bb88-29470c634b36', 'Cuadrilla Sur - Camión 02', 'ECO-DEMO-02', 'ACTIVA', ST_GeomFromText('POINT(-65.228512 -26.839841)', 4326)),
('05c5a81e-927b-4029-bb88-29470c634b37', 'Cuadrilla Centro - Camión 03', 'ECO-DEMO-03', 'INACTIVA', ST_GeomFromText('POINT(-65.222312 -26.828372)', 4326))
ON CONFLICT (id) DO NOTHING;

-- 3. Insertar Integrantes Ficticios de Cuadrilla
INSERT INTO crew_members (id, crew_id, full_name, role) VALUES
('11c5a81e-927b-4029-bb88-29470c634b38', 'e1c5a81e-927b-4029-bb88-29470c634b35', 'Chofer Demo Norte', 'CHOFER'),
('12c5a81e-927b-4029-bb88-29470c634b39', 'e1c5a81e-927b-4029-bb88-29470c634b35', 'Recolector Demo 1', 'RECOLECTOR'),
('13c5a81e-927b-4029-bb88-29470c634b40', 'f3c5a81e-927b-4029-bb88-29470c634b36', 'Chofer Demo Sur', 'CHOFER'),
('14c5a81e-927b-4029-bb88-29470c634b41', 'f3c5a81e-927b-4029-bb88-29470c634b36', 'Recolector Demo 2', 'RECOLECTOR')
ON CONFLICT (id) DO NOTHING;

-- 4. Puntos Institucionales de Referencia en Tucumán
INSERT INTO institutions (id, name, type, location) VALUES
('21c5a81e-927b-4029-bb88-29470c634b42', 'Hospital Centro de Salud Zenón Santillán', 'HOSPITAL', ST_GeomFromText('POINT(-65.210459 -26.818318)', 4326)),
('22c5a81e-927b-4029-bb88-29470c634b43', 'Hospital Ángel C. Padilla', 'HOSPITAL', ST_GeomFromText('POINT(-65.222237 -26.832264)', 4326)),
('23c5a81e-927b-4029-bb88-29470c634b44', 'Escuela Bartolomé Mitre', 'ESCUELA', ST_GeomFromText('POINT(-65.204558 -26.825833)', 4326)),
('24c5a81e-927b-4029-bb88-29470c634b45', 'Colegio Nacional Bartolomé Mitre', 'ESCUELA', ST_GeomFromText('POINT(-65.215783 -26.823412)', 4326)),
('25c5a81e-927b-4029-bb88-29470c634b46', 'Desagüe Pluvial Principal Av. Mate de Luna', 'DESAGUE', ST_GeomFromText('POINT(-65.234122 -26.829141)', 4326)),
('26c5a81e-927b-4029-bb88-29470c634b47', 'Boca de Tormenta Av. Sarmiento', 'DESAGUE', ST_GeomFromText('POINT(-65.212345 -26.815678)', 4326))
ON CONFLICT (id) DO NOTHING;

-- 5. Incidencias Ficticias de Demostración en Tucumán
-- Incluyen diferentes categorías, prioridades, estados y asignación a cuadrillas
INSERT INTO reports (
    id, citizen_id, category, description, image_url, location, 
    priority, priority_score, status, crew_id, observations, created_at, resolved_at
) VALUES
(
    '31c5a81e-927b-4029-bb88-29470c634b48',
    'c7c5a81e-927b-4029-bb88-29470c634b33',
    'BASURAL',
    '[DEMO] Acumulación de bolsas y residuos en esquina Av. Mate de Luna y Alem.',
    'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop',
    ST_GeomFromText('POINT(-65.228512 -26.829841)', 4326),
    'ALTA',
    78.5,
    'ASIGNADO',
    'e1c5a81e-927b-4029-bb88-29470c634b35',
    'Cuadrilla Norte asignada para retiro en turno matutino.',
    CURRENT_TIMESTAMP - INTERVAL '18 hours',
    NULL
),
(
    '32c5a81e-927b-4029-bb88-29470c634b49',
    'd9c5a81e-927b-4029-bb88-29470c634b34',
    'ALCANTARILLA',
    '[DEMO] Boca de tormenta tapada con botellas plásticas en Barrio Sur.',
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop',
    ST_GeomFromText('POINT(-65.218512 -26.835841)', 4326),
    'ALTA',
    82.0,
    'EN_PROCESO',
    'f3c5a81e-927b-4029-bb88-29470c634b36',
    'Personal operando en calle Jujuy con herramientas de desobstrucción.',
    CURRENT_TIMESTAMP - INTERVAL '10 hours',
    NULL
),
(
    '33c5a81e-927b-4029-bb88-29470c634b50',
    'c7c5a81e-927b-4029-bb88-29470c634b33',
    'PELIGROSO',
    '[DEMO] Restos de químicos y baterías en vía pública cercano a Parque 9 de Julio.',
    'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop',
    ST_GeomFromText('POINT(-65.212345 -26.815678)', 4326),
    'CRITICA',
    95.0,
    'PENDIENTE',
    NULL,
    'Requiere equipamiento especial de protección y transporte seguro.',
    CURRENT_TIMESTAMP - INTERVAL '4 hours',
    NULL
),
(
    '34c5a81e-927b-4029-bb88-29470c634b51',
    'd9c5a81e-927b-4029-bb88-29470c634b34',
    'ESCOMBROS',
    '[DEMO] Restos de demolición sobre la acera peatonal en Barrio Norte.',
    'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600&auto=format&fit=crop',
    ST_GeomFromText('POINT(-65.204558 -26.825833)', 4326),
    'MEDIA',
    55.0,
    'PENDIENTE',
    NULL,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '26 hours',
    NULL
),
(
    '35c5a81e-927b-4029-bb88-29470c634b52',
    'c7c5a81e-927b-4029-bb88-29470c634b33',
    'BASURAL',
    '[DEMO] Microbasural en terreno baldío saneado exitosamente.',
    'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600&auto=format&fit=crop',
    ST_GeomFromText('POINT(-65.222312 -26.828372)', 4326),
    'MEDIA',
    60.0,
    'RESUELTO',
    'e1c5a81e-927b-4029-bb88-29470c634b35',
    'Retiro de 340 kg de residuos completado.',
    CURRENT_TIMESTAMP - INTERVAL '30 hours',
    CURRENT_TIMESTAMP - INTERVAL '25 hours'
)
ON CONFLICT (id) DO NOTHING;
