// ══════════════════════════════════════════════════════════════════
// ADMIN TYPES — Tipos compartidos del panel de administración
// ══════════════════════════════════════════════════════════════════

import type { RolCode } from "@/lib/types";

// Tipos del panel de administración

export interface CensusEntry {
	id: string;
	email: string | null;
	nombre: string;
	apellidos: string;
	apodo?: string;
	telefono: string;
	trabajadera?: number;
	altura?: number;
	rol?: RolCode;
	proyecto_id: string;
	temporada_id?: string;
	created_at: string;
}

// Datos que llegan normalizados desde el proxy de iCuadrilla
export interface ImportEntry {
	nombre: string;
	apellidos: string;
	apodo: string;
	email: string | null;
	trabajadera: number | null;
	rol: RolCode;
	rol_sec: RolCode;
	puntuacion: number;
	external_id: string;
	selected: boolean;
	_status?: "new" | "exists";
}

export interface NewCensusEntry {
	email: string;
	nombre: string;
	apellidos: string;
	apodo: string;
	telefono: string;
	trabajadera: string;
	altura: string;
	proyecto_id: string;
}

export interface NewPasoForm {
	nombre_paso: string;
	nombre_cuadrilla: string;
	num_trabajaderas: number;
}

export interface NewTempForm {
	nombre: string;
	clonarCenso: boolean;
	clonarPasos: boolean;
	sourceTempId: string;
}

export interface CensusEditForm {
	email?: string | null;
	nombre?: string;
	apellidos?: string;
	apodo?: string;
	telefono?: string;
	trabajadera?: number;
	altura?: number;
}

export interface SyncCostaleroPayload {
	content: {
		trabajaderas: {
			id: number;
			nombres: string[];
			roles?: { pri: string; sec: string }[];
		}[];
	};
}
