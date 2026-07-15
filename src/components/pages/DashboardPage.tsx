"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { uiStore } from "@/stores";
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
	targetPage?: string;
}

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

	// New state for audit widgets
	const [lastChange, setLastChange] = useState<LastChange | null>(null);
	const [lastChangeLoading, setLastChangeLoading] = useState(true);
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

		async function fetchLastChange() {
			try {
				const { data, error } = await supabase.rpc("get_last_change");
				if (!error && data && data.length > 0) {
					setLastChange(data[0] as LastChange);
				}
			} catch (e) {
				console.error("Error fetching last change:", e);
			} finally {
				setLastChangeLoading(false);
			}
		}

		async function fetchAttention() {
			const alerts: AttentionAlert[] = [];
			try {
				// Check if census hasn't been updated in 30+ days
				const { data, error } = await supabase
					.from("census")
					.select("updated_at")
					.order("updated_at", { ascending: false })
					.limit(1);

				if (!error && data && data.length > 0 && data[0].updated_at) {
					const lastUpdate = new Date(data[0].updated_at).getTime();
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
				} else if (!error && (!data || data.length === 0)) {
					// No updated_at means census was never touched with audit trail
					alerts.push({
						id: "census-never",
						emoji: "📋",
						message: "El censo necesita actualización",
						action: "Ir al censo",
						targetPage: "carga",
					});
				}
			} catch (e) {
				console.error("Error checking census staleness:", e);
			}
			setAttention(alerts);
		}

		fetchStats();
		fetchLastChange();
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
			{/* Bienvenida — FIX: use apodo || nombre so it shows "Chiqui" not "Superadmin" */}
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

			{/* Último cambio widget */}
			<div className="bg-[var(--neg-m)] border border-[var(--oro)]/20 rounded-xl p-4">
				<h2 className="text-sm font-black cinzel text-[var(--cre)] mb-2">
					Último cambio
				</h2>
				{lastChangeLoading ? (
					<p className="text-[var(--cre-o)] text-sm">Cargando...</p>
				) : lastChange ? (
					<div className="flex items-center gap-3 text-sm">
						<span className="text-lg">
							{formatSection(lastChange.section).emoji}
						</span>
						<div className="flex flex-col">
							<span className="text-[var(--cre)] font-medium">
								{lastChange.action}
							</span>
							<span className="text-[var(--cre-o)] text-xs">
								por {lastChange.user_name} · hace{" "}
								{timeAgo(lastChange.changed_at)}
							</span>
						</div>
					</div>
				) : (
					<p className="text-[var(--cre-o)] text-sm italic">
						Aún no hay cambios registrados
					</p>
				)}
			</div>

			{/* Necesita tu atención widget */}
			{attention.length > 0 && (
				<div className="flex flex-col gap-2">
					<h2 className="text-sm font-black cinzel text-[var(--cre)]">
						Necesita tu atención
					</h2>
					{attention.map((alert) => (
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
									onClick={() => setActivePage(alert.targetPage!)}
									className="text-xs font-bold text-[var(--warn-oro)] hover:underline"
								>
									{alert.action}
								</button>
							)}
						</div>
					))}
				</div>
			)}

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
