"use client";

// Estado del "backend" en memoria. Todavía no hay servidor ni base de datos:
// los datos parten de la semilla en mock-data.ts y viven en el navegador
// mientras dura la sesión (se pierden al recargar). Cuando exista un backend
// real, addPatient/registerPayment son los puntos donde se conecta.

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { generateId } from "@/lib/id";
import { initialPatients, initialPayments, initialSessions } from "@/lib/mock-data";
import type { Patient, Payment, Session } from "@/lib/types";

export type NewPatientInput = Omit<Patient, "id">;

export type NewPaymentInput = Omit<Payment, "id" | "createdAt">;

interface ClinicDataContextValue {
  patients: Patient[];
  sessions: Session[];
  payments: Payment[];
  addPatient: (input: NewPatientInput) => Patient;
  registerPayment: (input: NewPaymentInput) => Payment;
  findPossibleDuplicates: (candidate: {
    patientId: string;
    amount: number;
    date: string;
    reference?: string;
  }) => Payment[];
}

const ClinicDataContext = createContext<ClinicDataContextValue | null>(null);

export function ClinicDataProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [sessions] = useState<Session[]>(initialSessions);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);

  const value = useMemo<ClinicDataContextValue>(
    () => ({
      patients,
      sessions,
      payments,
      addPatient(input) {
        const patient: Patient = { id: generateId("p"), ...input };
        setPatients((prev) => [...prev, patient]);
        return patient;
      },
      registerPayment(input) {
        const payment: Payment = {
          id: generateId("pay"),
          createdAt: new Date().toISOString(),
          ...input,
        };
        setPayments((prev) => [...prev, payment]);
        return payment;
      },
      findPossibleDuplicates(candidate) {
        return payments.filter((existing) => {
          if (existing.patientId !== candidate.patientId) return false;
          const sameDate = existing.date === candidate.date;
          const sameAmount = Math.abs(existing.amount - candidate.amount) < 1;
          const sameReference =
            !!candidate.reference && !!existing.reference && existing.reference === candidate.reference;
          return (sameDate && sameAmount) || sameReference;
        });
      },
    }),
    [patients, sessions, payments]
  );

  return <ClinicDataContext.Provider value={value}>{children}</ClinicDataContext.Provider>;
}

export function useClinicData(): ClinicDataContextValue {
  const ctx = useContext(ClinicDataContext);
  if (!ctx) throw new Error("useClinicData debe usarse dentro de ClinicDataProvider");
  return ctx;
}
