import { Info } from "lucide-react";

export function MatchCompletionNotice() {
  return (
    <div
      className="border-amber-500/30 bg-amber-500/5 rounded-lg border p-4"
      role="note"
      aria-label="Informação importante sobre o match"
    >
      <div className="flex gap-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div className="space-y-1">
          <p className="text-sm font-semibold">Um match não conclui a troca</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            O match serve para encontrar e colocar em contacto alunos com uma
            permuta compatível. Depois do match e do respetivo contacto, é
            necessário agendar uma reunião com o DEI para completar e
            formalizar o pedido de troca.
          </p>
        </div>
      </div>
    </div>
  );
}
