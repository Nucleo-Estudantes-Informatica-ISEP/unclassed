import getServerSession from "@/services/getServerSession";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { MatchListClient } from "@/components/MatchListClient";
import { RefreshButton } from "@/components/RefreshButton";

export default async function MatchesPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  // Get user's matches with enriched participant data
  const allMatches = await prisma.match.findMany({
    where: {
      status: {
        not: "REJECTED" // Don't show rejected matches
      }
    },
    orderBy: [
      { isProvisional: 'desc' }, // Provisional matches first
      { createdAt: 'desc' }
    ]
  });
  
  // Filter matches where user is a participant
  const userMatches = allMatches.filter(match => {
    const participants = match.participants as Array<{userId: string, fromClass: string, toClass: string}>;
    return participants.some(p => p.userId === session.id);
  });
  
  // Enrich matches with user and class information
  const matches = await Promise.all(
    userMatches.map(async (match) => {
      const participants = match.participants as any[];
      
      // Get user information for participants
      const userIds = participants.map(p => p.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true }
      });
      
      // Get class information
      const classIds = [
        ...participants.map(p => p.fromClass),
        ...participants.map(p => p.toClass)
      ];
      const classes = await prisma.class.findMany({
        where: { id: { in: classIds } },
        select: { id: true, name: true, year: true }
      });
      
      // Get subject information for single swaps
      let subject = null;
      if (match.matchType === 'SINGLE' && match.singleSwapRequestIds.length > 0) {
        const swapRequest = await prisma.singleSwapRequest.findFirst({
          where: { id: { in: match.singleSwapRequestIds } },
          include: { subject: true }
        });
        subject = swapRequest?.subject;
      }
      
      const enrichedParticipants = participants.map(p => {
        const user = users.find(u => u.id === p.userId);
        const fromClass = classes.find(c => c.id === p.fromClass);
        const toClass = classes.find(c => c.id === p.toClass);
        
        return {
          ...p,
          user,
          fromClass,
          toClass
        };
      });
      
      return {
        ...match,
        participants: enrichedParticipants,
        subject
      };
    })
  );

  // Separate matches by status
  const activeMatches = matches.filter(m => 
    ['PROPOSED', 'PROVISIONAL', 'ACCEPTED'].includes(m.status)
  );
  
  const completedMatches = matches.filter(m => 
    m.status === 'COMPLETED'
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Os Seus Matches</h1>
            <p className="text-gray-600 mt-2">
              Gira os seus matches de permuta e acompanha o progresso
            </p>
          </div>
          <RefreshButton />
        </div>
      </div>

      {activeMatches.length === 0 && completedMatches.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">Ainda não há matches</h3>
          <p className="text-gray-600 mb-4">
            Crie alguns pedidos de permuta para começar a receber matches!
          </p>
          <a 
            href="/swap-requests" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Criar Pedido de Permuta
          </a>
        </div>
      ) : (
        <>
          {/* Active Matches */}
          {activeMatches.length > 0 && (
              <MatchListClient
                matches={activeMatches.map((match) => ({
                  ...match,
                  satisfactionScore: match.satisfactionScore ?? 0,
                  subject: match.subject || undefined,
                  createdAt: match.createdAt.toISOString(),
                  updatedAt: match.updatedAt.toISOString(),
                  provisionalUntil: match.provisionalUntil?.toISOString() || null
                }))}
              currentUserId={session.id}
              title="Matches Ativos"
              emptyMessage="Nenhum match ativo"
              iconEmoji="⚡"
              badgeColor="blue"
            />
          )}

          {/* Completed Matches */}
          {completedMatches.length > 0 && (
            <>
              {activeMatches.length > 0 && <div className="border-t border-gray-200 my-8"></div>}
              <MatchListClient
                matches={completedMatches.map((match) => ({
                  ...match,
                  satisfactionScore: match.satisfactionScore ?? 0,
                  subject: match.subject || undefined,
                  createdAt: match.createdAt.toISOString(),
                  updatedAt: match.updatedAt.toISOString(),
                  provisionalUntil: match.provisionalUntil?.toISOString() || null
                }))}
                currentUserId={session.id}
                title="Matches Completos"
                emptyMessage="Nenhum match completo"
                iconEmoji="🎉"
                badgeColor="green"
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
