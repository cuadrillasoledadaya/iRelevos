const UUID_V4_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(value: unknown): value is string {
	return typeof value === "string" && UUID_V4_REGEX.test(value);
}

export function validateUUID(value: unknown, fieldName: string): string {
	if (!isValidUUID(value)) {
		throw new Error(`${fieldName} debe ser un UUID v4 válido`);
	}
	return value;
}
