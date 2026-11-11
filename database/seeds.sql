-- Semillas de prueba para EcoTuc (Coordenadas centradas en San Miguel de Tucumán: -65.22 Longitud, -26.82 Latitud)
-- NOTA DE PRIVACIDAD: Todos los usuarios, patentes y datos son estrictamente ficticios para pruebas.

-- 1. Insertar Usuarios Ficticios
-- Contraseñas hasheadas de ejemplo ("password123")
INSERT INTO users (id, email, password_hash, full_name, role) VALUES
('a3c5a81e-927b-4029-bb88-29470c634b31', 'admin.demo@ecotuc.local', '$2b$10$wzW1qQZ4c2g6yN2v9YfRCuZ1xJbe.J00v1vV7C6NzeFkF8bX2gD1y', 'Admin EcoTuc (Demo)', 'ADMIN'),
('b5c5a81e-927b-4029-bb88-29470c634b32', 'operador.demo@ecotuc.local', '$2b$10$wzW1qQZ4c2g6yN2v9YfRCuZ1xJbe.J00v1vV7C6NzeFkF8bX2gD1y', 'Operador Demo', 'OPERATOR'),
('c7c5a81e-927b-4029-bb88-29470c634b33', 'ciudadano.demo@ecotuc.local', '$2b$10$wzW1qQZ4c2g6yN2v9YfRCuZ1xJbe.J00v1vV7C6NzeFkF8bX2gD1y', 'Ciudadano Demo Tucumán', 'CITIZEN'),
('d9c5a81e-927b-4029-bb88-29470c634b34', 'vecino.demo@ecotuc.local', '$2b$10$wzW1qQZ4c2g6yN2v9YfRCuZ1xJbe.J00v1vV7C6NzeFkF8bX2gD1y', 'Vecino Demo Tucumán', 'CITIZEN')
ON CONFLICT (id) DO NOTHING;

-- 2. Insertar Cuadrillas (Patentes ficticias de prueba ECO-DEMO-*)
INSERT INTO crews (id, name, vehicle_plate, status, current_location) VALUES
('e1c5a81e-927b-4029-bb88-29470c634b35', 'Cuadrilla Norte - Camión 01', 'ECO-DEMO-01', 'ACTIVA', ST_GeomFromText('POINT(-65.215286 -26.812354)', 4326)),
('f3c5a81e-927b-4029-bb88-29470c634b36', 'Cuadrilla Sur - Camión 02', 'ECO-DEMO-02', 'ACTIVA', ST_GeomFromText('POINT(-65.228512 -26.839841)', 4326)),
('05c5a81e-927b-4029-bb88-29470c634b37', 'Cuadrilla Centro - Camión 03', 'ECO-DEMO-03', 'INACTIVA', ST_GeomFromText('POINT(-65.222312 -26.828372)', 4326))
ON CONFLICT (id) DO NOTHING;

-- 3. Insertar Integrantes de Cuadrilla (Nombres ficticios)
INSERT INTO crew_members (id, crew_id, full_name, role) VALUES
('11c5a81e-927b-4029-bb88-29470c634b38', 'e1c5a81e-927b-4029-bb88-29470c634b35', 'Chofer Demo Norte', 'CHOFER'),
('12c5a81e-927b-4029-bb88-29470c634b39', 'e1c5a81e-927b-4029-bb88-29470c634b35', 'Recolector Demo 1', 'RECOLECTOR'),
('13c5a81e-927b-4029-bb88-29470c634b40', 'f3c5a81e-927b-4029-bb88-29470c634b36', 'Chofer Demo Sur', 'CHOFER'),
('14c5a81e-927b-4029-bb88-29470c634b41', 'f3c5a81e-927b-4029-bb88-29470c634b36', 'Recolector Demo 2', 'RECOLECTOR')
ON CONFLICT (id) DO NOTHING;

-- 4. Insertar Instituciones de Referencia en Tucumán
INSERT INTO institutions (id, name, type, location) VALUES
('21c5a81e-927b-4029-bb88-29470c634b42', 'Hospital Centro de Salud Zenón Santillán', 'HOSPITAL', ST_GeomFromText('POINT(-65.210459 -26.818318)', 4326)),
('22c5a81e-927b-4029-bb88-29470c634b43', 'Hospital Ángel C. Padilla', 'HOSPITAL', ST_GeomFromText('POINT(-65.222237 -26.832264)', 4326)),
('23c5a81e-927b-4029-bb88-29470c634b44', 'Escuela Bartolomé Mitre', 'ESCUELA', ST_GeomFromText('POINT(-65.204558 -26.825833)', 4326)),
('24c5a81e-927b-4029-bb88-29470c634b45', 'Colegio Nacional Bartolomé Mitre', 'ESCUELA', ST_GeomFromText('POINT(-65.215783 -26.823412)', 4326)),
('25c5a81e-927b-4029-bb88-29470c634b46', 'Desagüe Pluvial Principal Av. Mate de Luna', 'DESAGUE', ST_GeomFromText('POINT(-65.234122 -26.829141)', 4326)),
('26c5a81e-927b-4029-bb88-29470c634b47', 'Boca de Tormenta Av. Sarmiento', 'DESAGUE', ST_GeomFromText('POINT(-65.212345 -26.815678)', 4326))
ON CONFLICT (id) DO NOTHING;
