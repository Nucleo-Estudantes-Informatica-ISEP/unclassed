"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, Mail, Settings, User } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/lib/components/ui/alert";
import { Button } from "@/lib/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/lib/components/ui/card";
import { Label } from "@/lib/components/ui/label";
import { Separator } from "@/lib/components/ui/separator";
import { Switch } from "@/lib/components/ui/switch";
import { httpClient, HttpError } from "@/lib/httpClient";
import { navigateToAuthNeiProfile } from "@/lib/navigateToAuthNeiProfile";

interface UserPreferences {
  phone: string | null;
  emailNotifications: boolean;
  emailVerified: boolean;
  sharePhoneOnMatch: boolean;
}

interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ProfileClientProps {
  user: UserSession;
  preferences: UserPreferences;
}

export function ProfileClient({
  user: initialUser,
  preferences: initialPreferences,
}: ProfileClientProps) {
  const router = useRouter();
  const [preferences, setPreferences] =
    useState<UserPreferences>(initialPreferences);
  const [isSaving, setIsSaving] = useState(false);

  const handlePreferenceChange = async (
    preferenceType: "emailNotifications" | "sharePhoneOnMatch",
    value: boolean
  ) => {
    setIsSaving(true);
    try {
      const updateData = { [preferenceType]: value };

      await httpClient.patch("/api/user/preferences", updateData);
      setPreferences((prev) => ({ ...prev, [preferenceType]: value }));
      toast.success("Preferências atualizadas com sucesso!");
    } catch (error) {
      toast.error(
        error instanceof HttpError
          ? error.message
          : "Erro de conexão. Tenta novamente."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhoneSave = async () => {
    setIsSaving(true);

    try {
      const data = await httpClient.patch<{ user: { phone: string | null } }>(
        "/api/user/preferences",
        { phone: preferences.phone }
      );
      setPreferences((prev) => ({ ...prev, phone: data.user.phone }));
      toast.success("Telemóvel atualizado com sucesso!");
    } catch (error) {
      toast.error(
        error instanceof HttpError
          ? error.message
          : "Erro de conexão. Tenta novamente."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-background min-h-screen w-full py-8">
      <div className="container mx-auto px-4 sm:px-10">
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="bg-primary/10 rounded-full p-3">
                <User className="text-primary h-8 w-8" />
              </div>
              <div>
                <h1 className="text-foreground text-2xl font-bold">
                  Perfil de Utilizador
                </h1>
                <p className="text-muted-foreground">
                  Gere as tuas definições e preferências
                </p>
              </div>
            </div>
          </div>

          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Informações Pessoais</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-foreground text-sm font-medium">
                    Nome
                  </Label>
                  <p className="text-foreground mt-1 text-sm">
                    {initialUser.name}
                  </p>
                </div>
                <div>
                  <Label className="text-foreground text-sm font-medium">
                    Email
                  </Label>
                  <div className="mt-1 flex items-center space-x-2">
                    <p className="text-foreground text-sm">
                      {initialUser.email}
                    </p>
                    {preferences.emailVerified ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Mail className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-foreground text-sm font-medium">
                    Tipo de Conta
                  </Label>
                  <p className="text-foreground mt-1 text-sm">
                    {initialUser.role === "ADMIN"
                      ? "Administrador"
                      : "Utilizador"}
                  </p>
                </div>
                <div>
                  <Label className="text-foreground text-sm font-medium">
                    Telemóvel
                  </Label>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="tel"
                      value={preferences.phone ?? ""}
                      onChange={(event) =>
                        setPreferences((prev) => ({
                          ...prev,
                          phone: event.target.value,
                        }))
                      }
                      placeholder="912345678"
                      className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePhoneSave}
                      disabled={isSaving}
                    >
                      Guardar
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border p-4">
                <div>
                  <p className="text-foreground text-sm font-medium">
                    Dados da conta
                  </p>
                  <p className="text-muted-foreground text-sm">
                    O nome, o email e o estado de verificação são geridos pelo
                    AuthNEI.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={navigateToAuthNeiProfile}
                >
                  Gerir conta no AuthNEI
                </Button>
              </div>

              {!preferences.emailVerified && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <Mail className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    A verificação do email é gerida pelo sistema central de
                    autenticação. Atualiza o estado da tua conta no AuthNEI se
                    precisares de acesso total.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Email Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Preferências de Notificações</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">
                    Notificações por Email
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Recebe emails quando encontramos matches para as tuas
                    solicitações de troca
                  </p>
                </div>
                <Switch
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) =>
                    handlePreferenceChange("emailNotifications", checked)
                  }
                  disabled={isSaving || !preferences.emailVerified}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">
                    Partilhar Número de Telemóvel
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Permite que outros estudantes vejam o teu número de
                    telemóvel quando há um match aceite
                  </p>
                </div>
                <Switch
                  checked={preferences.sharePhoneOnMatch}
                  onCheckedChange={(checked) =>
                    handlePreferenceChange("sharePhoneOnMatch", checked)
                  }
                  disabled={isSaving}
                />
              </div>

              {!preferences.emailVerified && (
                <Alert className="border-primary/30 bg-primary/10">
                  <Mail className="text-primary h-4 w-4" />
                  <AlertDescription className="text-primary">
                    Para receber notificações por email, primeiro tens de
                    verificar o teu endereço de email.
                  </AlertDescription>
                </Alert>
              )}

              <Separator />

              <div className="space-y-3">
                <h4 className="text-foreground font-medium">
                  Tipos de Notificações
                </h4>
                <div className="text-muted-foreground space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Novos matches encontrados</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Atualizações de estado dos matches</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Aceitação ou rejeição por outros utilizadores</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Conclusão de trocas</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Ações</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                  className="flex-1"
                >
                  Voltar ao Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/matches")}
                  className="flex-1"
                >
                  Ver Matches
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
