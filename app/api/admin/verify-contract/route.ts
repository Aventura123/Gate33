import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const NETWORK_URLS = {
  ethereum: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161", // Public Infura endpoint
  polygon: "https://polygon-rpc.com",
  bsc: "https://bsc-dataseed.binance.org/",
  arbitrum: "https://arb1.arbitrum.io/rpc",
  optimism: "https://mainnet.optimism.io",
  avalanche: "https://api.avax.network/ext/bc/C/rpc",
  sepolia: "https://rpc.sepolia.org",
  mumbai: "https://rpc-mumbai.maticvigil.com",
  bscTestnet: "https://data-seed-prebsc-1-s1.binance.org:8545/"
};

// Simple ERC20 interface for basic validation
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)"
];

// Minimal Learn2Earn interface for validation (changed from Airdrop)
const LEARN2EARN_ABI = [ // Changed from AIRDROP_ABI
  "function owner() view returns (address)",
  "function distribute(address[]) returns (bool)"
];

export async function POST(request: NextRequest) {
  try {
    const { contractAddress, network = 'sepolia' } = await request.json();
    
    // Validate contract address format
    if (!ethers.utils.isAddress(contractAddress)) {
      return NextResponse.json({ 
        valid: false, 
        error: "Invalid Ethereum address format"
      }, { status: 400 });
    }
    
    // Get provider URL
    const providerUrl = NETWORK_URLS[network as keyof typeof NETWORK_URLS] || NETWORK_URLS.sepolia;
    
    // Create provider
    const provider = new ethers.providers.JsonRpcProvider(providerUrl);
    
    // Check if address has code (is a contract)
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
      return NextResponse.json({ 
        valid: false, 
        error: "The address is not a contract"
      }, { status: 400 });
    }
    
    // Try to validate as ERC20 token
    try {
      const erc20Contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
      const tokenName = await erc20Contract.name();
      const tokenSymbol = await erc20Contract.symbol();
      const tokenDecimals = await erc20Contract.decimals();
      
      return NextResponse.json({
        valid: true,
        isERC20: true,
        contractDetails: {
          name: tokenName,
          symbol: tokenSymbol,
          decimals: Number(tokenDecimals)
        }
      });
    } catch (erc20Error) {
      console.log("Not an ERC20 token, checking for airdrop functions...");
    }
    
    // Try to validate as Learn2Earn contract (changed from Airdrop)
    try {
      const learn2earnContract = new ethers.Contract(contractAddress, LEARN2EARN_ABI, provider); // Changed from airdropContract and AIRDROP_ABI
      const owner = await learn2earnContract.owner();
      
      return NextResponse.json({
        valid: true,
        isLearn2EarnContract: true, // Changed from isAirdropContract
        contractDetails: {
          owner
        }
      });
    } catch (airdropError) {
      // Contract might still be valid but doesn't conform to our interfaces
      return NextResponse.json({
        valid: true,
        genericContract: true,
        message: "Contract exists but doesn't match ERC20 or Airdrop patterns"
      });
    }
  } catch (error: any) {
    console.error("Contract verification error:", error);
    return NextResponse.json({
      valid: false,
      error: error.message || "Failed to verify contract"
    }, { status: 500 });
  }
}
