import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

interface NFT {
  title: string;
  image: string;
  description: string;
  value: string;
  link: string;
}

export default function NFTDetails() {
  const router = useRouter();
  const { title } = router.query;
  const [nft, setNFT] = useState<NFT | null>(null);

  useEffect(() => {
    if (title) {
      fetch(`/api/nfts?title=${title}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch NFT details");
          }
          return response.json();
        })
        .then((data) => {
          setNFT(data);
        })
        .catch((error) => {
          console.error("Error fetching NFT details:", error);
        });
    }
  }, [title]);

  if (!nft) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{nft.title}</h1>
      <img
        src={nft.image}
        alt={nft.title}
        className="w-full h-64 object-cover rounded-md mb-4"
      />
      <p className="text-sm text-gray-600 mb-2">{nft.description}</p>
      <p className="text-sm font-bold text-orange-500 mb-4">{nft.value}</p>
      <a
        href={nft.link}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
      >
        Buy Now
      </a>
    </div>
  );
}
