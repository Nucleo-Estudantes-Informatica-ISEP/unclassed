'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/lib/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/lib/components/ui/card';
import { Switch } from '@/lib/components/ui/switch';
import { Label } from '@/lib/components/ui/label';
import { Alert, AlertDescription } from '@/lib/components/ui/alert';
import { Separator } from '@/lib/components/ui/separator';
import { CheckCircle2, Mail, Settings, User, Bell } from 'lucide-react';
import { toast } from 'sonner';

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

export function ProfileClient({ user: initialUser, preferences: initialPreferences }: ProfileClientProps) {
  const router = useRouter();
  const [preferences, setPreferences] = useState<UserPreferences>(initialPreferences);
  const [isSaving, setIsSaving] = useState(false);

  const handlePreferenceChange = async (
    preferenceType: 'emailNotifications' | 'sharePhoneOnMatch',
    value: boolean
  ) => {
    setIsSaving(true);
    try {
      const updateData = { [preferenceType]: value };
      
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok) {
        setPreferences(prev => ({ ...prev, [preferenceType]: value }));
        toast.success('Preferências atualizadas com sucesso!');
      } else {
        toast.error(data.error || 'Erro ao atualizar preferências');
      }
    } catch (error) {
      toast.error('Erro de conexão. Tenta novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhoneSave = async () => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: preferences.phone }),
      });

      const data = await response.json();

      if (response.ok) {
        setPreferences((prev) => ({ ...prev, phone: data.user.phone }));
        toast.success('Telemóvel atualizado com sucesso!');
      } else {
        toast.error(data.error || 'Erro ao atualizar telemóvel');
      }
    } catch (error) {
      toast.error('Erro de conexão. Tenta novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-card rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                <User className="h-8 w-8 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Perfil de Utilizador</h1>
                <p className="text-muted-foreground">Gere as tuas definições e preferências</p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-foreground">Nome</Label>
                  <p className="mt-1 text-sm text-foreground">{initialUser.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-foreground">Email</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-sm text-foreground">{initialUser.email}</p>
                    {preferences.emailVerified ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Mail className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-foreground">Tipo de Conta</Label>
                  <p className="mt-1 text-sm text-foreground">
                    {initialUser.role === 'ADMIN' ? 'Administrador' : 'Utilizador'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-foreground">Telemóvel</Label>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="tel"
                      value={preferences.phone ?? ''}
                      onChange={(event) =>
                        setPreferences((prev) => ({
                          ...prev,
                          phone: event.target.value,
                        }))
                      }
                      placeholder="912345678"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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

              {!preferences.emailVerified && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <Mail className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    A verificação do email é gerida pelo sistema central de autenticação.
                    Atualiza o estado da tua conta no ZITADEL se precisares de acesso total.
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
                  <Label className="text-base font-medium">Notificações por Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Recebe emails quando encontramos matches para as tuas solicitações de troca
                  </p>
                </div>
                <Switch
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
                  disabled={isSaving || !preferences.emailVerified}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Partilhar Número de Telemóvel</Label>
                  <p className="text-sm text-muted-foreground">
                    Permite que outros estudantes vejam o teu número de telemóvel quando há um match aceite
                  </p>
                </div>
                <Switch
                  checked={preferences.sharePhoneOnMatch}
                  onCheckedChange={(checked) => handlePreferenceChange('sharePhoneOnMatch', checked)}
                  disabled={isSaving}
                />
              </div>

              {!preferences.emailVerified && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Para receber notificações por email, primeiro tens de verificar o teu endereço de email.
                  </AlertDescription>
                </Alert>
              )}

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium text-foreground">Tipos de Notificações</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
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
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="flex-1"
                >
                  Voltar ao Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/matches')}
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
