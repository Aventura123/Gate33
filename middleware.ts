import { NextRequest, NextResponse } from 'next/server';
import { AdminRole } from './hooks/useAdminPermissions';

// Secret key for JWT - ideally, this should be in an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_here';

// Function to verify the JWT token and identify the user type
function verifyToken(token: string) {
  try {
    // We check if we're on the server side to avoid build problems
    if (typeof window === 'undefined') {
      // Dynamic use of jsonwebtoken to avoid Netlify build issues
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

// Routes that require admin authentication
const adminRoutes = ['/admin', '/api/admin'];
const companyRoutes = ['/company-dashboard', '/api/company'];

// Mapeamento de rotas para requisitos de permissão específicos
const routePermissions: Record<string, string[]> = {
  '/admin/users': ['canManageUsers'],
  '/admin/settings': ['canAccessSettings'], 
  '/admin/companies/approve': ['canApproveCompanies'],
  '/admin/nfts': ['canManageNFTs'],           // Nova rota para NFTs
  '/admin/payment-settings': ['canManagePayments'], // Nova rota para pagamentos
  '/api/admin/users': ['canManageUsers'],
  '/api/admin/jobs/delete': ['canDeleteJobs'],
  '/api/admin/nfts': ['canManageNFTs'],       // Nova API para NFTs
  '/api/admin/payments': ['canManagePayments'] // Nova API para pagamentos
  // Add more routes and their required permissions
};

export function middleware(request: NextRequest) {
  // Additional check for Netlify environment
  if (process.env.NETLIFY || process.env.NETLIFY_DEV) {
    console.log('Middleware running in Netlify environment');
  }

  // Check if we are on a public page
  const isPublicRoute = !adminRoutes.some(route => request.nextUrl.pathname.startsWith(route)) &&
                        !companyRoutes.some(route => request.nextUrl.pathname.startsWith(route));
  
  // If it is a public route, allow immediate access
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check the authentication cookie
  const isAuthenticated = request.cookies.get('isAuthenticated')?.value === 'true';
  if (!isAuthenticated) {
    console.log('Unauthenticated user trying to access protected route:', request.nextUrl.pathname);
    
    // Redirect to the appropriate login page
    if (adminRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/admin-login', request.url));
    } else if (companyRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/company-login', request.url));
    }
  }

  try {
    // Check the JWT token to confirm authentication and user type
    const token = request.cookies.get('token')?.value;
    if (token) {
      const { isValid, payload } = verifyToken(token);
      
      if (isValid && payload) {
        // Check permissions for admin routes
        if (adminRoutes.some(route => request.nextUrl.pathname.startsWith(route)) && typeof payload === 'object') {
          // Check if role exists (deve ser 'super_admin' ou 'admin')
          if (!('role' in payload) || !['super_admin', 'admin'].includes(payload.role as string)) {
            console.log('User with invalid role trying to access admin route:', request.nextUrl.pathname);
            return NextResponse.redirect(new URL('/admin-login', request.url));
          }
          
          // Check specific permissions for the route
          const path = request.nextUrl.pathname;
          const requiredPermissions = Object.keys(routePermissions).find(route => 
            path.startsWith(route)
          );
          
          if (requiredPermissions && 'permissions' in payload) {
            const hasAllPermissions = routePermissions[requiredPermissions].every(
              permission => payload.permissions && payload.permissions[permission]
            );
            
            if (!hasAllPermissions) {
              console.log('Admin without necessary permissions trying to access:', path);
              // Redirect to an access denied page or limited dashboard
              return NextResponse.redirect(new URL('/admin/access-denied', request.url));
            }
          }
        }
        
        // If it is a company route, check if the user is a company
        if (companyRoutes.some(route => request.nextUrl.pathname.startsWith(route)) && typeof payload === 'object' && 
            payload !== null && 'collection' in payload && payload.collection !== 'employers') {
          console.log('User is not a company trying to access company route:', request.nextUrl.pathname);
          return NextResponse.redirect(new URL('/company-login', request.url));
        }
      } else {
        // Invalid token, redirecting to the appropriate login
        console.log('Invalid token when accessing protected route:', request.nextUrl.pathname);
        const loginRoute = adminRoutes.some(route => request.nextUrl.pathname.startsWith(route)) ? 
                          '/admin-login' : '/company-login';
        return NextResponse.redirect(new URL(loginRoute, request.url));
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
    '/admin/:path*',
    '/company-dashboard/:path*',
    '/seeker-dashboard/:path*',
  ],
};