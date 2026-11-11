/**
 * EcoTuc Local Database (localStorage)
 * 
 * Proporciona persistencia de datos local en el navegador del cliente.
 * Aclaración de arquitectura:
 * - Modo Local: Los datos residen exclusivamente en el almacenamiento local (localStorage) de este dispositivo/navegador.
 * - Modo Servidor: Cuando el backend NestJS y PostgreSQL están activos, los datos se consultan y sincronizan con la base de datos central.
 */

const STORAGE_KEYS = {
  REPORTS: 'ecotuc_reports',
  CREWS: 'ecotuc_crews',
  USERS: 'ecotuc_users',
  DB_VERSION: 'ecotuc_db_version',
  DEMO_LOADED: 'ecotuc_demo_loaded',
} as const;

const CURRENT_DB_VERSION = '5';

// ===== TIPOS =====

export interface Report {
  id: string;
  category: string;
  description: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  priority: string;
  priorityScore: number;
  status: string;
  crewId: string | null;
  observations: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  citizenEmail?: string;
  citizenName?: string;
  upvotes?: number;
  supportedBy?: string[];
  isDemo?: boolean;
  isDraft?: boolean; // Para reportes creados offline pendientes de sincronización
}

export interface Crew {
  id: string;
  name: string;
  vehiclePlate: string;
  status: string;
  latitude: number;
  longitude: number;
  members: { fullName: string; role: string }[];
}

export interface RegisteredUser {
  id: string;
  fullName: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  role: 'OPERATOR' | 'CITIZEN';
  createdAt: string;
  avatarColor: string;
}

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: 'OPERATOR' | 'CITIZEN';
  phone: string;
  address: string;
  avatarColor: string;
}

// ===== DATOS INICIALES SEMILLA (FICTICIOS PARA PRIVACIDAD) =====

const AVATAR_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#6366f1',
];

export const SEED_USERS: RegisteredUser[] = [
  {
    id: 'usr_operator_demo',
    fullName: 'Operador Demo',
    email: 'operador.demo@ecotuc.local',
    password: 'password123',
    phone: '381-555-0101',
    address: 'Centro Operativo Municipal (Demo), San Miguel de Tucumán',
    role: 'OPERATOR',
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    avatarColor: '#10b981',
  },
  {
    id: 'usr_citizen_demo_1',
    fullName: 'Ciudadano Demo Tucumán',
    email: 'ciudadano.demo@ecotuc.local',
    password: 'password123',
    phone: '381-555-0102',
    address: 'Av. Mate de Luna 2500 (Demo), San Miguel de Tucumán',
    role: 'CITIZEN',
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    avatarColor: '#3b82f6',
  },
  {
    id: 'usr_citizen_demo_2',
    fullName: 'Vecino Demo Tucumán',
    email: 'vecino.demo@ecotuc.local',
    password: 'password123',
    phone: '381-555-0103',
    address: 'Barrio Sur (Demo), San Miguel de Tucumán',
    role: 'CITIZEN',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    avatarColor: '#8b5cf6',
  },
];

export const SEED_CREWS: Crew[] = [
  {
    id: 'c1',
    name: 'Cuadrilla Norte - Camión 01',
    vehiclePlate: 'ECO-DEMO-01',
    status: 'ACTIVA',
    latitude: -26.812354,
    longitude: -65.215286,
    members: [
      { fullName: 'Chofer Demo Norte', role: 'CHOFER' },
      { fullName: 'Recolector Demo 1', role: 'RECOLECTOR' },
    ],
  },
  {
    id: 'c2',
    name: 'Cuadrilla Sur - Camión 02',
    vehiclePlate: 'ECO-DEMO-02',
    status: 'ACTIVA',
    latitude: -26.839841,
    longitude: -65.228512,
    members: [
      { fullName: 'Chofer Demo Sur', role: 'CHOFER' },
      { fullName: 'Recolector Demo 2', role: 'RECOLECTOR' },
    ],
  },
  {
    id: 'c3',
    name: 'Cuadrilla Centro - Camión 03',
    vehiclePlate: 'ECO-DEMO-03',
    status: 'INACTIVA',
    latitude: -26.828372,
    longitude: -65.222312,
    members: [
      { fullName: 'Chofer Demo Centro', role: 'CHOFER' },
      { fullName: 'Recolector Demo 3', role: 'RECOLECTOR' },
    ],
  },
];

// Conjunto coherente de incidencias ficticias en San Miguel de Tucumán
export const DEMO_REPORTS: Report[] = [
  {
    id: 'demo_rep_01',
    category: 'BASURAL',
    description: '[DEMO] Microbasural crónico en esquina con acumulación de residuos domiciliarios y ramas.',
    imageUrl: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop',
    latitude: -26.829841,
    longitude: -65.228512,
    priority: 'ALTA',
    priorityScore: 78.5,
    status: 'ASIGNADO',
    crewId: 'c1',
    observations: 'Cuadrilla Norte asignada para limpieza programada de turno mañana.',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    resolvedAt: null,
    citizenEmail: 'vecino.demo@ecotuc.local',
    citizenName: 'Vecino Demo Tucumán',
    upvotes: 4,
    supportedBy: ['vecino.demo@ecotuc.local'],
    isDemo: true,
  },
  {
    id: 'demo_rep_02',
    category: 'ALCANTARILLA',
    description: '[DEMO] Boca de tormenta obstruida por botellas plásticas y sedimentos en Barrio Sur.',
    imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop',
    latitude: -26.835841,
    longitude: -65.218512,
    priority: 'ALTA',
    priorityScore: 82.0,
    status: 'EN_PROCESO',
    crewId: 'c2',
    observations: 'Personal operando en calle Jujuy con equipo de desobstrucción.',
    createdAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    resolvedAt: null,
    citizenEmail: 'vecino.demo@ecotuc.local',
    citizenName: 'Vecino Demo Tucumán',
    upvotes: 7,
    supportedBy: ['vecino.demo@ecotuc.local'],
    isDemo: true,
  },
  {
    id: 'demo_rep_03',
    category: 'PELIGROSO',
    description: '[DEMO] Restos de solventes y baterías desechadas en vía pública cerca de zona verde.',
    imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop',
    latitude: -26.815678,
    longitude: -65.212345,
    priority: 'CRITICA',
    priorityScore: 94.0,
    status: 'PENDIENTE',
    crewId: null,
    observations: 'Requiere protocolo de manipulación de sustancias peligrosas.',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    resolvedAt: null,
    citizenEmail: 'ciudadano.demo@ecotuc.local',
    citizenName: 'Ciudadano Demo Tucumán',
    upvotes: 9,
    supportedBy: ['ciudadano.demo@ecotuc.local'],
    isDemo: true,
  },
  {
    id: 'demo_rep_04',
    category: 'ESCOMBROS',
    description: '[DEMO] Restos de demolición y cerámicos en vereda impidiendo el paso peatonal.',
    imageUrl: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600&auto=format&fit=crop',
    latitude: -26.825833,
    longitude: -65.204558,
    priority: 'MEDIA',
    priorityScore: 55.0,
    status: 'PENDIENTE',
    crewId: null,
    observations: null,
    createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
    resolvedAt: null,
    citizenEmail: 'vecino.demo@ecotuc.local',
    citizenName: 'Vecino Demo Tucumán',
    upvotes: 2,
    supportedBy: [],
    isDemo: true,
  },
  {
    id: 'demo_rep_05',
    category: 'BASURAL',
    description: '[DEMO] Microbasural en terreno baldío saneado con éxito por cuadrilla municipal.',
    imageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600&auto=format&fit=crop',
    latitude: -26.828372,
    longitude: -65.222312,
    priority: 'MEDIA',
    priorityScore: 60.0,
    status: 'RESUELTO',
    crewId: 'c1',
    observations: 'Se retiraron 340 kg de residuos y se colocó cartel de prohibición de arrojo de basura.',
    createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    resolvedAt: new Date(Date.now() - 3600000 * 25).toISOString(), // 5 horas de resolución para cálculo real de SLA
    citizenEmail: 'ciudadano.demo@ecotuc.local',
    citizenName: 'Ciudadano Demo Tucumán',
    upvotes: 5,
    supportedBy: [],
    isDemo: true,
  },
  {
    id: 'demo_rep_06',
    category: 'ALCANTARILLA',
    description: '[DEMO] Desagüe pluvial saneado antes de tormenta estival en Barrio Norte.',
    imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop',
    latitude: -26.818318,
    longitude: -65.210459,
    priority: 'MEDIA',
    priorityScore: 58.0,
    status: 'RESUELTO',
    crewId: 'c2',
    observations: 'Desagüe completamente despejado. Flujo normal restablecido.',
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    resolvedAt: new Date(Date.now() - 3600000 * 16).toISOString(), // 4 horas de resolución para cálculo real de SLA
    citizenEmail: 'vecino.demo@ecotuc.local',
    citizenName: 'Vecino Demo Tucumán',
    upvotes: 3,
    supportedBy: [],
    isDemo: true,
  },
];

// ===== FUNCIONES DE BASE DE DATOS =====

function isClient(): boolean {
  return typeof window !== 'undefined';
}

/** Inicializa la base de datos con datos semilla si es la primera vez */
export function initDB(): void {
  if (!isClient()) return;

  const version = localStorage.getItem(STORAGE_KEYS.DB_VERSION);
  if (version !== CURRENT_DB_VERSION) {
    // Primera ejecución o actualización de versión
    // Por defecto se cargan las incidencias de demostración para permitir explorar el flujo inmediatamente
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(DEMO_REPORTS));
    localStorage.setItem(STORAGE_KEYS.CREWS, JSON.stringify(SEED_CREWS));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
    localStorage.setItem(STORAGE_KEYS.DB_VERSION, CURRENT_DB_VERSION);
    localStorage.setItem(STORAGE_KEYS.DEMO_LOADED, 'true');
  }
}

/** Carga los datos de demostración sin borrar reportes ciudadanos existentes */
export function loadDemoData(): void {
  if (!isClient()) return;
  const existing = getAllReports();
  const existingIds = new Set(existing.map((r) => r.id));
  const toAdd = DEMO_REPORTS.filter((demo) => !existingIds.has(demo.id));
  const merged = [...toAdd, ...existing];
  saveAllReports(merged);
  localStorage.setItem(STORAGE_KEYS.DEMO_LOADED, 'true');
}

/** Elimina únicamente las incidencias de prueba (demo) de forma segura */
export function clearDemoData(): void {
  if (!isClient()) return;
  const reports = getAllReports();
  const filtered = reports.filter((r) => !r.isDemo && !r.id.startsWith('demo_rep_') && !r.description.startsWith('[DEMO]'));
  saveAllReports(filtered);
  localStorage.setItem(STORAGE_KEYS.DEMO_LOADED, 'false');
}

/** Resetea la base de datos local limpiamente */
export function resetDB(withDemo: boolean = true): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(withDemo ? DEMO_REPORTS : []));
  localStorage.setItem(STORAGE_KEYS.CREWS, JSON.stringify(SEED_CREWS));
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
  localStorage.setItem(STORAGE_KEYS.DB_VERSION, CURRENT_DB_VERSION);
  localStorage.setItem(STORAGE_KEYS.DEMO_LOADED, withDemo ? 'true' : 'false');
}

// ----- USUARIOS -----

export function getAllUsers(): RegisteredUser[] {
  if (!isClient()) return [];
  const raw = localStorage.getItem(STORAGE_KEYS.USERS);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getUserByEmail(email: string): RegisteredUser | null {
  const users = getAllUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function registerUser(data: {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  role: 'OPERATOR' | 'CITIZEN';
}): { success: boolean; error?: string; user?: RegisteredUser } {
  if (!isClient()) return { success: false, error: 'No disponible en servidor' };

  if (!data.fullName.trim()) return { success: false, error: 'El nombre completo es obligatorio' };
  if (!data.email.trim()) return { success: false, error: 'El correo electrónico es obligatorio' };
  if (!data.password || data.password.length < 6) return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
  if (!data.phone.trim()) return { success: false, error: 'El teléfono es obligatorio' };

  const existing = getUserByEmail(data.email);
  if (existing) return { success: false, error: 'Ya existe una cuenta con este correo electrónico' };

  const users = getAllUsers();
  const newUser: RegisteredUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    fullName: data.fullName.trim(),
    email: data.email.trim().toLowerCase(),
    password: data.password,
    phone: data.phone.trim(),
    address: data.address.trim(),
    role: data.role,
    createdAt: new Date().toISOString(),
    avatarColor: AVATAR_COLORS[users.length % AVATAR_COLORS.length],
  };

  users.push(newUser);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

  return { success: true, user: newUser };
}

export function loginUser(email: string, password: string): { success: boolean; error?: string; session?: UserSession } {
  if (!email.trim()) return { success: false, error: 'Ingresa tu correo electrónico' };
  if (!password) return { success: false, error: 'Ingresa tu contraseña' };

  const user = getUserByEmail(email);
  if (!user) return { success: false, error: 'No existe una cuenta con este correo. ¿Deseas registrarte?' };
  if (user.password !== password) return { success: false, error: 'Contraseña incorrecta' };

  const session: UserSession = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    phone: user.phone,
    address: user.address,
    avatarColor: user.avatarColor,
  };

  return { success: true, session };
}

export function getUserStats(): { total: number; operators: number; citizens: number } {
  const users = getAllUsers();
  return {
    total: users.length,
    operators: users.filter((u) => u.role === 'OPERATOR').length,
    citizens: users.filter((u) => u.role === 'CITIZEN').length,
  };
}

// ----- REPORTES -----

export function getAllReports(): Report[] {
  if (!isClient()) return [];
  const raw = localStorage.getItem(STORAGE_KEYS.REPORTS);
  if (!raw) return [];
  try {
    const reports: Report[] = JSON.parse(raw);
    return reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

export function getReportsByEmail(email: string): Report[] {
  return getAllReports().filter((r) => r.citizenEmail?.toLowerCase() === email.toLowerCase());
}

export function getDraftReports(): Report[] {
  return getAllReports().filter((r) => r.isDraft === true);
}

export function addReport(report: Omit<Report, 'id' | 'createdAt'>): Report {
  const reports = getAllReports();
  const newReport: Report = {
    ...report,
    id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  reports.unshift(newReport);
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
  return newReport;
}

export function updateReport(id: string, updates: Partial<Report>): Report | null {
  const reports = getAllReports();
  const index = reports.findIndex((r) => r.id === id);
  if (index === -1) return null;
  reports[index] = { ...reports[index], ...updates };
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
  return reports[index];
}

export function deleteReport(id: string): boolean {
  const reports = getAllReports();
  const filtered = reports.filter((r) => r.id !== id);
  if (filtered.length === reports.length) return false;
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(filtered));
  return true;
}

/** Obtiene métricas coherentes con la misma lógica en toda la app */
export function getReportStats() {
  const reports = getAllReports();
  const total = reports.length;
  const open = reports.filter((r) =>
    ['PENDIENTE', 'EN_REVISION', 'ASIGNADO', 'EN_PROCESO'].includes(r.status)
  ).length;
  const closed = reports.filter((r) =>
    ['RESUELTO', 'RECHAZADO', 'CERRADO'].includes(r.status)
  ).length;
  const urgent = reports.filter(
    (r) => ['CRITICA', 'ALTA'].includes(r.priority) && !['RESUELTO', 'RECHAZADO', 'CERRADO'].includes(r.status)
  ).length;
  const crews = getAllCrews();
  const activeCrews = crews.filter((c) => c.status !== 'INACTIVA').length;

  return { total, open, closed, urgent, activeCrews };
}

// ----- CUADRILLAS -----

export function getAllCrews(): Crew[] {
  if (!isClient()) return [];
  const raw = localStorage.getItem(STORAGE_KEYS.CREWS);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function updateCrew(id: string, updates: Partial<Crew>): Crew | null {
  const crews = getAllCrews();
  const index = crews.findIndex((c) => c.id === id);
  if (index === -1) return null;
  crews[index] = { ...crews[index], ...updates };
  localStorage.setItem(STORAGE_KEYS.CREWS, JSON.stringify(crews));
  return crews[index];
}

export function saveAllReports(reports: Report[]): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
}

export function saveAllCrews(crews: Crew[]): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEYS.CREWS, JSON.stringify(crews));
}

export function supportReport(id: string, email: string): Report | null {
  const reports = getAllReports();
  const index = reports.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const report = reports[index];
  const supportedBy = report.supportedBy || [];

  if (supportedBy.includes(email.toLowerCase())) return report;

  supportedBy.push(email.toLowerCase());
  report.supportedBy = supportedBy;
  report.upvotes = (report.upvotes || 0) + 1;

  report.priorityScore = (report.priorityScore || 50) + 5;
  if (report.priorityScore > 100) report.priorityScore = 100;

  if (report.priorityScore >= 90) {
    report.priority = 'CRITICA';
  } else if (report.priorityScore >= 70) {
    report.priority = 'ALTA';
  } else if (report.priorityScore >= 40) {
    report.priority = 'MEDIA';
  } else {
    report.priority = 'BAJA';
  }

  reports[index] = report;
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
  return report;
}
