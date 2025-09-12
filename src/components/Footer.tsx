import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-[#101010] text-[#CFCFCF]">
      {/* Info band */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-6">
          <p className="mx-auto max-w-[1066px] text-center text-sm md:text-base text-white/40">
            A UNCLASSED é uma plataforma desenvolvida pelo NEI-ISEP para simplificar o processo de permutas de turma nos cursos de Informática do Instituto Superior de Engenharia do Porto, construída especificamente de acordo com os métodos de funcionamento da Licenciatura em Engenharia Informática. Para suporte ou esclarecimento de dúvidas técnicas, pode entrar em contacto através do e-mail info@nei-isep.org.
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto flex items-center justify-between px-4 py-8">
          <div className="flex items-center gap-3">
            <Image
              src="/images/unclassed-white.svg"
              alt="UNCLASSED"
              width={166}
              height={34}
              className="h-[34px] w-auto"
            />
          </div>
          <div className="text-right text-sm">
            V1.0 Copyright © {new Date().getFullYear()}. All rights reserved to NEI-ISEP
          </div>
        </div>
      </div>
    </footer>
  );
}
