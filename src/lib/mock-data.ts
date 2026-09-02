// Datos de ejemplo para poblar la interfaz. No hay backend conectado todavía;
// esta es la forma de los datos que se espera consumir en el futuro.

export type SessionStatus = "pagada" | "parcial" | "pendiente";

export type Session = {
  id: string;
  patientId: string;
  patientName: string;
  date: string; // ISO
  amount: number;
  paidAmount: number;
  status: SessionStatus;
};

export type Patient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  activeSince: string; // ISO
  sessionsCount: number;
  totalGenerated: number;
  totalCollected: number;
};

export const patients: Patient[] = [
  {
    id: "p1",
    name: "María Fernanda Ortega",
    email: "mf.ortega@example.com",
    phone: "55 1234 5678",
    activeSince: "2024-02-10",
    sessionsCount: 24,
    totalGenerated: 24000,
    totalCollected: 24000,
  },
  {
    id: "p2",
    name: "Diego Salas Herrera",
    email: "diego.salas@example.com",
    phone: "55 8765 4321",
    activeSince: "2024-06-03",
    sessionsCount: 12,
    totalGenerated: 12000,
    totalCollected: 8000,
  },
  {
    id: "p3",
    name: "Renata Cabrera",
    email: "renata.cabrera@example.com",
    phone: "55 2468 1357",
    activeSince: "2023-11-21",
    sessionsCount: 36,
    totalGenerated: 36000,
    totalCollected: 33000,
  },
  {
    id: "p4",
    name: "Emilio Torres Vega",
    email: "emilio.torres@example.com",
    phone: "55 9182 7364",
    activeSince: "2025-01-15",
    sessionsCount: 6,
    totalGenerated: 6000,
    totalCollected: 2000,
  },
  {
    id: "p5",
    name: "Paola Jiménez",
    email: "paola.jimenez@example.com",
    phone: "55 3456 7891",
    activeSince: "2024-09-08",
    sessionsCount: 18,
    totalGenerated: 18000,
    totalCollected: 18000,
  },
  {
    id: "p6",
    name: "Héctor Ramírez",
    email: "hector.ramirez@example.com",
    phone: "55 6789 1234",
    activeSince: "2025-03-02",
    sessionsCount: 4,
    totalGenerated: 4000,
    totalCollected: 0,
  },
];

export const sessions: Session[] = [
  { id: "s1", patientId: "p2", patientName: "Diego Salas Herrera", date: "2026-08-26", amount: 1000, paidAmount: 1000, status: "pagada" },
  { id: "s2", patientId: "p2", patientName: "Diego Salas Herrera", date: "2026-08-19", amount: 1000, paidAmount: 500, status: "parcial" },
  { id: "s3", patientId: "p2", patientName: "Diego Salas Herrera", date: "2026-08-12", amount: 1000, paidAmount: 0, status: "pendiente" },
  { id: "s4", patientId: "p3", patientName: "Renata Cabrera", date: "2026-08-27", amount: 1000, paidAmount: 1000, status: "pagada" },
  { id: "s5", patientId: "p3", patientName: "Renata Cabrera", date: "2026-08-20", amount: 1000, paidAmount: 0, status: "pendiente" },
  { id: "s6", patientId: "p4", patientName: "Emilio Torres Vega", date: "2026-08-25", amount: 1000, paidAmount: 0, status: "pendiente" },
  { id: "s7", patientId: "p4", patientName: "Emilio Torres Vega", date: "2026-08-18", amount: 1000, paidAmount: 1000, status: "pagada" },
  { id: "s8", patientId: "p1", patientName: "María Fernanda Ortega", date: "2026-08-28", amount: 1000, paidAmount: 1000, status: "pagada" },
  { id: "s9", patientId: "p5", patientName: "Paola Jiménez", date: "2026-08-24", amount: 1000, paidAmount: 1000, status: "pagada" },
  { id: "s10", patientId: "p6", patientName: "Héctor Ramírez", date: "2026-08-29", amount: 1000, paidAmount: 0, status: "pendiente" },
  { id: "s11", patientId: "p6", patientName: "Héctor Ramírez", date: "2026-08-22", amount: 1000, paidAmount: 0, status: "pendiente" },
];

export function pendingBalance(patient: Patient): number {
  return Math.max(0, patient.totalGenerated - patient.totalCollected);
}

export const monthlyRevenue = [
  { month: "Mar", generado: 58000, cobrado: 54000 },
  { month: "Abr", generado: 61000, cobrado: 55000 },
  { month: "May", generado: 64000, cobrado: 60000 },
  { month: "Jun", generado: 67000, cobrado: 59000 },
  { month: "Jul", generado: 71000, cobrado: 66000 },
  { month: "Ago", generado: 74000, cobrado: 63000 },
];
