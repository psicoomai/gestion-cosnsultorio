"use client";

import { useState, type FormEvent } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { answerQuery } from "@/lib/ai-query";
import { cn } from "@/lib/cn";

/**
 * Módulo discreto de consulta en lenguaje natural. No es un chatbot
 * permanente: es una barra compacta que, al enviar una pregunta, se
 * expande para mostrar la respuesta y puede volver a cerrarse. La
 * respuesta siempre viene de src/lib/ai-query.ts, que calcula desde datos
 * reales — nunca inventa una cifra.
 */
export function AiQuery() {
  const { patients, sessions, payments } = useClinicData();
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<{ question: string; answer: string; matched: boolean } | null>(
    null
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    const r = answerQuery(question, patients, sessions, payments);
    setResult({ question, answer: r.answer, matched: r.matchedIntent });
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wideish text-dark/55">Consultas IA</p>
        <form onSubmit={handleSubmit}>
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Pregunta sobre tus datos..."
            className="h-9 text-sm"
          />
        </form>

        {result ? (
          <div className="mt-3 rounded border border-dark/10 bg-dark/[0.03] p-3 text-sm">
            <p className="text-xs text-dark/45">{result.question}</p>
            <p className={cn("mt-1 whitespace-pre-line", result.matched ? "text-dark" : "text-dark/60")}>
              {result.answer}
            </p>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setQuestion("");
              }}
              className="mt-2 text-xs text-blue-accent"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <p className="mt-2 text-xs text-dark/40">
            Ej. &quot;¿Cuánto me debe Ana?&quot;, &quot;¿Quién me debe?&quot;
          </p>
        )}
      </CardContent>
    </Card>
  );
}
