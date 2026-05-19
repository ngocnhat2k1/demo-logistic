import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const role = req.cookies.get("dispatch_role")?.value;

    const isPublic =
        pathname === "/" ||
        pathname === "/login" ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname.startsWith("/favicon");

    if (isPublic) return NextResponse.next();

    if (!role) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // role-based routing
    const isDriverRoute = pathname.startsWith("/driver");
    const isCustomerRoute = pathname.startsWith("/customer");

    if (role === "CUSTOMER" && !isCustomerRoute) {
        const url = req.nextUrl.clone();
        url.pathname = "/customer";
        return NextResponse.redirect(url);
    }

    if (isDriverRoute && role !== "DRIVER" && role !== "ADMIN") {
        const url = req.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    if (!isDriverRoute && role === "DRIVER") {
        const url = req.nextUrl.clone();
        url.pathname = "/driver";
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
