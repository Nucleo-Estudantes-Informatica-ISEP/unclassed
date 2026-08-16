import { Info, Mail, Phone } from "lucide-react";

import type { MatchUser } from "@/types/match";

interface MatchContactInfoProps {
  user: MatchUser;
}

export function MatchContactInfo({ user }: MatchContactInfoProps) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1">
        <Info className="w-3 h-3" /> Contacto:
      </p>
      <div className="space-y-1 break-words">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Mail className="w-3 h-3 shrink-0" /> {user.email}
        </p>
        {user.phone ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Phone className="w-3 h-3 shrink-0" /> {user.phone}
          </p>
        ) : user.sharePhoneOnMatch === false ? (
          <p className="text-xs text-muted-foreground italic flex items-center gap-1">
            <Phone className="w-3 h-3 shrink-0 opacity-50" /> Telemóvel não
            partilhado
          </p>
        ) : null}
      </div>
    </div>
  );
}
