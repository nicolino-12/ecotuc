-- =========================================================================
-- EcoTuc - Migración 001: Esquema Inicial de Base de Datos (PostgreSQL + PostGIS)
-- =========================================================================

-- Habilitar la extensión espacial PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'OPERATOR', 'CITIZEN')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Cuadrillas
CREATE TABLE IF NOT EXISTS crews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    vehicle_plate VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'INACTIVA' CHECK (status IN ('ACTIVA', 'INACTIVA', 'EN_RUTA')),
    current_location GEOMETRY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Miembros de Cuadrilla
CREATE TABLE IF NOT EXISTS crew_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL CHECK (role IN ('CHOFER', 'RECOLECTOR')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Instituciones de referencia (Escuelas, Hospitales, Desagües)
CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ESCUELA', 'HOSPITAL', 'DESAGUE')),
    location GEOMETRY(Point, 4326) NOT NULL
);

-- 5. Tabla de Reportes de Micro-Basurales
CREATE TABLE IF NOT EXISTS reports (
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
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'EN_PROCESO', 'COMPLETADA')),
    optimized_sequence JSONB NOT NULL,
    path GEOMETRY(LineString, 4326),
    total_distance_km FLOAT NOT NULL,
    estimated_time_mins FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_reports_location ON reports USING gist(location);
CREATE INDEX IF NOT EXISTS idx_crews_current_location ON crews USING gist(current_location);
CREATE INDEX IF NOT EXISTS idx_institutions_location ON institutions USING gist(location);
CREATE INDEX IF NOT EXISTS idx_routes_path ON routes USING gist(path);
CREATE INDEX IF NOT EXISTS idx_reports_status_priority ON reports(status, priority);
CREATE INDEX IF NOT EXISTS idx_reports_crew_id ON reports(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_crew_id ON crew_members(crew_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
