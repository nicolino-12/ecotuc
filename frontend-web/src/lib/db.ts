/**
 * EcoTuc Local Database (localStorage)
 * 
 * Proporciona persistencia de datos entre sesiones y cambios de rol.
 * Cuando un ciudadano crea un reporte, se guarda en localStorage
 * y el operador puede verlo al iniciar sesión.
 */

const STORAGE_KEYS = {
  REPORTS: 'ecotuc_reports',
  CREWS: 'ecotuc_crews',
  USERS: 'ecotuc_users',
  DB_VERSION: 'ecotuc_db_version',
} as const;

const CURRENT_DB_VERSION = '4';

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
  citizenEmail?: string;
  citizenName?: string;
  upvotes?: number;
  supportedBy?: string[];
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

// ===== DATOS INICIALES (SEED) =====

const AVATAR_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#6366f1',
];

const SEED_USERS: RegisteredUser[] = [
  {
    id: 'usr_operator_1',
    fullName: 'Juan Pérez',
    email: 'operador@ecotuc.gov.ar',
    password: 'password123',
    phone: '381-4001234',
    address: 'Municipalidad de Tucumán, Calle 24 de Septiembre 431',
    role: 'OPERATOR',
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    avatarColor: '#10b981',
  },
  {
    id: 'usr_citizen_1',
    fullName: 'María González',
    email: 'ciudadano1@gmail.com',
    password: 'password123',
    phone: '381-5551234',
    address: 'Av. Mate de Luna 2500, San Miguel de Tucumán',
    role: 'CITIZEN',
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    avatarColor: '#3b82f6',
  },
  {
    id: 'usr_citizen_2',
    fullName: 'Carlos Ruiz',
    email: 'vecino1@gmail.com',
    password: 'password123',
    phone: '381-5559876',
    address: 'Barrio Sur, Tucumán',
    role: 'CITIZEN',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    avatarColor: '#8b5cf6',
  },
];

const SEED_REPORTS: Report[] = [];

const SEED_CREWS: Crew[] = [
  {
    id: 'c1',
    name: 'Cuadrilla Norte - Camión 01',
    vehiclePlate: 'AF-123-JK',
    status: 'ACTIVA',
    latitude: -26.812354,
    longitude: -65.215286,
    members: [
      { fullName: 'Pedro Gómez', role: 'CHOFER' },
      { fullName: 'Luis Maidana', role: 'RECOLECTOR' },
    ],
  },
  {
    id: 'c2',
    name: 'Cuadrilla Sur - Camión 02',
    vehiclePlate: 'AE-987-LM',
    status: 'ACTIVA',
    latitude: -26.839841,
    longitude: -65.228512,
    members: [
      { fullName: 'Marcos Juárez', role: 'CHOFER' },
      { fullName: 'Daniel Albornoz', role: 'RECOLECTOR' },
    ],
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
    // Primera ejecución o nueva versión: poblar con datos semilla
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(SEED_REPORTS));
    localStorage.setItem(STORAGE_KEYS.CREWS, JSON.stringify(SEED_CREWS));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
    localStorage.setItem(STORAGE_KEYS.DB_VERSION, CURRENT_DB_VERSION);
  }
}

// ----- USUARIOS -----

/** Obtiene todos los usuarios registrados */
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

/** Busca un usuario por email */
export function getUserByEmail(email: string): RegisteredUser | null {
  const users = getAllUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

/** Registra un nuevo usuario. Retorna error string o null en caso de éxito. */
export function registerUser(data: {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  role: 'OPERATOR' | 'CITIZEN';
}): { success: boolean; error?: string; user?: RegisteredUser } {
  if (!isClient()) return { success: false, error: 'No disponible en servidor' };

  // Validaciones
  if (!data.fullName.trim()) return { success: false, error: 'El nombre completo es obligatorio' };
  if (!data.email.trim()) return { success: false, error: 'El correo electrónico es obligatorio' };
  if (!data.password || data.password.length < 6) return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
  if (!data.phone.trim()) return { success: false, error: 'El teléfono es obligatorio' };

  // Verificar email único
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

/** Intenta logear un usuario. Retorna la sesión o error. */
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

/** Obtiene la cantidad de usuarios por rol */
export function getUserStats(): { total: number; operators: number; citizens: number } {
  const users = getAllUsers();
  return {
    total: users.length,
    operators: users.filter((u) => u.role === 'OPERATOR').length,
    citizens: users.filter((u) => u.role === 'CITIZEN').length,
  };
}

// ----- REPORTES -----

/** Obtiene todos los reportes, ordenados por fecha (más recientes primero) */
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

/** Obtiene reportes de un ciudadano específico */
export function getReportsByEmail(email: string): Report[] {
  return getAllReports().filter((r) => r.citizenEmail === email);
}

/** Agrega un nuevo reporte */
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

/** Actualiza un reporte existente */
export function updateReport(id: string, updates: Partial<Report>): Report | null {
  const reports = getAllReports();
  const index = reports.findIndex((r) => r.id === id);
  if (index === -1) return null;
  reports[index] = { ...reports[index], ...updates };
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
  return reports[index];
}

/** Elimina un reporte */
export function deleteReport(id: string): boolean {
  const reports = getAllReports();
  const filtered = reports.filter((r) => r.id !== id);
  if (filtered.length === reports.length) return false;
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(filtered));
  return true;
}

/** Obtiene estadísticas de los reportes */
export function getReportStats() {
  const reports = getAllReports();
  const total = reports.length;
  const open = reports.filter((r) =>
    ['PENDIENTE', 'EN_REVISION', 'ASIGNADO', 'EN_PROCESO'].includes(r.status)
  ).length;
  const closed = reports.filter((r) =>
    ['RESUELTO', 'RECHAZADO'].includes(r.status)
  ).length;
  const urgent = reports.filter(
    (r) => ['CRITICA', 'ALTA'].includes(r.priority) && r.status !== 'RESUELTO'
  ).length;
  const crews = getAllCrews();
  const activeCrews = crews.filter((c) => c.status !== 'INACTIVA').length;

  return { total, open, closed, urgent, activeCrews };
}

// ----- CUADRILLAS -----

/** Obtiene todas las cuadrillas */
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

/** Actualiza una cuadrilla */
export function updateCrew(id: string, updates: Partial<Crew>): Crew | null {
  const crews = getAllCrews();
  const index = crews.findIndex((c) => c.id === id);
  if (index === -1) return null;
  crews[index] = { ...crews[index], ...updates };
  localStorage.setItem(STORAGE_KEYS.CREWS, JSON.stringify(crews));
  return crews[index];
}

/** Guarda todos los reportes (para actualización en batch desde componentes) */
export function saveAllReports(reports: Report[]): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
}

/** Guarda todas las cuadrillas (para actualización en batch desde componentes) */
export function saveAllCrews(crews: Crew[]): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEYS.CREWS, JSON.stringify(crews));
}

/** Apoya/vota un reporte de un vecino. Incrementa votos y actualiza prioridad */
export function supportReport(id: string, email: string): Report | null {
  const reports = getAllReports();
  const index = reports.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const report = reports[index];
  const supportedBy = report.supportedBy || [];

  // Evitar duplicación de votos por el mismo email
  if (supportedBy.includes(email.toLowerCase())) return report;

  supportedBy.push(email.toLowerCase());
  report.supportedBy = supportedBy;
  report.upvotes = (report.upvotes || 0) + 1;

  // Modificar prioridad: cada voto incrementa 5 puntos de Score
  report.priorityScore = (report.priorityScore || 50) + 5;
  if (report.priorityScore > 100) report.priorityScore = 100;

  // Recalcular etiqueta de prioridad basada en el nuevo score
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

/** Resetea la base de datos a los datos semilla */
export function resetDB(): void {
  if (!isClient()) return;
  localStorage.removeItem(STORAGE_KEYS.DB_VERSION);
  initDB();
}
