import { NextResponse } from "next/server";

const MAX_BODY_SIZE = 1024 * 1024; // 1 MB

export function checkBodySize(request: Request): NextResponse | null {
	const contentLength = request.headers.get("content-length");
	if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
		return NextResponse.json(
			{ error: "Request body too large. Max 1MB allowed." },
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
