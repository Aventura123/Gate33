import { NextRequest, NextResponse } from 'next/server';
import { CookieManager } from './utils/cookieManager';

// Secret key for JWT - ideally, this should be in an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_here';

// Function to verify the JWT token and identify the user type
function verifyToken(token: string) {  try {
    // We check if we're on the server side to avoid build problems
    if (typeof window === 'undefined') {
      // Dynamic import of jsonwebtoken
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, JWT_SECRET);
      return { isValid: true, payload: decoded };
    }
    return { isValid: false, payload: null };
  } catch (error) {
    console.error("Error verifying token:", error);
    return { isValid: false, payload: null };
  }
}

// Function to check cookie consent for analytics/marketing
function checkCookieConsent(request: NextRequest): boolean {
  const consent = request.cookies.get('gate33-cookie-consent')?.value;
  if (!consent) return false;
  
  try {
    const consentData = JSON.parse(consent);
    return consentData.necessary; // At minimum, necessary cookies must be accepted
  } catch {
    return false;
  }
}

// Routes that require company authentication  
const companyRoutes = ['/company-dashboard', '/api/company'];

export function middleware(request: NextRequest) {
  // Check if we are on a public page
  const isPublicRoute = !companyRoutes.some(route => request.nextUrl.pathname.startsWith(route));
  
  // If it is a public route, allow immediate access
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check the authentication cookie
  const isAuthenticated = request.cookies.get('isAuthenticated')?.value === 'true';
  if (!isAuthenticated) {
    console.log('Unauthenticated user trying to access protected route:', request.nextUrl.pathname);
    
    // Redirect to the company login page
    if (companyRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  try {
    // Check the JWT token to confirm authentication and user type
    const token = request.cookies.get('token')?.value;
    if (token) {
      const { isValid, payload } = verifyToken(token);
      
      if (isValid && payload) {
        // If it is a company route, check if the user is a company
        if (companyRoutes.some(route => request.nextUrl.pathname.startsWith(route)) && typeof payload === 'object' && 
            payload !== null && 'collection' in payload && payload.collection !== 'employers') {
          console.log('User is not a company trying to access company route:', request.nextUrl.pathname);
          return NextResponse.redirect(new URL('/login', request.url));
        }
      } else {
        // Invalid token, redirecting to the company login
        console.log('Invalid token when accessing protected route:', request.nextUrl.pathname);
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
  } catch (error) {
    console.error("Error in middleware:", error);
    // In case of error, we still allow access to avoid breaking the page
    return NextResponse.next();
  }

  // If everything is ok, allow access
  return NextResponse.next();
}

// Configure which routes will be checked by the middleware
export const config = {
  matcher: [
    '/company-dashboard/:path*',
    '/seeker-dashboard/:path*',
  ],
};