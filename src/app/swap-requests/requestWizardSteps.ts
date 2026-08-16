import type { WizardStep } from "@/components/ui/step-wizard";

export type RequestType = "single" | "bundle";

const typeStep: WizardStep = {
  id: "type",
  label: "Tipo",
  title: "Que tipo de permuta pretendes?",
  description:
    "Escolhe se queres mudar de turma numa disciplina ou em todas as disciplinas do ano.",
  guidance:
    "Escolhe permuta individual se só precisas de mudar uma disciplina. Se pretendes mudar de turma em todas as disciplinas do mesmo ano, escolhe permuta completa.",
};

const preferenceStep: WizardStep = {
  id: "preferences",
  label: "Preferências",
  title: "Ordena as turmas que preferes",
  description:
    "Seleciona uma ou mais turmas. A ordem indica ao sistema quais deve priorizar.",
  guidance:
    "Adiciona todas as turmas para as quais aceitarias mudar. Se a ordem importar, coloca primeiro as preferidas; quanto mais opções deres, maior a hipótese de o sistema encontrar uma permuta compatível.",
};

const matchStep: WizardStep = {
  id: "match",
  label: "Match",
  title: "Revê o teu match",
  description:
    "Confirma os detalhes da permuta encontrada, incluindo todos os participantes da cadeia.",
  guidance:
    "Quando existir uma permuta compatível, revê os participantes e a troca proposta antes de decidir. A permuta só avança quando forem dadas as confirmações necessárias.",
};

const contactStep: WizardStep = {
  id: "contact",
  label: "Contacto",
  title: "Contacto e próximos passos",
  description:
    "Consulta os contactos dos outros participantes e fala com o teu departamento para finalizar a troca.",
  guidance:
    "Os contactos ficam disponíveis depois da aceitação. Usa-os para combinar os próximos passos com os restantes participantes e confirma a alteração pelos canais oficiais do departamento.",
};

const detailSteps: Record<RequestType, WizardStep> = {
  single: {
    id: "single-details",
    label: "Disciplina",
    title: "Indica a disciplina e a turma atual",
    description:
      "Escolhe o ano, a disciplina e a turma onde estás inscrito atualmente.",
    guidance:
      "Seleciona primeiro o ano. Depois escolhe a disciplina e a turma onde estás agora; estes dados definem quais os pedidos que podem ser compatíveis com o teu.",
  },
  bundle: {
    id: "bundle-details",
    label: "Turma atual",
    title: "Indica a tua turma atual",
    description:
      "Escolhe o ano e a turma que pretendes trocar em todas as disciplinas.",
    guidance:
      "Escolhe o teu ano e a turma atual. O sistema vai procurar uma troca completa para outra turma desse mesmo ano, mantendo o pedido agrupado para todas as disciplinas.",
  },
};

const pendingDetailStep: WizardStep = {
  id: "details",
  label: "Detalhes",
  title: "Indica os detalhes do pedido",
  description: "O próximo passo adapta-se ao tipo de permuta escolhido.",
  guidance:
    "Depois de escolheres o tipo de permuta, este passo adapta-se automaticamente aos dados necessários para uma permuta individual ou completa.",
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
