import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="container mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Política de Privacidade</h1>
      
      <div className="prose prose-gray dark:prose-invert max-w-none text-justify space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Introdução</h2>
          <p>
            A presente Política de Privacidade tem por objetivo informar os utilizadores sobre a forma como a plataforma Unclassed recolhe, 
            trata e protege os dados pessoais dos seus utilizadores, em conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD) 
            e demais legislação aplicável.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Responsável pelo Tratamento</h2>
          <p>
            O responsável pelo tratamento dos dados pessoais é o Núcleo de Estudantes de Informática do Instituto Superior de Engenharia 
            do Porto (NEI-ISEP), com sede no Instituto Superior de Engenharia do Porto.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Dados Pessoais Recolhidos</h2>
          <p>Para o funcionamento da plataforma, recolhemos os seguintes dados pessoais:</p>
          <ul className="list-disc pl-6 mt-2">
            <li>Nome completo</li>
            <li>Endereço de email</li>
            <li>Número de telemóvel</li>
            <li>Informações académicas (curso, turmas)</li>
            <li>Preferências de partilha de contactos</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Finalidades do Tratamento</h2>
          <p>Os dados pessoais são tratados para as seguintes finalidades:</p>
          <ul className="list-disc pl-6 mt-2">
            <li>Criação e gestão de conta de utilizador</li>
            <li>Facilitação de permutas de turmas entre estudantes</li>
            <li>Comunicação entre utilizadores quando existe um match</li>
            <li>Melhoramento do serviço prestado pela plataforma</li>
            <li>Cumprimento de obrigações legais</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Base Legal</h2>
          <p>
            O tratamento dos dados pessoais baseia-se no consentimento dos utilizadores, na execução de um contrato e no interesse legítimo 
            do responsável pelo tratamento em fornecer os serviços da plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Partilha de Dados</h2>
          <p>
            Os dados pessoais apenas são partilhados com outros utilizadores quando existe um match e mediante o consentimento explícito 
            do utilizador através das opções de partilha configuradas no perfil.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Direitos dos Utilizadores</h2>
          <p>Os utilizadores têm os seguintes direitos:</p>
          <ul className="list-disc pl-6 mt-2">
            <li>Direito de acesso aos dados pessoais</li>
            <li>Direito de retificação de dados incorretos</li>
            <li>Direito de apagamento dos dados</li>
            <li>Direito de limitação do tratamento</li>
            <li>Direito de portabilidade dos dados</li>
            <li>Direito de oposição ao tratamento</li>
            <li>Direito de retirar o consentimento</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Segurança dos Dados</h2>
          <p>
            Implementamos medidas técnicas e organizacionais adequadas para proteger os dados pessoais contra acesso não autorizado, 
            alteração, divulgação ou destruição não autorizada.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Prazo de Conservação</h2>
          <p>
            Os dados pessoais são conservados pelo tempo necessário para as finalidades para as quais foram recolhidos, ou conforme 
            exigido por lei.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">10. Contactos</h2>
          <p>
            Para exercer os seus direitos ou esclarecer dúvidas sobre esta Política de Privacidade, pode contactar-nos através do 
            email fornecido na plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">11. Alterações</h2>
          <p>
            Esta Política de Privacidade pode ser atualizada periodicamente. As alterações serão comunicadas através da plataforma.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;