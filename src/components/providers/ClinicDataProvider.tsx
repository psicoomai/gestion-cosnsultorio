"use client";

// Estado de la app. Los datos se cargan del almacenamiento al abrir la app y
// se guardan solos después de cada cambio. El almacenamiento es la cuenta del
// usuario en el servidor (src/lib/api-store.ts) o, en la versión de prueba,
// el propio navegador (src/lib/storage.ts); las pantallas no distinguen.
//
// Todas las operaciones que borran algo limpian también sus referencias
// (borrar un paciente borra sus sesiones y pagos; borrar una sesión la quita
// de los pagos que la cubrían) para que nunca queden datos huérfanos que
// descuadren los totales.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ConflictError } from "@/lib/api-store";
import { generateId } from "@/lib/id";
import { initialPatients, initialPayments, initialSessions } from "@/lib/mock-data";
import {
  SNAPSHOT_VERSION,
  createBrowserStore,
  type ClinicData,
  type ClinicSnapshot,
  type ClinicStore,
} from "@/lib/storage";
import type { Patient, Payment, Profile, Session, Vacation } from "@/lib/types";

export type NewPatientInput = Omit<Patient, "id">;

export type NewSessionInput = Omit<Session, "id">;

export type NewPaymentInput = Omit<Payment, "id" | "createdAt">;

type SaveState = "idle" | "saving" | "saved" | "error" | "conflict";

interface ClinicDataContextValue {
  /** `false` mientras se leen los datos guardados; las pantallas muestran un estado de carga. */
  hydrated: boolean;
  saveState: SaveState;
  /** Dónde viven los datos: en la cuenta (servidor) o solo en este navegador. */
  storage: "cuenta" | "navegador";
  /** Nombre y especialidad de la cuenta, para prellenar la bienvenida. */
  suggestedProfile: Profile | null;
  profile: Profile | null;
  patients: Patient[];
  sessions: Session[];
  payments: Payment[];
  vacations: Vacation[];
  setProfile: (profile: Profile) => void;
  addVacation: (input: Omit<Vacation, "id">) => Vacation;
  deleteVacation: (id: string) => void;
  addPatient: (input: NewPatientInput) => Patient;
  updatePatient: (id: string, patch: Partial<NewPatientInput>) => void;
  /** Borra al paciente junto con todas sus sesiones y pagos. */
  deletePatient: (id: string) => void;
  /** Crea UNA sesión puntual. Nunca se dispara automáticamente por la frecuencia. */
  addSession: (input: NewSessionInput) => Session;
  /** Crea varias sesiones a la vez (p. ej. todas las del mes). */
  addSessions: (inputs: NewSessionInput[]) => Session[];
  updateSession: (id: string, patch: Partial<Omit<Session, "id" | "patientId">>) => void;
  /** Borra la sesión y la quita de los pagos que la cubrían. */
  deleteSession: (id: string) => void;
  registerPayment: (input: NewPaymentInput) => Payment;
  updatePayment: (id: string, patch: Partial<Omit<Payment, "id" | "patientId" | "createdAt">>) => void;
  deletePayment: (id: string) => void;
  /** Adjunta una imagen de comprobante a un pago YA existente — nunca crea un pago nuevo. */
  attachReceiptToPayment: (paymentId: string, receiptImageUrl: string) => void;
  findPossibleDuplicates: (candidate: {
    patientId: string;
    amount: number;
    date: string;
    reference?: string;
  }) => Payment[];
  /** Sustituye todos los datos (importación, restaurar respaldo, datos de ejemplo). */
  replaceData: (data: ClinicData) => void;
  loadExampleData: () => void;
  /** Borra todo, incluido el perfil. */
  resetAll: () => Promise<void>;
  exportSnapshot: () => ClinicSnapshot;
}

const ClinicDataContext = createContext<ClinicDataContextValue | null>(null);

const SAVE_DELAY_MS = 250;

export function ClinicDataProvider({
  children,
  store: providedStore,
  suggestedProfile = null,
}: {
  children: ReactNode;
  store?: ClinicStore;
  suggestedProfile?: Profile | null;
}) {
  const storeRef = useRef<ClinicStore | null>(providedStore ?? null);
  const storage = providedStore ? "cuenta" : "navegador";
  // Los guardados van en fila: cada uno espera al anterior, así la versión
  // que se manda al servidor siempre es la más reciente.
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  // Solo se guarda si la carga inicial terminó bien: si falló, guardar el
  // estado vacío borraría lo que la persona tenía guardado.
  const canSave = useRef(false);
  // La primera pasada tras cargar solo refleja lo que ya estaba guardado: no se vuelve a guardar.
  const justLoaded = useRef(true);

  useEffect(() => {
    const store = (storeRef.current ??= createBrowserStore());
    let cancelled = false;
    store
      .load()
      .then((snapshot) => {
        if (cancelled) return;
        canSave.current = true;
        if (!snapshot) return;
        setProfileState(snapshot.profile);
        setPatients(snapshot.patients);
        setSessions(snapshot.sessions);
        setPayments(snapshot.payments);
        setVacations(snapshot.vacations ?? []);
      })
      .catch(() => setSaveState("error"))
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !canSave.current) return;
    if (justLoaded.current) {
      justLoaded.current = false;
      return;
    }
    setSaveState("saving");
    const snapshot: ClinicSnapshot = {
      version: SNAPSHOT_VERSION,
      profile,
      patients,
      sessions,
      payments,
      vacations,
      updatedAt: new Date().toISOString(),
    };
    const timer = setTimeout(() => {
      saveChain.current = saveChain.current
        .then(() => (canSave.current ? storeRef.current?.save(snapshot) : undefined))
        .then(() => setSaveState((s) => (s === "conflict" ? s : "saved")))
        .catch((err) => {
          if (err instanceof ConflictError) {
            // Otro dispositivo guardó antes: no se sobrescribe nada.
            canSave.current = false;
            setSaveState("conflict");
          } else {
            setSaveState("error");
          }
        });
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hydrated, profile, patients, sessions, payments, vacations]);

  const replaceData = useCallback((data: ClinicData) => {
    setPatients(data.patients);
    setSessions(data.sessions);
    setPayments(data.payments);
    if (data.vacations) setVacations(data.vacations);
  }, []);

  const value = useMemo<ClinicDataContextValue>(
    () => ({
      hydrated,
      saveState,
      storage,
      suggestedProfile,
      profile,
      patients,
      sessions,
      payments,
      vacations,
      setProfile(next) {
        setProfileState(next);
      },
      addVacation(input) {
        const vacation: Vacation = { id: generateId("vac"), ...input };
        setVacations((prev) => [...prev, vacation].sort((a, b) => a.start.localeCompare(b.start)));
        return vacation;
      },
      deleteVacation(id) {
        setVacations((prev) => prev.filter((v) => v.id !== id));
      },
      addPatient(input) {
        const patient: Patient = { id: generateId("p"), ...input };
        setPatients((prev) => [...prev, patient]);
        return patient;
      },
      updatePatient(id, patch) {
        setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      },
      deletePatient(id) {
        setPatients((prev) => prev.filter((p) => p.id !== id));
        setSessions((prev) => prev.filter((s) => s.patientId !== id));
        setPayments((prev) => prev.filter((p) => p.patientId !== id));
      },
      addSession(input) {
        const session: Session = { id: generateId("s"), ...input };
        setSessions((prev) => [...prev, session]);
        return session;
      },
      addSessions(inputs) {
        const created = inputs.map((input) => ({ id: generateId("s"), ...input }));
        setSessions((prev) => [...prev, ...created]);
        return created;
      },
      updateSession(id, patch) {
        setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      },
      deleteSession(id) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        setPayments((prev) =>
          prev.map((p) =>
            p.sessionIds.includes(id) ? { ...p, sessionIds: p.sessionIds.filter((sid) => sid !== id) } : p
          )
        );
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
      updatePayment(id, patch) {
        setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      },
      deletePayment(id) {
        setPayments((prev) => prev.filter((p) => p.id !== id));
      },
      attachReceiptToPayment(paymentId, receiptImageUrl) {
        setPayments((prev) =>
          prev.map((p) => (p.id === paymentId ? { ...p, receiptImageUrl } : p))
        );
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
      replaceData,
      loadExampleData() {
        replaceData({ patients: initialPatients, sessions: initialSessions, payments: initialPayments, vacations: [] });
      },
      async resetAll() {
        await storeRef.current?.clear();
        setProfileState(null);
        replaceData({ patients: [], sessions: [], payments: [], vacations: [] });
      },
      exportSnapshot() {
        return {
          version: SNAPSHOT_VERSION,
          profile,
          patients,
          sessions,
          payments,
          vacations,
          updatedAt: new Date().toISOString(),
        };
      },
    }),
    [hydrated, saveState, storage, suggestedProfile, profile, patients, sessions, payments, vacations, replaceData]
  );

  return <ClinicDataContext.Provider value={value}>{children}</ClinicDataContext.Provider>;
}

export function useClinicData(): ClinicDataContextValue {
  const ctx = useContext(ClinicDataContext);
  if (!ctx) throw new Error("useClinicData debe usarse dentro de ClinicDataProvider");
  return ctx;
}
