"use client";

import dynamic from "next/dynamic";
import { uiStore } from "@/stores";
import AppHeader from "@/components/layout/AppHeader";
import BottomNav from "@/components/layout/BottomNav";
import DashboardPage from "@/components/pages/DashboardPage";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
const RelevosSheet = dynamic(() => import("@/components/sheets/RelevosSheet"), {
	ssr: false,
});
const CensusSheet = dynamic(() => import("@/components/sheets/CensusSheet"), {
	ssr: false,
});

export default function Home() {
	const activePage = uiStore((s) => s.activePage);
	const activeSheet = uiStore((s) => s.activeSheet);
	const { session, loading, profile } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading && !session) {
			router.push("/login");
		}
	}, [session, loading, router]);

	if (loading || !session) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
				<div className="text-[var(--oro)] cinzel text-xl animate-pulse">
					Iniciando sesión...
				</div>
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
			{activeSheet === "relevos" && <RelevosSheet />}
			{activeSheet === "censo" && <CensusSheet />}
		</div>
	);
}
