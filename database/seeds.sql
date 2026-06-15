-- Semillas de prueba para EcoTuc (Coordenadas centradas en San Miguel de Tucumán: -65.22 Longitud, -26.82 Latitud)

-- 1. Insertar Usuarios
-- Contraseñas hasheadas de ejemplo (todas son "password123")
INSERT INTO users (id, email, password_hash, full_name, role) VALUES
('a3c5a81e-927b-4029-bb88-29470c634b31', 'admin@ecotuc.gov.ar', '$2b$10$wzW1qQZ4c2g6yN2v9YfRCuZ1xJbe.J00v1vV7C6NzeFkF8bX2gD1y', 'Admin EcoTuc', 'ADMIN'),
('b5c5a81e-927b-4029-bb88-29470c634b32', 'operador@ecotuc.gov.ar', '$2b$10$wzW1qQZ4c2g6yN2v9YfRCuZ1xJbe.J00v1vV7C6NzeFkF8bX2gD1y', 'Juan Pérez (Operador)', 'OPERATOR'),
('c7c5a81e-927b-4029-bb88-29470c634b33', 'ciudadano1@gmail.com', '$2b$10$wzW1qQZ4c2g6yN2v9YfRCuZ1xJbe.J00v1vV7C6NzeFkF8bX2gD1y', 'María González', 'CITIZEN'),
('d9c5a81e-927b-4029-bb88-29470c634b34', 'ciudadano2@gmail.com', '$2b$10$wzW1qQZ4c2g6yN2v9YfRCuZ1xJbe.J00v1vV7C6NzeFkF8bX2gD1y', 'Carlos Rodríguez', 'CITIZEN');

-- 2. Insertar Cuadrillas
INSERT INTO crews (id, name, vehicle_plate, status, current_location) VALUES
('e1c5a81e-927b-4029-bb88-29470c634b35', 'Cuadrilla Norte - Camión 01', 'AF-123-JK', 'ACTIVA', ST_GeomFromText('POINT(-65.215286 -26.812354)', 4326)),
('f3c5a81e-927b-4029-bb88-29470c634b36', 'Cuadrilla Sur - Camión 02', 'AE-987-LM', 'ACTIVA', ST_GeomFromText('POINT(-65.228512 -26.839841)', 4326)),
('05c5a81e-927b-4029-bb88-29470c634b37', 'Cuadrilla Centro - Camión 03', 'AD-456-OP', 'INACTIVA', ST_GeomFromText('POINT(-65.222312 -26.828372)', 4326));

-- 3. Insertar Integrantes de Cuadrilla
INSERT INTO crew_members (crew_id, full_name, role) VALUES
('e1c5a81e-927b-4029-bb88-29470c634b35', 'Pedro Gómez', 'CHOFER'),
('e1c5a81e-927b-4029-bb88-29470c634b35', 'Luis Maidana', 'RECOLECTOR'),
('f3c5a81e-927b-4029-bb88-29470c634b36', 'Marcos Juárez', 'CHOFER'),
('f3c5a81e-927b-4029-bb88-29470c634b36', 'Daniel Albornoz', 'RECOLECTOR');

-- 4. Insertar Instituciones de Referencia en Tucumán (Puntos de interés para el Algoritmo de Priorización)
INSERT INTO institutions (name, type, location) VALUES
('Hospital Centro de Salud Zenón Santillán', 'HOSPITAL', ST_GeomFromText('POINT(-65.210459 -26.818318)', 4326)),
('Hospital Ángel C. Padilla', 'HOSPITAL', ST_GeomFromText('POINT(-65.222237 -26.832264)', 4326)),
('Escuela Bartolomé Mitre', 'ESCUELA', ST_GeomFromText('POINT(-65.204558 -26.825833)', 4326)),
('Colegio Nacional Bartolomé Mitre', 'ESCUELA', ST_GeomFromText('POINT(-65.215783 -26.823412)', 4326)),
('Desagüe Pluvial Principal Av. Mate de Luna', 'DESAGUE', ST_GeomFromText('POINT(-65.234122 -26.829141)', 4326)),
('Boca de Tormenta Av. Sarmiento', 'DESAGUE', ST_GeomFromText('POINT(-65.212345 -26.815678)', 4326));

-- 5. Insertar Reportes de Basura
-- Caso 1: Basural a 50m del Hospital Centro de Salud (Debe priorizarse como CRÍTICA)
INSERT INTO reports (id, citizen_id, category, description, image_url, location, priority, priority_score, status, crew_id) VALUES
('10c5a81e-927b-4029-bb88-29470c634b38', 'c7c5a81e-927b-4029-bb88-29470c634b33', 'BASURAL', 'Acumulación masiva de basura en la esquina del hospital. Olor insoportable y presencia de roedores.', '/uploads/basural_hospital.jpg', ST_GeomFromText('POINT(-65.210600 -26.818500)', 4326), 'CRITICA', 95.5, 'PENDIENTE', NULL),

-- Caso 2: Escombros cerca de Escuela Mitre (Debe ser ALTA)
('20c5a81e-927b-4029-bb88-29470c634b39', 'c7c5a81e-927b-4029-bb88-29470c634b33', 'ESCOMBROS', 'Restos de obra abandonados sobre la vereda que obligan a los alumnos a caminar por la calle.', '/uploads/escombros_mitre.jpg', ST_GeomFromText('POINT(-65.204800 -26.826000)', 4326), 'ALTA', 78.2, 'PENDIENTE', NULL),

-- Caso 3: Alcantarilla tapada en Av. Mate de Luna (Debe ser ALTA)
('30c5a81e-927b-4029-bb88-29470c634b40', 'd9c5a81e-927b-4029-bb88-29470c634b34', 'ALCANTARILLA', 'Alcantarilla completamente tapada con botellas plásticas. Inunda la calle cuando llueve.', '/uploads/alcantarilla_mate_de_luna.jpg', ST_GeomFromText('POINT(-65.234300 -26.829300)', 4326), 'ALTA', 82.0, 'PENDIENTE', NULL),

-- Caso 4: Basura general domiciliaria en zona residencial lejana (Prioridad MEDIA)
('40c5a81e-927b-4029-bb88-29470c634b41', 'd9c5a81e-927b-4029-bb88-29470c634b34', 'BASURAL', 'Montículo de bolsas de residuos acumuladas en la platabanda.', '/uploads/basura_residencial.jpg', ST_GeomFromText('POINT(-65.250000 -26.830000)', 4326), 'MEDIA', 50.0, 'PENDIENTE', NULL),

-- Caso 5: Residuos Peligrosos ya resueltos por Cuadrilla Norte
('50c5a81e-927b-4029-bb88-29470c634b42', 'c7c5a81e-927b-4029-bb88-29470c634b33', 'PELIGROSO', 'Desechos químicos de taller mecánico.', '/uploads/quimicos_taller.jpg', ST_GeomFromText('POINT(-65.218000 -26.820000)', 4326), 'CRITICA', 90.0, 'RESUELTO', 'e1c5a81e-927b-4029-bb88-29470c634b35');
