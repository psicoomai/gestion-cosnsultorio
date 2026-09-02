"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PatientForm } from "@/components/patients/PatientForm";
import { useClinicData } from "@/components/providers/ClinicDataProvider";

export function AddPatientButton() {
  const [open, setOpen] = useState(false);
  const { addPatient } = useClinicData();
  const router = useRouter();

  return (
    <>
      <Button onClick={() => setOpen(true)}>Agregar paciente</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Agregar paciente"
        description="La frecuencia y el costo definidos aquí no generan sesiones ni cargos automáticamente."
        widthClassName="max-w-2xl"
      >
        <PatientForm
          onCancel={() => setOpen(false)}
          onSubmit={(input) => {
            const patient = addPatient(input);
            setOpen(false);
            router.push(`/pacientes/${patient.id}`);
          }}
        />
      </Modal>
    </>
  );
}
