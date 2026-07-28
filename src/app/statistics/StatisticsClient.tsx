"use client";

import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#1BB0D9", "#ef4444", "#22c55e"];

// Types for API response slices we use
type PopularRow = { id: string; name: string; count: number };
type DemandSupplyRow = { id: string; name: string; demand: number; supply: number; ratio: number | null };

type DashboardStatsData = {
  popularInto: PopularRow[];
  popularLeave: PopularRow[];
  demandSupply: DemandSupplyRow[];
};

function useThemeHsl(name: string): string {
  const [value, setValue] = useState<string>(`hsl(var(--${name}))`);
  useEffect(() => {
    const update = () => {
      const root = document.documentElement;
      const raw = getComputedStyle(root).getPropertyValue(`--${name}`).trim();
      if (raw) setValue(`hsl(${raw})`);
    };
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      obs.disconnect();
    };
  }, [name]);
  return value;
}

export default function DashboardStats() {
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Theme-aware colors
  const axisColor = useThemeHsl("muted-foreground");
  const tooltipBg = useThemeHsl("card");
  const tooltipText = useThemeHsl("card-foreground");

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/dashboard/stats");
        if (!res.ok) throw new Error("Falha ao carregar estatísticas");
        const data = (await res.json()) as DashboardStatsData;
        setStats(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg || "Falha ao carregar estatísticas");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Formatter without any
  const tooltipFormatter = (val: unknown): [string, string] => {
    const n = typeof val === "number" ? val : Number(val);
    const safe = Number.isFinite(n) ? n : 0;
    return [`${safe} pedidos`, "Pedidos"];
  };

  return (
    <div className="w-full bg-background py-8">
      <div className="container mx-auto px-4 sm:px-10 space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Estatísticas da Comunidade</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Vê quais as turmas mais e menos procuradas no ISEP.
          </p>
        </div>

        {loading && (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        )}
        
        {error && <div className="text-sm text-destructive py-4">Erro: {error}</div>}
        
        {!loading && !error && stats && (
          <div className="space-y-12 mt-8">
            {/* Classes mais populares para entrar */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Turmas mais procuradas para entrar</h3>
                <p className="text-sm text-muted-foreground">Turmas de destino mais desejadas nas permutas.</p>
              </div>
              <div className="h-[300px] w-full rounded-lg border bg-card p-4 shadow-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.popularInto}>
                    <CartesianGrid stroke={axisColor} strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke={axisColor} tick={{ fill: axisColor }} />
                    <YAxis allowDecimals={false} stroke={axisColor} tick={{ fill: axisColor }} />
                    <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${axisColor}`, color: tooltipText }} formatter={tooltipFormatter} />
                    <Bar dataKey="count" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Classes mais populares para sair */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Turmas mais procuradas para sair</h3>
                <p className="text-sm text-muted-foreground">Turmas de origem mais frequentes nas permutas.</p>
              </div>
              <div className="h-[300px] w-full rounded-lg border bg-card p-4 shadow-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.popularLeave}>
                    <CartesianGrid stroke={axisColor} strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke={axisColor} tick={{ fill: axisColor }} />
                    <YAxis allowDecimals={false} stroke={axisColor} tick={{ fill: axisColor }} />
                    <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${axisColor}`, color: tooltipText }} formatter={tooltipFormatter} />
                    <Bar dataKey="count" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Procura vs Oferta */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Procura vs Oferta (Top 10)</h3>
                <p className="text-sm text-muted-foreground">Rácio de alunos que querem entrar vs. sair de cada turma (Rácio alto = concorrência alta).</p>
              </div>
              <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 font-medium">Turma</th>
                      <th className="px-4 py-3 font-medium">Procura</th>
                      <th className="px-4 py-3 font-medium">Oferta</th>
                      <th className="px-4 py-3 font-medium">Rácio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {stats.demandSupply.map((row: DemandSupplyRow) => (
                      <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{row.name}</td>
                        <td className="px-4 py-3 font-semibold" style={{ color: COLORS[0] }}>{row.demand}</td>
                        <td className="px-4 py-3 font-semibold" style={{ color: COLORS[2] }}>{row.supply}</td>
                        <td className="px-4 py-3">
                          <span className="bg-background px-2 py-1 rounded border shadow-sm">
                            {row.ratio !== null ? row.ratio.toFixed(2) : "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
