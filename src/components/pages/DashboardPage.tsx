"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { uiStore } from "@/stores";
import type { ActivePage } from "@/lib/types";
import packageJson from "../../../package.json";

// Rotating brotherhood quotes — pick one by day-of-year so it changes daily
const BROTHERHOOD_QUOTES = [
	"En el peso de la trabajadera, la fe se hace paso.",
	"Cada costalero carga más que un cuerpo: carga una historia.",
	"Debajo del paso, la hermandad.",
];

// ── Types ──────────────────────────────────────────────────────────

interface LastChange {
	section: string;
	action: string;
	user_id: string;
	user_name: string;
	user_role: string;
	changed_at: string;
}

interface AttentionAlert {
	id: string;
	emoji: string;
	message: string;
	action?: string;
	targetPage?: ActivePage;
}

type DashboardTab = "activity" | "attention";

// ── Helpers ────────────────────────────────────────────────────────

/** Returns "hace 5 min", "hace 2 h", "hace 3 d", etc. */
function timeAgo(iso: string): string {
	const now = Date.now();
	const then = new Date(iso).getTime();
	const diffMs = now - then;
	const diffMin = Math.floor(diffMs / 60_000);
	const diffH = Math.floor(diffMin / 60);
	const diffD = Math.floor(diffH / 24);

	if (diffMin < 1) return "menos de 1 min";
	if (diffMin < 60) return `${diffMin} min`;
	if (diffH < 24) return `${diffH} h`;
	return `${diffD} d`;
}

/** Maps section key to display label + emoji. */
function formatSection(section: string): { label: string; emoji: string } {
	const map: Record<string, { label: string; emoji: string }> = {
		censo: { label: "Censo", emoji: "👥" },
		plan: { label: "Plan", emoji: "📋" },
		temporada: { label: "Temporada", emoji: "📅" },
		snapshot: { label: "Snapshot", emoji: "💾" },
	};
	return map[section] ?? { label: section, emoji: "📝" };
}

// ── Sub-components ─────────────────────────────────────────────────

function ActivityList({
	items,
	loading,
}: {
	items: LastChange[];
	loading: boolean;
}) {
	if (loading) {
		return <p className="text-[var(--cre-o)] text-sm">Cargando...</p>;
	}
	if (items.length === 0) {
		return (
			<p className="text-[var(--cre-o)] text-sm italic">
				Aún no hay cambios registrados
			</p>
		);
	}
	return (
		<div className="flex flex-col gap-2">
			{items.map((item, i) => {
				const { emoji } = formatSection(item.section);
				return (
					<div key={i} className="flex items-center gap-3 text-sm">
						<span className="text-lg">{emoji}</span>
						<div className="flex flex-col min-w-0">
							<span className="text-[var(--cre)] font-medium truncate">
								{item.action}
							</span>
							<span className="text-[var(--cre-o)] text-xs">
								por {item.user_name} · {timeAgo(item.changed_at)}
							</span>
						</div>
					</div>
				);
			})}
		</div>
	);
}

function AttentionList({
	items,
	onNavigate,
}: {
	items: AttentionAlert[];
	onNavigate: (page: ActivePage) => void;
}) {
	if (items.length === 0) {
		return (
			<p className="text-[var(--ok-tx)] text-sm italic">
				✅ Todo en orden — no hay alertas pendientes
			</p>
		);
	}
	return (
		<div className="flex flex-col gap-2">
			{items.map((alert) => (
				<div
					key={alert.id}
					className="bg-[var(--warn-oro-bg)] border border-[var(--warn-oro-bd)] rounded-xl p-4 flex items-center gap-3"
				>
					<span className="text-lg">{alert.emoji}</span>
					<span className="text-[var(--cre)] text-sm flex-1">
						{alert.message}
					</span>
					{alert.action && alert.targetPage && (
						<button
							onClick={() => onNavigate(alert.targetPage!)}
							className="text-xs font-bold text-[var(--warn-oro)] hover:underline whitespace-nowrap"
						>
							{alert.action}
						</button>
					)}
				</div>
			))}
		</div>
	);
}

// ── Component ──────────────────────────────────────────────────────

export default function DashboardPage() {
	const { profile } = useAuth();
	const setActivePage = uiStore.getState().setActivePage;

	const [stats, setStats] = useState({
		censados: 0,
		pasos: 0,
		trabajaderas: 0,
	});
	const [loading, setLoading] = useState(true);

	// Tabs state
	const [tab, setTab] = useState<DashboardTab>("activity");
	const [activity, setActivity] = useState<LastChange[]>([]);
	const [activityLoading, setActivityLoading] = useState(true);
	const [attention, setAttention] = useState<AttentionAlert[]>([]);

	useEffect(() => {
		async function fetchStats() {
			try {
				const { count: censusCount } = await supabase
					.from("census")
					.select("*", { count: "exact", head: true });
				const { count: pasosCount } = await supabase
					.from("proyectos")
					.select("*", { count: "exact", head: true });

				setStats({
					censados: censusCount || 0,
					pasos: pasosCount || 0,
					trabajaderas: 0,
				});
			} catch (e) {
				console.error(e);
			} finally {
				setLoading(false);
			}
		}

		async function fetchActivity() {
			try {
				const { data, error } = await supabase.rpc("get_last_change", {
					limit_n: 5,
				});
				if (!error && data && data.length > 0) {
					setActivity(data as LastChange[]);
				}
			} catch (e) {
				console.error("Error fetching activity:", e);
			} finally {
				setActivityLoading(false);
			}
		}

		async function fetchAttention() {
			const alerts: AttentionAlert[] = [];
			try {
				// 1. Census staleness > 30 days
				const { data: censusData, error: censusErr } = await supabase
					.from("census")
					.select("updated_at")
					.order("updated_at", { ascending: false })
					.limit(1);

				if (!censusErr && censusData && censusData.length > 0 && censusData[0].updated_at) {
					const lastUpdate = new Date(censusData[0].updated_at).getTime();
					const daysSince = Math.floor(
						(Date.now() - lastUpdate) / (1000 * 60 * 60 * 24),
					);
					if (daysSince > 30) {
						alerts.push({
							id: "census-stale",
							emoji: "📋",
							message: `El censo no se actualiza hace ${daysSince} días`,
							action: "Ir al censo",
							targetPage: "carga",
						});
					}
				} else if (!censusErr && (!censusData || censusData.length === 0)) {
					alerts.push({
						id: "census-never",
						emoji: "📋",
						message: "El censo necesita actualización",
						action: "Ir al censo",
						targetPage: "carga",
					});
				}

				// 2. Plan staleness > 14 days
				const { data: planData, error: planErr } = await supabase
					.from("proyectos")
					.select("updated_at")
					.order("updated_at", { ascending: false })
					.limit(1);

				if (!planErr && planData && planData.length > 0 && planData[0].updated_at) {
					const lastUpdate = new Date(planData[0].updated_at).getTime();
					const daysSince = Math.floor(
						(Date.now() - lastUpdate) / (1000 * 60 * 60 * 24),
					);
					if (daysSince > 14) {
						alerts.push({
							id: "plan-stale",
							emoji: "📋",
							message: `El plan no se actualiza hace ${daysSince} días`,
							action: "Ir al plan",
							targetPage: "plan",
						});
					}
				}

				// 3. Costaleros sin contacto
				const { count: noContactCount, error: contactErr } = await supabase
					.from("census")
					.select("*", { count: "exact", head: true })
					.or("email.is.null,email.eq.,telefono.is.null,telefono.eq.");

				if (!contactErr && noContactCount && noContactCount > 0) {
					alerts.push({
						id: "no-contact",
						emoji: "📱",
						message: `${noContactCount} costalero${noContactCount > 1 ? "s" : ""} sin email o teléfono`,
						action: "Ir al censo",
						targetPage: "carga",
					});
				}
			} catch (e) {
				console.error("Error checking attention alerts:", e);
			}
			setAttention(alerts);
		}

		fetchStats();
		fetchActivity();
		fetchAttention();
	}, []);

	// Pick a quote that rotates daily based on day-of-year
	const quoteIndex =
		Math.floor(
			(new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
				86400000,
		) % BROTHERHOOD_QUOTES.length;

	return (
		<div className="flex flex-col gap-6 p-4 animate-in fade-in duration-500">
			{/* Bienvenida */}
			<div className="flex flex-col gap-1 items-center">
				<h1
					className="text-3xl font-black cinzel text-[var(--cre)] text-center"
					style={{ textShadow: "0 2px 4px rgba(0,0,0,0.15)" }}
				>
					¡Hola, {profile?.apodo || profile?.nombre || "Costalero"}!
				</h1>
				{profile?.role && (
					<span className="text-xs uppercase tracking-wider text-[var(--oro)] font-bold bg-[var(--neg-m)] border border-[var(--oro)]/30 px-2 py-0.5 rounded-full">
						{profile.role}
					</span>
				)}
				<p className="text-[var(--cre-o)] text-sm uppercase tracking-widest font-bold text-center">
					Bienvenido al centro de mando
				</p>
			</div>

			{/* Rotating brotherhood quote */}
			<p className="text-center text-sm italic text-[var(--cre-o)]">
				&quot;{BROTHERHOOD_QUOTES[quoteIndex]}&quot;
			</p>

			{/* Center of Command card — tabs: Activity / Attention */}
			<div className="bg-[var(--neg-m)] border border-[var(--oro)]/20 rounded-xl overflow-hidden">
				{/* Tab header */}
				<div className="flex border-b border-[var(--oro)]/20">
					<button
						onClick={() => setTab("activity")}
						className={`flex-1 py-3 text-sm font-bold cinzel uppercase tracking-wider transition-colors ${
							tab === "activity"
								? "text-[var(--oro)] border-b-2 border-[var(--oro)] bg-[var(--oro)]/5"
								: "text-[var(--cre-o)] hover:text-[var(--cre)]"
						}`}
					>
						Actividad{" "}
						{activity.length > 0 && (
							<span className="text-xs ml-1">({activity.length})</span>
						)}
					</button>
					<button
						onClick={() => setTab("attention")}
						className={`flex-1 py-3 text-sm font-bold cinzel uppercase tracking-wider transition-colors ${
							tab === "attention"
								? "text-[var(--warn-oro)] border-b-2 border-[var(--warn-oro)] bg-[var(--warn-oro-bg)]"
								: "text-[var(--cre-o)] hover:text-[var(--cre)]"
						}`}
					>
						Atención{" "}
						{attention.length > 0 && (
							<span className="text-xs ml-1">({attention.length})</span>
						)}
					</button>
				</div>

				{/* Tab body */}
				<div className="p-4 min-h-[120px]">
					{tab === "activity" && (
						<ActivityList items={activity} loading={activityLoading} />
					)}
					{tab === "attention" && (
						<AttentionList items={attention} onNavigate={setActivePage} />
					)}
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-2 gap-4">
				<div className="bg-[var(--neg-m)] border border-[var(--oro)]/20 rounded-xl p-4 flex flex-col items-center justify-center gap-1">
					<span className="text-4xl font-black text-[var(--oro)] cinzel">
						{loading ? "..." : stats.censados}
					</span>
					<span className="text-[0.6rem] uppercase tracking-widest text-[var(--cre-o)] font-bold">
						Censados
					</span>
				</div>
				<div className="bg-[var(--neg-m)] border border-[var(--oro)]/20 rounded-xl p-4 flex flex-col items-center justify-center gap-1">
					<span className="text-4xl font-black text-[var(--oro)] cinzel">
						{loading ? "..." : stats.pasos}
					</span>
					<span className="text-[0.6rem] uppercase tracking-widest text-[var(--cre-o)] font-bold">
						Pasos
					</span>
				</div>
			</div>

			{/* Acciones Rápidas */}
			<div className="flex flex-col gap-3">
				<h2 className="text-[0.7rem] uppercase tracking-[0.2em] text-[var(--oro)] font-black">
					Acciones Rápidas
				</h2>
				<div className="grid grid-cols-1 gap-2">
					<button
						onClick={() => setActivePage("plan")}
						className="btn btn-oro h-16 text-lg flex items-center justify-between px-6"
					>
						<span>GESTIONAR RELEVOS</span>
						<span className="text-2xl">➡️</span>
					</button>
					<button
						onClick={() => setActivePage("admin")}
						className="btn btn-out h-14 text-sm flex items-center justify-between px-6"
					>
						<span>PANEL DE CONTROL</span>
						<span className="text-xl">⚙️</span>
					</button>
				</div>
			</div>

			{/* Info de la App */}
			<div className="mt-auto pt-8 border-t border-[var(--oro)]/20 flex justify-between items-end opacity-50">
				<div className="flex flex-col">
					<span className="text-[0.6rem] uppercase tracking-widest font-bold text-[var(--cre-o)]">
						Versión del Sistema
					</span>
					<span className="text-sm font-black cinzel text-[var(--oro)]">
						v{packageJson.version}
					</span>
				</div>
				<div className="text-right">
					<span className="text-[0.5rem] uppercase tracking-widest font-bold text-[var(--cre-o)]">
						Servidores
					</span>
					<div className="flex items-center gap-1 justify-end">
						<div className="w-2 h-2 bg-[var(--ok-bg)] rounded-full animate-pulse"></div>
						<span className="text-[0.6rem] font-bold text-[var(--ok-tx)]">
							ONLINE
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
