"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { uiStore, setEsMandoGetter } from "@/stores";
import AppHeader from "@/components/layout/AppHeader";
import BottomNav from "@/components/layout/BottomNav";
import DashboardPage from "@/components/pages/DashboardPage";

import { useAuth } from "@/hooks/useAuth";

const ConfigPage = dynamic(() => import("@/components/pages/ConfigPage"), {
	ssr: false,
});
const EquipoPage = dynamic(() => import("@/components/pages/EquipoPage"), {
	ssr: false,
});
const PlanPage = dynamic(() => import("@/components/pages/PlanPage"), {
	ssr: false,
});
const CapatazPage = dynamic(() => import("@/components/pages/CapatazPage"), {
	ssr: false,
});
const CargaPage = dynamic(() => import("@/components/pages/CargaPage"), {
	ssr: false,
});
const AdminPage = dynamic(() => import("@/components/pages/AdminPage"), {
	ssr: false,
});

const BancoSheet = dynamic(() => import("@/components/sheets/BancoSheet"), {
	ssr: false,
});
const PerfilesSheet = dynamic(
	() => import("@/components/sheets/PerfilesSheet"),
	{ ssr: false },
);
const CeldaSheet = dynamic(() => import("@/components/sheets/CeldaSheet"), {
	ssr: false,
});
const SwapSheet = dynamic(() => import("@/components/sheets/SwapSheet"), {
	ssr: false,
});
const SugerenciaSheet = dynamic(
	() => import("@/components/sheets/SugerenciaSheet"),
	{ ssr: false },
);
const SugerenciaAsignacionSheet = dynamic(
	() => import("@/components/sheets/SugerenciaAsignacionSheet"),
	{ ssr: false },
);
const RelevosSheet = dynamic(() => import("@/components/sheets/RelevosSheet"), {
	ssr: false,
});
const CensusSheet = dynamic(() => import("@/components/sheets/CensusSheet"), {
	ssr: false,
});
const HistorySheet = dynamic(() => import("@/components/sheets/HistorySheet"), {
	ssr: false,
});
const SnapshotDetailSheet = dynamic(
	() => import("@/components/sheets/SnapshotDetailSheet"),
	{ ssr: false },
);
const CompareSheet = dynamic(() => import("@/components/sheets/CompareSheet"), {
  ssr: false,
});
const RestoreSheet = dynamic(() => import("@/components/sheets/RestoreSheet"), {
  ssr: false,
});

export default function Home() {
	const router = useRouter();
	const activePage = uiStore((s) => s.activePage);
	const activeSheet = uiStore((s) => s.activeSheet);
	const { profile, session, loading } = useAuth();

	// Client-side guard: redirect to login if no session
	useEffect(() => {
		if (!loading && !session) {
			router.push("/login");
		}
	}, [loading, session, router]);

	// Wire esMando permission getter to historyStore (defense-in-depth)
	useEffect(() => {
		const isMando =
			profile?.role === "superadmin" ||
			profile?.role === "capataz" ||
			profile?.role === "auxiliar";
		setEsMandoGetter(() => isMando);
	}, [profile?.role]);

	// Show nothing while checking auth
	if (loading || !session) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
				<p className="text-[var(--oro)] cinzel text-xl animate-pulse">
					Cargando...
				</p>
			</div>
		);
	}

	const esMando =
		profile?.role === "superadmin" ||
		profile?.role === "capataz" ||
		profile?.role === "auxiliar";

	return (
		<div className="shell">
			<AppHeader />

			<main className="main">
				<div className={activePage === "home" ? "page active" : "page"}>
					<DashboardPage />
				</div>

				{esMando && (
					<div className={activePage === "config" ? "page active" : "page"}>
						<ConfigPage />
					</div>
				)}

				<div className={activePage === "equipo" ? "page active" : "page"}>
					<EquipoPage />
				</div>

				<div className={activePage === "plan" ? "page active" : "page"}>
					<PlanPage />
				</div>

				{esMando && (
					<>
						<div className={activePage === "capataz" ? "page active" : "page"}>
							<CapatazPage />
						</div>
						<div className={activePage === "carga" ? "page active" : "page"}>
							<CargaPage />
						</div>
						<div className={activePage === "admin" ? "page active" : "page"}>
							<AdminPage />
						</div>
					</>
				)}
			</main>

			<BottomNav />

			{/* Bottom Sheets — conditionally mounted */}
			{activeSheet === "banco" && <BancoSheet />}
			{activeSheet === "perfiles" && <PerfilesSheet />}
			{activeSheet === "celda" && <CeldaSheet />}
			{activeSheet === "swap" && <SwapSheet />}
			{activeSheet === "sugerencia" && <SugerenciaSheet />}
			{activeSheet === "sugerencia-asig" && <SugerenciaAsignacionSheet />}
			{activeSheet === "relevos" && <RelevosSheet />}
			{activeSheet === "censo" && <CensusSheet />}
			{activeSheet === "history" && <HistorySheet />}
			{activeSheet === "detail" && <SnapshotDetailSheet />}
			{activeSheet === "compare" && <CompareSheet />}
      {activeSheet === "restore" && <RestoreSheet />}
		</div>
	);
}
