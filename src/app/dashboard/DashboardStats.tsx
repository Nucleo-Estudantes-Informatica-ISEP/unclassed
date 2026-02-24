"use client";

import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#2563eb", "#ef4444", "#22c55e"];

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
    <div className="space-y-8 p-4">
      <h2 className="mb-2 text-xl font-bold">Estatísticas de Pedidos de Troca</h2>
      {loading && <div className="text-sm">A carregar gráficos…</div>}
      {error && <div className="text-sm text-red-600">Erro: {error}</div>}
      {!loading && !error && stats && (
        <div className="space-y-8">
          {/* Classes mais populares para entrar */}
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow">
            <h3 className="mb-2 text-lg font-semibold">Turmas mais procuradas para entrar</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.popularInto}>
                <CartesianGrid stroke={axisColor} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={axisColor} tick={{ fill: axisColor }} />
                <YAxis allowDecimals={false} stroke={axisColor} tick={{ fill: axisColor }} />
                <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${axisColor}`, color: tooltipText }} formatter={tooltipFormatter} />
                <Bar dataKey="count" fill={COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-muted-foreground">Mostra as turmas mais desejadas como destino de troca.</p>
          </div>

          {/* Classes mais populares para sair */}
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow">
            <h3 className="mb-2 text-lg font-semibold">Turmas mais procuradas para sair</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.popularLeave}>
                <CartesianGrid stroke={axisColor} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={axisColor} tick={{ fill: axisColor }} />
                <YAxis allowDecimals={false} stroke={axisColor} tick={{ fill: axisColor }} />
                <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${axisColor}`, color: tooltipText }} formatter={tooltipFormatter} />
                <Bar dataKey="count" fill={COLORS[1]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-muted-foreground">Mostra as turmas que os alunos mais querem abandonar.</p>
          </div>

          {/* Procura vs Oferta */}
          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow">
            <h3 className="mb-2 text-lg font-semibold">Procura vs Oferta (Top 10)</h3>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">Turma</th>
                  <th>Procura</th>
                  <th>Oferta</th>
                  <th>Rácio</th>
                </tr>
              </thead>
              <tbody>
                {stats.demandSupply.map((row: DemandSupplyRow) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td>{row.name}</td>
                    <td className="font-semibold" style={{ color: COLORS[0] }}>{row.demand}</td>
                    <td className="font-semibold" style={{ color: COLORS[2] }}>{row.supply}</td>
                    <td>{row.ratio !== null ? row.ratio.toFixed(2) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">Rácio de alunos que querem entrar vs. sair de cada turma. Rácio alto = mais difícil entrar.</p>
          </div>
        </div>
      )}
    </div>
  );
}
