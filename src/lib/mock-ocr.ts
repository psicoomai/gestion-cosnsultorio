// Extracción de comprobantes SIMULADA para esta demo: no hay ningún
// servicio real de OCR/visión conectado en este repositorio. Antes de usar
// esto en producción, sustituir `simulateReceiptExtraction` por una llamada
// real (por ejemplo, un endpoint que use un modelo de visión) que reciba la
// imagen y devuelva la misma forma de datos.
//
// El resultado SIEMPRE se presenta como una vista previa editable — nunca
// se registra un pago automáticamente a partir de esta extracción.

export interface ExtractedReceipt {
  amount: number;
  date: string; // ISO yyyy-mm-dd
  reference?: string;
  bank?: string;
}

const MOCK_BANKS = ["BBVA", "Santander", "Banorte", "Mercado Pago"];
const MOCK_AMOUNTS = [500, 800, 1000, 2000];

export function simulateReceiptExtraction(): Promise<ExtractedReceipt> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        amount: MOCK_AMOUNTS[Math.floor(Math.random() * MOCK_AMOUNTS.length)],
        date: new Date().toISOString().slice(0, 10),
        reference: `REF-${Math.floor(1000 + Math.random() * 9000)}`,
        bank: MOCK_BANKS[Math.floor(Math.random() * MOCK_BANKS.length)],
      });
    }, 1100);
  });
}
