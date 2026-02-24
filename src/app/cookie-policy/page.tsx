import React from 'react';

const CookiePolicy: React.FC = () => {
  return (
    <div className="container mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Política de Cookies</h1>
      
      <div className="prose prose-gray dark:prose-invert max-w-none text-justify space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. O que são Cookies</h2>
          <p>
            Os cookies são pequenos ficheiros de texto que são armazenados no seu dispositivo quando visita um website. 
            Estes ficheiros permitem que o website reconheça o seu dispositivo e armazene algumas informações sobre as suas 
            preferências ou ações passadas.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Como Utilizamos os Cookies</h2>
          <p>
            A plataforma Unclassed utiliza cookies para melhorar a experiência do utilizador e garantir o funcionamento adequado 
            dos serviços. Os cookies que utilizamos servem para:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Manter a sessão do utilizador ativa</li>
            <li>Recordar as preferências de tema (modo claro/escuro)</li>
            <li>Garantir a segurança da plataforma</li>
            <li>Melhorar o desempenho do website</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Tipos de Cookies Utilizados</h2>
          
          <h3 className="text-xl font-medium mb-2">3.1 Cookies Essenciais</h3>
          <p>
            Estes cookies são necessários para o funcionamento básico da plataforma e não podem ser desativados. 
            Incluem cookies de autenticação e segurança.
          </p>

          <h3 className="text-xl font-medium mb-2 mt-4">3.2 Cookies de Preferências</h3>
          <p>
            Estes cookies permitem que a plataforma recorde as suas preferências, como o tema escolhido (modo claro ou escuro).
          </p>

          <h3 className="text-xl font-medium mb-2 mt-4">3.3 Cookies de Funcionalidade</h3>
          <p>
            Estes cookies permitem funcionalidades melhoradas e personalização, como recordar informações que introduziu 
            em formulários.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Duração dos Cookies</h2>
          <p>Utilizamos dois tipos de cookies em termos de duração:</p>
          <ul className="list-disc pl-6 mt-2">
            <li><strong>Cookies de Sessão:</strong> São temporários e eliminados quando fecha o navegador</li>
            <li><strong>Cookies Persistentes:</strong> Permanecem no seu dispositivo por um período determinado ou até serem eliminados manualmente</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Gestão de Cookies</h2>
          <p>
            Pode gerir ou eliminar cookies conforme desejar. Pode eliminar todos os cookies que já estão no seu computador e 
            configurar a maioria dos navegadores para impedir que sejam colocados.
          </p>
          
          <h3 className="text-xl font-medium mb-2 mt-4">5.1 Configuração do Navegador</h3>
          <p>A maioria dos navegadores permite:</p>
          <ul className="list-disc pl-6 mt-2">
            <li>Ver que cookies estão armazenados e eliminá-los individualmente</li>
            <li>Bloquear cookies de terceiros</li>
            <li>Bloquear cookies de sites específicos</li>
            <li>Bloquear todos os cookies</li>
            <li>Eliminar todos os cookies quando fechar o navegador</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Impacto da Desativação de Cookies</h2>
          <p>
            Se optar por desativar os cookies, algumas funcionalidades da plataforma podem não funcionar corretamente. 
            Em particular, não conseguirá manter a sessão ativa e terá de fazer login repetidamente.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Cookies de Terceiros</h2>
          <p>
            A plataforma Unclassed não utiliza cookies de terceiros para análise ou publicidade. Todos os cookies utilizados 
            são próprios e necessários para o funcionamento da plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Alterações a Esta Política</h2>
          <p>
            Esta Política de Cookies pode ser atualizada periodicamente para refletir alterações na nossa utilização de cookies 
            ou por outros motivos operacionais, legais ou regulamentares.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Contacto</h2>
          <p>
            Se tiver questões sobre a nossa utilização de cookies, pode contactar-nos através dos meios de contacto disponíveis 
            na plataforma.
          </p>
        </section>

        <section className="text-sm text-gray-600 dark:text-gray-400 mt-8">
          <p>
            <strong>Última atualização:</strong> Setembro de 2025
          </p>
        </section>
      </div>
    </div>
  );
};

export default CookiePolicy;