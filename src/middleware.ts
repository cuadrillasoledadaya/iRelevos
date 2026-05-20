import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ROUTES = ["/login", "/register", "/manifest.json", "/sw.js"];
const PUBLIC_PREFIXES = [
	"/api/",
	"/_next/",
	"/favicon.ico",
	"/swe-worker-",
	"/workbox-",
];

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Allow public routes without auth check
	if (
		PUBLIC_ROUTES.includes(pathname) ||
		PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
	) {
		return NextResponse.next();
	}

	// Create Supabase server client with cookie handling
	const response = NextResponse.next({ request });
	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) => {
						request.cookies.set(name, value);
						response.cookies.set(name, value, options);
					});
				},
			},
		},
	);

	// Check session
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error || !user) {
		const loginUrl = new URL("/login", request.url);
		loginUrl.searchParams.set("redirectTo", pathname);
		return NextResponse.redirect(loginUrl);
	}

	return response;
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - static files (e.g. favicon.ico)
		 */
		"/((?!_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|otf|css|js)).*)",
	],
};
