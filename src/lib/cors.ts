import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
	process.env.NEXT_PUBLIC_SUPABASE_URL,
	// Add additional allowed origins here
].filter(Boolean) as string[];

export function withCors(
	response: NextResponse,
	request: Request,
): NextResponse {
	const origin = request.headers.get("origin");

	if (origin && ALLOWED_ORIGINS.includes(origin)) {
		response.headers.set("Access-Control-Allow-Origin", origin);
		response.headers.set("Access-Control-Allow-Credentials", "true");
		response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
		response.headers.set(
			"Access-Control-Allow-Headers",
			"Content-Type, Authorization",
		);
	}

	return response;
}

export function handleCorsPreflight(request: Request): NextResponse | null {
	if (request.method === "OPTIONS") {
		const response = new NextResponse(null, { status: 204 });
		return withCors(response, request);
	}
	return null;
}
