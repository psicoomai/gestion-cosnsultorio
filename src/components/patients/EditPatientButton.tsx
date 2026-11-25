"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { PatientForm } from "@/components/patients/PatientForm";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import type { Patient } from "@/lib/types";

/** Editar los datos del paciente o eliminarlo junto con sus sesiones y pagos. */
export function EditPatientButton({ patient }: { patient: Patient }) {
  const { updatePatient, deletePatient, sessions, payments } = useClinicData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { id, ...current } = patient;
  const sessionCount = sessions.filter((s) => s.patientId === id).length;
  const paymentCount = payments.filter((p) => p.patientId === id).length;

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Editar paciente
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Editar paciente"
        description="Cambiar la tarifa solo aplica a sesiones nuevas: las sesiones pasadas conservan su costo."
        widthClassName="max-w-2xl"
      >
        <PatientForm
          initial={current}
          submitLabel="Guardar cambios"
          onCancel={() => setOpen(false)}
          onSubmit={(input) => {
            updatePatient(id, input);
            setOpen(false);
          }}
        />
        <div className="mt-6 border-t border-dark/10 pt-4">
          <button
            type="button"
            className="text-sm text-dark/60 hover:text-dark"
            onClick={() => {
              setOpen(false);
              setConfirmDelete(true);
            }}
          >
            Eliminar paciente…
          </button>
        </div>
      </Modal>
      <ConfirmModal
        open={confirmDelete}
        title={`¿Eliminar a ${patient.name}?`}
        message={`Se eliminarán también sus ${sessionCount} sesiones y ${paymentCount} pagos, y dejarán de contar en todos los totales. No se puede deshacer (salvo que tengas un respaldo).`}
        confirmLabel="Eliminar paciente"
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deletePatient(id);
          router.push("/pacientes");
        }}
      />
    </>
  );
}
