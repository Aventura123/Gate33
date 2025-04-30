// File: app/api/cryptocurrencies/route.js
import { NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Simulated data - in a real application, you would fetch this from an external API
const cryptoData = [
  {
    id: 1,
    name: 'Bitcoin',
    symbol: 'BTC',
    price: 72456.24,
    change24h: 2.34,
    change7d: 5.67,
    marketCap: 1.42e12,
    volume: 42.6e9,
    circulatingSupply: 19.6e6,
    maxSupply: 21e6
  },
  {
    id: 2,
    name: 'Ethereum',
    symbol: 'ETH',
    price: 3845.67,
    change24h: -1.52,
    change7d: 2.34,
    marketCap: 462.48e9,
    volume: 18.3e9,
    circulatingSupply: 120.3e6,
    maxSupply: null
  },
  {
    id: 3,
    name: 'Tether',
    symbol: 'USDT',
    price: 1.00,
    change24h: 0.00,
    change7d: 0.01,
    marketCap: 108.2e9,
    volume: 62.1e9,
    circulatingSupply: 108.2e9,
    maxSupply: null
  },
  {
    id: 4,
    name: 'Solana',
    symbol: 'SOL',
    price: 167.23,
    change24h: 5.78,
    change7d: 12.34,
    marketCap: 73.92e9,
    volume: 4.7e9,
    circulatingSupply: 442.1e6,
    maxSupply: 569.5e6
  },
  {
    id: 5,
    name: 'BNB',
    symbol: 'BNB',
    price: 612.49,
    change24h: -0.87,
    change7d: -3.45,
    marketCap: 91.23e9,
    volume: 1.9e9,
    circulatingSupply: 149e6,
    maxSupply: null
  },
  {
    id: 6,
    name: 'XRP',
    symbol: 'XRP',
    price: 0.587,
    change24h: 1.24,
    change7d: -0.76,
    marketCap: 32.5e9,
    volume: 1.2e9,
    circulatingSupply: 48.3e9,
    maxSupply: null
  },
  {
    id: 7,
    name: 'Cardano',
    symbol: 'ADA',
    price: 0.486,
    change24h: -2.13,
    change7d: -5.67,
    marketCap: 17.1e9,
    volume: 612.3e6,
    circulatingSupply: 35.2e9,
    maxSupply: null
  },
  {
    id: 8,
    name: 'Dogecoin',
    symbol: 'DOGE',
    price: 0.142,
    change24h: 3.56,
    change7d: 8.92,
    marketCap: 20.2e9,
    volume: 1.1e9,
    circulatingSupply: 142.4e9,
    maxSupply: null
  }
];

const nftDataFile = path.join(process.cwd(), 'public', 'uploads', 'nftDatabase.json');

async function loadNFTDatabase() {
  try {
    const data = await readFile(nftDataFile, 'utf-8');
    if (!data.trim()) {
      console.warn('NFT database file is empty. Initializing with an empty array.');
      await saveNFTDatabase([]);
      return [];
    }
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn('NFT database file not found. Initializing with an empty array.');
      await saveNFTDatabase([]); // Create an empty database file if it doesn't exist
      return [];
    }
    throw error;
  }
}

async function saveNFTDatabase(data) {
  try {
    await mkdir(path.dirname(nftDataFile), { recursive: true });
    await writeFile(nftDataFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving NFT database:', error);
    throw error;
  }
}

export async function GET() {
  try {
    const nftDatabase = await loadNFTDatabase();
    return NextResponse.json(nftDatabase, { status: 200 });
  } catch (error) {
    console.error('Error loading NFT database:', error);
    return NextResponse.json({ error: 'Failed to load NFT database' }, { status: 500 });
  }
}

// Adjusting the code for compatibility with Next.js request object
export async function POST(req) {
  try {
    console.log("Receiving POST request at /api/nfts");

    const formData = await req.formData();
    console.log("FormData received. Fields:", Array.from(formData.keys()));

    const title = formData.get('title');
    const description = formData.get('description');
    const value = formData.get('value');
    const link = formData.get('link');
    const imageFile = formData.get('image');

    if (!title || !description || !value || !imageFile) {
      console.error("Missing required fields", { title, description, value, imageFile });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log("File type:", imageFile.type);
    console.log("File size:", imageFile.size);

    if (!imageFile.type.startsWith('image/')) {
      console.error("Invalid file type:", imageFile.type);
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.join(uploadDir, fileName);

    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (dirError) {
      console.error("Error creating uploads directory:", dirError);
    }

    const fileBuffer = await imageFile.arrayBuffer();

    try {
      await writeFile(filePath, Buffer.from(fileBuffer));
      console.log(`File saved at: ${filePath}`);
    } catch (fsError) {
      console.error("Error saving file:", fsError);
      return NextResponse.json({ error: 'Error saving file to disk' }, { status: 500 });
    }

    const nftDatabase = await loadNFTDatabase();

    const newNFT = {
      id: uuidv4(), // Generate and add unique ID
      title,
      description,
      value,
      link,
      imagePath: `/uploads/${fileName}`
    };

    nftDatabase.push(newNFT);

    try {
      await saveNFTDatabase(nftDatabase);
    } catch (saveError) {
      console.error('Error saving NFT database:', saveError);
      return NextResponse.json({ error: 'Failed to save NFT database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, nft: newNFT }); // Return the full new NFT object including ID
  } catch (error) {
    console.error("Error in /api/nfts endpoint:", error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id"); // Look for 'id' parameter instead of 'title'

    const nftDatabase = await loadNFTDatabase();

    if (id) {
      // Delete a single NFT by ID
      const initialLength = nftDatabase.length;
      const updatedDatabase = nftDatabase.filter((nft) => nft.id !== id);

      if (updatedDatabase.length === initialLength) {
        return NextResponse.json({ error: "NFT not found" }, { status: 404 });
      }

      await saveNFTDatabase(updatedDatabase);
      return NextResponse.json({ success: true, message: `NFT with id ${id} deleted.` });
    } else {
      // Delete all NFTs (if no id is provided)
      await saveNFTDatabase([]);
      return NextResponse.json({ success: true, message: "All NFTs deleted." });
    }
  } catch (error) {
    console.error("Error in DELETE /api/nfts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false, // Disable Next.js default bodyParser
  },
};