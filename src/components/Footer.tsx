import { Mail, ExternalLink, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand/About */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-white">Unclassed</span>
              <span className="text-sm bg-blue-600 text-white px-2 py-1 rounded">ISEP</span>
            </div>
            <p className="text-sm text-gray-400">
              Plataforma para simplificar o processo de permutas de turma nos cursos de Informática do ISEP.
            </p>
            <div className="flex items-center space-x-1 text-sm text-gray-400">
              <span>Feito com</span>
              <Heart className="h-4 w-4 text-red-500 fill-current" />
              <span>pelo</span>
              <a
                href="https://nei-isep.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center space-x-1"
              >
                <span className="font-semibold">NEI-ISEP</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Suporte</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm">
                <Mail className="h-4 w-4 text-blue-400" />
                <a
                  href="mailto:info@nei-isep.org"
                  className="text-blue-400 hover:text-blue-300"
                >
                  info@nei-isep.org
                </a>
              </div>
              <div className="text-sm text-gray-400">
                <p>📧 Problemas técnicos ou dúvidas?</p>
                <p>Entre em contacto connosco!</p>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Links Úteis</h3>
            <div className="space-y-2 text-sm">
              <div>
                <a
                  href="https://nei-isep.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white flex items-center space-x-1"
                >
                  <span>NEI-ISEP</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-400">
              <p>© {new Date().getFullYear()} Unclassed. Todos os direitos reservados.</p>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>Versão 1.0</span>
              <span>•</span>
              <span>NEI-ISEP</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
