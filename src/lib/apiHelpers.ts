import { NextResponse } from "next/server";

const DEFAULT_MAX_BODY_SIZE = 1024 * 1024; // 1 MB

export function checkBodySize(
	request: Request,
	maxBytes: number = DEFAULT_MAX_BODY_SIZE,
): NextResponse | null {
	const contentLength = request.headers.get("content-length");
	if (contentLength && parseInt(contentLength, 10) > maxBytes) {
		return NextResponse.json(
			{ error: "Cuerpo de solicitud demasiado grande." },
			{ status: 413 },
		);
	}
	return null;
}

export function jsonResponse(
	body: unknown,
	init: ResponseInit = {},
): NextResponse {
	const response = NextResponse.json(body, init);
	response.headers.set("X-Content-Type-Options", "nosniff");
	return response;
}
