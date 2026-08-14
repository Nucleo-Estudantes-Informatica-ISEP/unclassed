import type { WizardStep } from "@/components/ui/step-wizard";

export type RequestType = "single" | "bundle";

const typeStep: WizardStep = {
  id: "type",
  label: "Tipo",
  title: "Que tipo de permuta pretendes?",
  description:
    "Escolhe se queres mudar de turma numa disciplina ou em todas as disciplinas do ano.",
};

const preferenceStep: WizardStep = {
  id: "preferences",
  label: "Preferências",
  title: "Ordena as turmas que preferes",
  description:
    "Seleciona uma ou mais turmas. A ordem indica ao sistema quais deve priorizar.",
};

const matchStep: WizardStep = {
  id: "match",
  label: "Match",
  title: "Revê o teu match",
  description:
    "Confirma os detalhes da permuta encontrada, incluindo todos os participantes da cadeia.",
};

const contactStep: WizardStep = {
  id: "contact",
  label: "Contacto",
  title: "Contacto e próximos passos",
  description:
    "Consulta os contactos dos outros participantes e fala com o teu departamento para finalizar a troca.",
};

const detailSteps: Record<RequestType, WizardStep> = {
  single: {
    id: "single-details",
    label: "Disciplina",
    title: "Indica a disciplina e a turma atual",
    description:
      "Escolhe o ano, a disciplina e a turma onde estás inscrito atualmente.",
  },
  bundle: {
    id: "bundle-details",
    label: "Turma atual",
    title: "Indica a tua turma atual",
    description:
      "Escolhe o ano e a turma que pretendes trocar em todas as disciplinas.",
  },
};

const pendingDetailStep: WizardStep = {
  id: "details",
  label: "Detalhes",
  title: "Indica os detalhes do pedido",
  description: "O próximo passo adapta-se ao tipo de permuta escolhido.",
};

export function getRequestWizardSteps(
  requestType: RequestType | null
): WizardStep[] {
  return [
    typeStep,
    requestType ? detailSteps[requestType] : pendingDetailStep,
    preferenceStep,
    matchStep,
    contactStep,
  ];
}
