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
  profileCompleted?: boolean;
  /** Lege array = volledige organisatie */
  scopeCampuses?: { id: string; name: string }[];
}

export interface UserInvitation {
  id: string;
  email: string;
  suggestedRole: UserRole;
  /** Lege array = volledige organisatie */
  scopeCampuses?: { id: string; name: string }[];
  invitedBy: { id: string; displayName: string; email: string };
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
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
  requestedBy: { id: string; displayName: string; email: string; avatarUrl?: string | null };
  assignedToId?: string | null;
  assignedTo?: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl?: string | null;
    role?: UserRole;
  } | null;
  campus: { name: string };
  building?: { id: string; name: string; code?: string | null };
  department?: { id: string; name: string; code?: string | null };
  room?: { id: string; name?: string | null; number?: string | null };
  location?: { name: string };
  category?: { name: string };
  /** v1.7 — koppeling aan project (N:1 via WorkRequest.projectId). */
  project?: { id: string; name: string; projectNumber: string; status?: ProjectStatus } | null;
  /** v1.7 — taken die uit deze werkaanvraag voortkomen. */
  tasks?: Task[];
  priority: Priority;
  status: WorkRequestStatus;
  progress: number;
  deadline?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  rejectionReason?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { comments: number; attachments: number; tasks?: number };
}

export interface TechnicalStaffMember {
  id: string;
  displayName: string;
  email: string;
  department?: string | null;
  role: UserRole;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: { displayName: string; email: string; avatarUrl?: string };
}

// Task types
export type TaskStatus = 'OPEN' | 'IN_UITVOERING' | 'AFGEWERKT' | 'ON_HOLD';

export interface Task {
  id: string;
  taskNumber: string;
  title: string;
  description?: string | null;
  assignedTo?: { id?: string; displayName: string; avatarUrl?: string | null } | null;
  createdBy?: { id?: string; displayName: string };
  project?: { id?: string; name: string; projectNumber: string } | null;
  workRequest?: { id: string; title: string; requestNumber: string } | null;
  category?: { id?: string; name: string; color?: string | null } | null;
  priority: Priority;
  status: TaskStatus;
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  estimatedHours?: number | null;
  createdAt: string;
  _count?: { logs?: number; comments?: number; attachments?: number };
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
  description?: string | null;
  campus?: { id?: string; name: string } | null;
  manager?: {
    id?: string;
    displayName: string;
    email?: string;
    avatarUrl?: string | null;
    role?: UserRole;
  } | null;
  createdBy?: { id?: string; displayName: string; email?: string };
  status: ProjectStatus;
  budgetEstimate?: number | null;
  budgetApproved?: number | null;
  budgetSpent: number;
  /** v1.7 — projectdeadline */
  deadline?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  completedAt?: string | null;
  createdAt: string;
  attachments?: Attachment[];
  workRequests?: WorkRequest[];
  tasks?: Task[];
  _count?: { tasks: number; purchases: number; workRequests?: number };
}

export interface Attachment {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  workRequestId?: string | null;
  taskId?: string | null;
  projectId?: string | null;
  createdAt: string;
}

export interface ProjectLeadCandidate {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  department?: string | null;
  avatarUrl?: string | null;
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
