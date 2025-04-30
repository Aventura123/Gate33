// File: app/api/placeholder/[width]/[height]/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Reescrevendo completamente a rota com a tipagem mais simples possível
export function GET(request: NextRequest) {
  // Extrair os parâmetros da URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  
  // Os parâmetros [width] e [height] estarão nos últimos segmentos da URL
  const widthStr = pathParts[pathParts.length - 2];
  const heightStr = pathParts[pathParts.length - 1];
  
  const width = parseInt(widthStr, 10);
  const height = parseInt(heightStr, 10);
  
  try {
    // Validar dimensões para evitar abusos
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0 || width > 1000 || height > 1000) {
      return new NextResponse('Invalid dimensions', { status: 400 });
    }

    // Criar um SVG simples com as dimensões solicitadas
    const svg = generatePlaceholderSVG(width, height);
    
    // Retornar o SVG com os cabeçalhos apropriados
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error generating placeholder image:', error);
    return new NextResponse('Error generating image', { status: 500 });
  }
}

function generatePlaceholderSVG(width: number, height: number): string {
  // Cores para o gradiente
  const colors = ['#2C3E50', '#4CA1AF', '#FB923C'];
  
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${colors[0]}" />
        <stop offset="50%" stop-color="${colors[1]}" />
        <stop offset="100%" stop-color="${colors[2]}" />
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#grad)" rx="50%" ry="50%" />
    <text 
      x="50%" 
      y="50%" 
      font-family="Arial, sans-serif" 
      font-size="${Math.max(width, height) * 0.25}px" 
      fill="#FFFFFF" 
      text-anchor="middle" 
      dominant-baseline="central"
    >₿</text>
  </svg>`;
}