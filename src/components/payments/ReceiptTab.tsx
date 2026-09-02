"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { DuplicateWarning } from "@/components/payments/DuplicateWarning";
import { SessionPicker } from "@/components/payments/SessionPicker";
import { hasUnpaidSessions } from "@/lib/metrics";
import { matchPatientsByText } from "@/lib/name-match";
import { simulateReceiptExtraction } from "@/lib/mock-ocr";
import { cn } from "@/lib/cn";

type Step = "upload" | "extracting" | "review";

export function ReceiptTab({
  patientIdLocked,
  onDone,
  onCancel,
}: {
  patientIdLocked?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { patients, sessions, payments, registerPayment, findPossibleDuplicates } = useClinicData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [receiptDataUrl, setReceiptDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [reference, setReference] = useState("");
  const [bank, setBank] = useState("");

  const [nameQuery, setNameQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState(patientIdLocked ?? "");
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const patient = patients.find((p) => p.id === selectedPatientId);
  const suggestions = useMemo(
    () => (patientIdLocked ? [] : matchPatientsByText(nameQuery, patients)).slice(0, 4),
    [nameQuery, patients, patientIdLocked]
  );

  const duplicates = useMemo(() => {
    const amountNum = Number(amount);
    if (!selectedPatientId || !date || !Number.isFinite(amountNum) || amountNum <= 0) return [];
    return findPossibleDuplicates({
      patientId: selectedPatientId,
      amount: amountNum,
      date,
      reference: reference || undefined,
    });
  }, [selectedPatientId, amount, date, reference, findPossibleDuplicates]);

  async function handleFile(file: File) {
    setFileName(file.name);
    setPreviewUrl(URL.createObjectURL(file));
    setStep("extracting");

    const dataUrlPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.readAsDataURL(file);
    });

    const [extracted] = await Promise.all([
      simulateReceiptExtraction(),
      dataUrlPromise.then(setReceiptDataUrl),
    ]);
    setAmount(String(extracted.amount));
    setDate(extracted.date);
    setReference(extracted.reference ?? "");
    setBank(extracted.bank ?? "");
    setStep("review");
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleConfirm() {
    const amountNum = Number(amount);
    if (!selectedPatientId) {
      setError("Confirma a qué paciente corresponde este pago.");
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("El monto extraído no es válido — corrígelo antes de continuar.");
      return;
    }
    if (!date) {
      setError("Ingresa la fecha del pago.");
      return;
    }
    if (sessionIds.length === 0 && hasUnpaidSessions(selectedPatientId, sessions, payments)) {
      setError("Selecciona a qué sesión(es) pendientes corresponde este pago.");
      return;
    }
    setError(null);
    registerPayment({
      patientId: selectedPatientId,
      amount: amountNum,
      date,
      reference: reference || undefined,
      method: undefined,
      bank: bank || undefined,
      sessionIds,
      source: "comprobante",
      receiptImageUrl: receiptDataUrl ?? undefined,
    });
    onDone();
  }

  if (step === "upload") {
    return (
      <div className="flex flex-col gap-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-14 text-center transition-colors",
            isDragging ? "border-blue-accent bg-blue-accent/[0.05]" : "border-dark/20 hover:border-dark/35"
          )}
        >
          <p className="font-serif text-lg text-dark">Arrastra o selecciona un comprobante</p>
          <p className="text-sm text-dark/55">Imagen (JPG, PNG) de una transferencia, depósito o captura de pago.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  if (step === "extracting") {
    return (
      <div className="flex flex-col items-center gap-4 py-14 text-center">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={fileName ?? "Comprobante"} className="h-32 rounded border border-dark/10 object-cover" />
        ) : null}
        <p className="text-sm text-dark/60">Extrayendo datos del comprobante…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-md border border-dark/10 p-3">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={fileName ?? "Comprobante"} className="h-16 w-16 shrink-0 rounded object-cover" />
        ) : null}
        <div>
          <p className="text-sm font-medium text-dark">{fileName}</p>
          <p className="text-xs text-dark/45">
            Extracción automática (simulada) — revisa y corrige los datos antes de registrar.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Monto extraído" required>
          <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </FormField>
        <FormField label="Fecha extraída" required>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Referencia extraída">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} />
        </FormField>
        <FormField label="Banco / plataforma">
          <Input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Sin identificar" />
        </FormField>
      </div>

      {patientIdLocked ? null : (
        <FormField
          label="¿A qué paciente corresponde?"
          hint='Escribe una instrucción como "este pago es de Majo" o selecciona directamente. Nunca se asume solo.'
          required
        >
          <Input
            value={nameQuery}
            onChange={(e) => {
              setNameQuery(e.target.value);
              setSelectedPatientId("");
            }}
            placeholder="Este pago es de…"
          />
          {suggestions.length > 0 && !selectedPatientId ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPatientId(p.id);
                    setNameQuery(p.name);
                  }}
                  className="rounded-sm border border-blue-accent/40 bg-blue-accent/10 px-2 py-1 text-xs text-dark hover:bg-blue-accent/20"
                >
                  ¿{p.name}?
                </button>
              ))}
            </div>
          ) : null}
          <div className="mt-2">
            <Select value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)}>
              <option value="">…o selecciona manualmente</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        </FormField>
      )}

      {selectedPatientId ? (
        <FormField label="Aplicar a sesión(es)" hint="Elige a qué sesiones pendientes corresponde.">
          <SessionPicker
            patientId={selectedPatientId}
            sessions={sessions}
            payments={payments}
            currency={patient?.currency ?? "MXN"}
            selected={sessionIds}
            onChange={setSessionIds}
          />
        </FormField>
      ) : null}

      <DuplicateWarning matches={duplicates} currency={patient?.currency ?? "MXN"} />

      {error ? <p className="text-sm text-orange-accent">{error}</p> : null}

      <div className="mt-2 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleConfirm}>{duplicates.length > 0 ? "Registrar de todas formas" : "Registrar pago"}</Button>
      </div>
    </div>
  );
}
