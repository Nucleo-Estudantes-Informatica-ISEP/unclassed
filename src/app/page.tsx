import getServerSession from "@/services/getServerSession";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/lib/components/ui/button";

const Home: React.FC = async () => {
  const session = await getServerSession();

  // Redirect authenticated users to dashboard
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white">
            Bem-vindo ao <span className="text-primary">Unclassed</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl">
            A plataforma que simplifica o processo de permutas de turma nos cursos de Informática do ISEP.
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mt-2">
            <span>🎓</span>
            <span>Uma iniciativa do</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">NEI-ISEP</span>
            <span>•</span>
            <span>Instituto Superior de Engenharia do Porto</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto">
                 Login
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Registar
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl">
          <div className="text-center p-6">
            <div className="text-4xl mb-4">🔄</div>
            <h3 className="text-lg font-semibold mb-2">Permutas Simples</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Troca de turma para disciplinas específicas de forma rápida e fácil.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-lg font-semibold mb-2">Permutas Completas</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Muda todas as disciplinas para uma nova turma de uma só vez.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold mb-2">Matches Inteligentes</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Sistema automático que encontra as melhores permutas para ti.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
