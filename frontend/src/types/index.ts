// User types
export type UserRole =
  | 'MEDEWERKER'
  | 'TECHNISCHE_DIENST'
  | 'DIENSTHOOFD'
  | 'FACILITAIR_MANAGER'
  | 'ADMIN';

export interface User {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  jobTitle?: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  lastLoginAt?: string;
}

// Work Request types
export type WorkRequestStatus =
  | 'INGEDIEND'
  | 'IN_BEHANDELING'
  | 'GOEDGEKEURD'
  | 'AFGEWERKT'
  | 'GEWEIGERD';

export type Priority = 'LAAG' | 'NORMAAL' | 'HOOG' | 'URGENT';

export interface WorkRequest {
  id: string;
  requestNumber: string;
  title: string;
  description: string;
  requestedBy: { displayName: string; email: string };
  campus: { name: string };
  location?: { name: string };
  category?: { name: string };
  priority: Priority;
  status: WorkRequestStatus;
  progress: number;
  rejectionReason?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { comments: number; attachments: number };
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: { displayName: string; email: string; avatarUrl?: string };
}

export interface TimeEntry {
  id: string;
  workRequestId: string;
  userId: string;
  startedAt: string;
  endedAt?: string | null;
  durationMinutes?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { displayName: string; email?: string; avatarUrl?: string };
}

// Task types
export type TaskStatus = 'OPEN' | 'IN_UITVOERING' | 'AFGEWERKT' | 'ON_HOLD';

export interface Task {
  id: string;
  taskNumber: string;
  title: string;
  description?: string;
  assignedTo?: { displayName: string; avatarUrl?: string };
  createdBy: { displayName: string };
  project?: { name: string; projectNumber: string };
  category?: { name: string };
  priority: Priority;
  status: TaskStatus;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  createdAt: string;
  _count?: { logs: number; comments: number };
}

export interface TaskLog {
  id: string;
  description: string;
  hoursWorked?: number;
  logDate: string;
  user: { displayName: string };
}

// Project types
export type ProjectStatus =
  | 'PLANNING'
  | 'ACTIEF'
  | 'ON_HOLD'
  | 'AFGEROND'
  | 'GEANNULEERD';

export interface Project {
  id: string;
  projectNumber: string;
  name: string;
  description?: string;
  campus?: { name: string };
  manager?: { displayName: string; avatarUrl?: string };
  status: ProjectStatus;
  budgetEstimate?: number;
  budgetApproved?: number;
  budgetSpent: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  _count?: { tasks: number; purchases: number };
}

// Purchase types
export type PurchaseStatus =
  | 'AANGEVRAAGD'
  | 'WACHT_OP_GOEDKEURING'
  | 'GOEDGEKEURD_DIENSTHOOFD'
  | 'GOEDGEKEURD'
  | 'AFGEWEZEN'
  | 'BESTELD'
  | 'GELEVERD';

export type PurchaseType = 'KLEIN' | 'GROOT';

export interface PurchaseRequest {
  id: string;
  purchaseNumber: string;
  title: string;
  description?: string;
  requestedBy: { displayName: string };
  type: PurchaseType;
  status: PurchaseStatus;
  estimatedCost: number;
  actualCost?: number;
  supplier?: string;
  project?: { name: string; projectNumber: string };
  task?: { title: string; taskNumber: string };
  createdAt: string;
}

// Notification types
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

// Campus & Location
export interface Campus {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
}

export interface Location {
  id: string;
  campusId: string;
  name: string;
  building?: string;
  floor?: string;
  room?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  children?: Category[];
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DashboardOverview {
  workRequests: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
  };
  tasks: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
  };
  projects: { active: number };
  purchases: { pendingApproval: number };
}
