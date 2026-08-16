export interface MatchNotificationData {
  userName: string;
  matchType: string;
  subjects: string[];
  fromClass: string;
  toClass: string;
  otherParticipants: string[];
  matchId: string;
  dashboardUrl: string;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character
  );
}

export function getMatchNotificationTemplate(
  data: MatchNotificationData,
  year = new Date().getFullYear()
): string {
  const subjects = data.subjects.map(escapeHtml).join(", ");
  const participants = data.otherParticipants.map(escapeHtml).join(", ");
  const matchesUrl = `${data.dashboardUrl.replace(/\/$/, "")}/matches`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #ffffff; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
          .header { background: #059669; color: #ffffff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f0fdf4; padding: 30px; border: 1px solid #dcfce7; border-top: none; color: #333333; }
          .match-details { background: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669; color: #333333; }
          .button { display: inline-block; background: #059669; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; font-size: 14px; color: #6b7280; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 15px 0; color: #333333; }
          h1, h2, h3, p, strong { color: #333333; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>🎯 Match Encontrado!</h1><p>Nova troca disponível</p></div>
          <div class="content">
            <h2>Olá ${escapeHtml(data.userName)}!</h2>
            <p>Ótimas notícias! Encontramos um match para a tua solicitação de troca:</p>
            <div class="match-details">
              <h3>📋 Detalhes da Troca</h3>
              <p><strong>Tipo:</strong> ${escapeHtml(data.matchType)}</p>
              ${subjects ? `<p><strong>Disciplinas:</strong> ${subjects}</p>` : ""}
              <p><strong>Da turma:</strong> ${escapeHtml(data.fromClass)}</p>
              <p><strong>Para a turma:</strong> ${escapeHtml(data.toClass)}</p>
              <p><strong>Outros participantes:</strong> ${participants}</p>
            </div>
            <div class="warning"><p><strong>⏰ Ação Necessária!</strong></p><p>Por favor, revisa e aceita esta troca o mais rápido possível. Outros estudantes estão à espera da tua resposta.</p></div>
            <p style="text-align: center;"><a href="${escapeHtml(matchesUrl)}" class="button">Ver Match</a></p>
          </div>
          <div class="footer"><p>© ${year} Unclassed - NEI-ISEP</p></div>
        </div>
      </body>
    </html>
  `;
}

export function getMatchStatusUpdateTemplate({
  userName,
  status,
  details,
  matchesUrl,
}: {
  userName: string;
  status: string;
  details: string;
  matchesUrl: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Atualização do teu Match</h2>
      <p>Olá ${escapeHtml(userName)},</p>
      <p>O estado do teu match foi atualizado:</p>
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Estado:</strong> ${escapeHtml(status)}</p>
        <p><strong>Detalhes:</strong> ${escapeHtml(details)}</p>
      </div>
      <p><a href="${escapeHtml(matchesUrl)}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver Matches</a></p>
    </div>
  `;
}
