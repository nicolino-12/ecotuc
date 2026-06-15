-- Habilitar la extensión espacial PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Eliminar tablas si existen (para limpieza)
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS institutions CASCADE;
DROP TABLE IF EXISTS crew_members CASCADE;
DROP TABLE IF EXISTS crews CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Tabla de Usuarios
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'OPERATOR', 'CITIZEN')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Cuadrillas
CREATE TABLE crews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    vehicle_plate VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'INACTIVA' CHECK (status IN ('ACTIVA', 'INACTIVA', 'EN_RUTA')),
    current_location GEOMETRY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Miembros de Cuadrilla
CREATE TABLE crew_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL CHECK (role IN ('CHOFER', 'RECOLECTOR')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Instituciones de referencia (Escuelas, Hospitales, Desagües)
CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ESCUELA', 'HOSPITAL', 'DESAGUE')),
    location GEOMETRY(Point, 4326) NOT NULL
);

-- 5. Tabla de Reportes de Micro-Basurales
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id UUID REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('BASURAL', 'ALCANTARILLA', 'ESCOMBROS', 'PELIGROSO', 'OTROS')),
    description TEXT,
    image_url VARCHAR(500) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    priority VARCHAR(50) DEFAULT 'BAJA' CHECK (priority IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
    priority_score FLOAT DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'EN_REVISION', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'RECHAZADO')),
    crew_id UUID REFERENCES crews(id) ON DELETE SET NULL,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 6. Tabla de Rutas de Recolección
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'EN_PROCESO', 'COMPLETADA')),
    optimized_sequence JSONB NOT NULL, -- Array ordenado de IDs de reportes
    path GEOMETRY(LineString, 4326),   -- Línea que representa el recorrido geográfico
    total_distance_km FLOAT NOT NULL,
    estimated_time_mins FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =========================================================================

-- Índices Espaciales (GIST) para búsquedas de proximidad ultrarrápidas
CREATE INDEX idx_reports_location ON reports USING gist(location);
CREATE INDEX idx_crews_current_location ON crews USING gist(current_location);
CREATE INDEX idx_institutions_location ON institutions USING gist(location);
CREATE INDEX idx_routes_path ON routes USING gist(path);

-- Índices estándar para acelerar búsquedas filtradas
CREATE INDEX idx_reports_status_priority ON reports(status, priority);
CREATE INDEX idx_reports_crew_id ON reports(crew_id);
CREATE INDEX idx_crew_members_crew_id ON crew_members(crew_id);
CREATE INDEX idx_users_email ON users(email);
