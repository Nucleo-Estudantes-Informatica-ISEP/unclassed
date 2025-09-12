import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer bg-[#CFCFCF] text-[#101010] dark:bg-[#101010] dark:text-[#CFCFCF]">
      {/* Info band */}
      <div className="border-t border-[#101010]/[0.17] dark:border-white/10">
        <div className="container mx-auto px-4 py-6">
          <p className="mx-auto max-w-[1066px] text-center text-xs md:text-sm text-[#101010]/40 dark:text-white/40">
A Unclassed é uma plataforma desenvolvida pelo NEI-ISEP para te ajudar a encontrar matches e trocar de turma. Para suporte ou esclarecimento de dúvidas técnicas, entra em contacto através do e-mail info@nei-isep.org.          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#101010]/[0.17] dark:border-white/10">
        <div className="container mx-auto flex items-center justify-between px-4 py-8">
          <div className="flex items-center gap-3">
            <Image
              src="/images/unclassed-black.svg"
              alt="Unclassed"
              width={166}
              height={34}
              className="h-[34px] w-auto dark:hidden"
            />
            <Image
              src="/images/unclassed-white.svg"
              alt="Unclassed"
              width={166}
              height={34}
              className="h-[34px] w-auto hidden dark:block"
            />
          </div>
          <div className="text-right">
            <div className="text-sm mb-1">
              V1.0 Copyright © {new Date().getFullYear()}. All rights reserved to NEI-ISEP
            </div>
            <div className="flex justify-end gap-4 text-xs text-[#101010]/60 dark:text-white/60">
              <Link href="/privacy-policy" className="hover:text-[#101010] dark:hover:text-white transition-colors">
                Política de Privacidade
              </Link>
              <span>•</span>
              <Link href="/cookie-policy" className="hover:text-[#101010] dark:hover:text-white transition-colors">
                Política de Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
