import { Badge } from "@/lib/components/ui/badge";
import { Card, CardContent } from "@/lib/components/ui/card";
import React from 'react';

const sections = [
  {
    title: "1. Introdução",
    body: "A presente Política de Privacidade tem por objetivo informar os utilizadores sobre a forma como a plataforma Unclassed recolhe, trata e protege os dados pessoais dos seus utilizadores, em conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD) e demais legislação aplicável.",
  },
  {
    title: "2. Responsável pelo Tratamento",
    body: "O responsável pelo tratamento dos dados pessoais é o Núcleo de Estudantes de Informática do Instituto Superior de Engenharia do Porto (NEI-ISEP), com sede no Instituto Superior de Engenharia do Porto.",
  },
  {
    title: "3. Dados Pessoais Recolhidos",
    body: (
      <>
        <p>Para o funcionamento da plataforma, recolhemos os seguintes dados pessoais:</p>
        <ul className="mt-3 space-y-2 list-disc list-inside">
          <li>Nome completo</li>
          <li>Endereço de email</li>
          <li>Número de telemóvel</li>
          <li>Informações académicas (curso, turmas)</li>
          <li>Preferências de partilha de contactos</li>
        </ul>
      </>
    ),
  },
  {
    title: "4. Finalidades do Tratamento",
    body: (
      <>
        <p>Os dados pessoais são tratados para as seguintes finalidades:</p>
        <ul className="mt-3 space-y-2 list-disc list-inside">
          <li>Criação e gestão de conta de utilizador</li>
          <li>Facilitação de permutas de turmas entre estudantes</li>
          <li>Comunicação entre utilizadores quando existe um match</li>
          <li>Melhoramento do serviço prestado pela plataforma</li>
          <li>Cumprimento de obrigações legais</li>
        </ul>
      </>
    ),
  },
  {
    title: "5. Base Legal",
    body: "O tratamento dos dados pessoais baseia-se no consentimento dos utilizadores, na execução de um contrato e no interesse legítimo do responsável pelo tratamento em fornecer os serviços da plataforma.",
  },
  {
    title: "6. Partilha de Dados",
    body: "Os dados pessoais apenas são partilhados com outros utilizadores quando existe um match e mediante o consentimento explícito do utilizador através das opções de partilha configuradas no perfil.",
  },
  {
    title: "7. Direitos dos Utilizadores",
    body: (
      <>
        <p>Os utilizadores têm os seguintes direitos:</p>
        <ul className="mt-3 space-y-2 list-disc list-inside">
          <li>Direito de acesso aos dados pessoais</li>
          <li>Direito de retificação de dados incorretos</li>
          <li>Direito de apagamento dos dados</li>
          <li>Direito de limitação do tratamento</li>
          <li>Direito de portabilidade dos dados</li>
          <li>Direito de oposição ao tratamento</li>
          <li>Direito de retirar o consentimento</li>
        </ul>
      </>
    ),
  },
  {
    title: "8. Segurança dos Dados",
    body: "Implementamos medidas técnicas e organizacionais adequadas para proteger os dados pessoais contra acesso não autorizado, alteração, divulgação ou destruição não autorizada.",
  },
  {
    title: "9. Prazo de Conservação",
    body: "Os dados pessoais são conservados pelo tempo necessário para as finalidades para as quais foram recolhidos, ou conforme exigido por lei.",
  },
  {
    title: "10. Contactos",
    body: (
      <>
        Para exercer os seus direitos ou esclarecer dúvidas sobre esta Política de Privacidade, pode contactar-nos através do email{" "}
        <a
          className="text-primary font-medium hover:underline"
          href="mailto:info@nei-isep.org"
        >
          info@nei-isep.org
        </a>
        .
      </>
    ),
  }
];

const PrivacyPolicy: React.FC = () => {
  return (
    <section className="container mx-auto py-10 md:py-14 w-full max-w-3xl px-4">
      <div className="mb-10">
        <Badge variant="soft" className="mb-3">
          Privacidade
        </Badge>
        <h1 className="text-balance text-3xl md:text-4xl font-bold tracking-tight">
          Política de <span className="gradient-text">Privacidade</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Como recolhemos, tratamos e protegemos os teus dados na plataforma{" "}
          <span className="text-primary">Unclassed</span>.
        </p>
      </div>

      <Card className="shadow-md">
        <CardContent className="p-6 md:p-8 space-y-6 text-sm md:text-base leading-relaxed">
          {sections.map((section) => (
            <article key={section.title}>
              <h2 className="font-bold text-primary text-lg mb-2">
                {section.title}
              </h2>
              <div className="text-foreground/90">{section.body}</div>
            </article>
          ))}
        </CardContent>
      </Card>
    </section>
  );
};

export default PrivacyPolicy;