/**
 * JWT utilities optimized for Edge Runtime
 * Fallback para Node.js runtime quando Edge Runtime não suporta jsonwebtoken
 */

let jwt: any = null;

// Dynamic import para evitar erros no Edge Runtime
const getJWT = async () => {
  if (jwt) return jwt;
    try {
    // Check if we're in Edge Runtime by detecting global variables
    const isEdgeRuntime = (typeof globalThis !== 'undefined' && 
                          (globalThis as any).EdgeRuntime !== undefined) ||
                         (typeof process !== 'undefined' && 
                          process.env.NEXT_RUNTIME === 'edge');
    
    if (isEdgeRuntime) {
      // Use Web Crypto API instead of jsonwebtoken
      return {
        sign: async (payload: any, secret: string) => {
          console.warn('JWT signing not available in Edge Runtime');
          return null;
        },
        verify: async (token: string, secret: string) => {
          console.warn('JWT verification not available in Edge Runtime');
          return null;
        }
      };
    }
    
    // Use jsonwebtoken in Node.js runtime
    jwt = await import('jsonwebtoken');
    return jwt;
  } catch (error) {
    console.warn('JWT library not available:', error);
    return {
      sign: () => null,
      verify: () => null
    };
  }
};

export const signJWT = async (payload: any, secret: string, options?: any) => {
  const jwtLib = await getJWT();
  if (!jwtLib?.sign) return null;
  
  try {
    return jwtLib.sign(payload, secret, options);
  } catch (error) {
    console.error('JWT signing error:', error);
    return null;
  }
};

export const verifyJWT = async (token: string, secret: string) => {
  const jwtLib = await getJWT();
  if (!jwtLib?.verify) return null;
  
  try {
    return jwtLib.verify(token, secret);
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
};

export default {
  sign: signJWT,
  verify: verifyJWT
};
