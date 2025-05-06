"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout"; // Import the Layout component
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { getStorage, ref, getDownloadURL } from "firebase/storage";

// Ensure the NFT interface is explicitly defined and used
interface NFT {
  id?: string | number; // Allow id to be either string or number
  title: string;
  image: string;
  description: string;
  value: string;
  link: string;
  date?: string; // Optional date property
  referenceNumber?: number; // Optional reference number property
}

export default function NFTPage() {
  const [nfts, setNFTs] = useState<NFT[]>([]);
  const [form, setForm] = useState<NFT>({
    title: "",
    image: "",
    description: "",
    value: "",
    link: "",
  });
  const [searchQuery, setSearchQuery] = useState(""); // State for search query
  const [sortOption, setSortOption] = useState("date"); // State for sort option

  const router = useRouter();

  useEffect(() => {
    const fetchNFTsFromFirestore = async () => {
      try {
        if (!db) throw new Error("Firestore is not initialized");

        const nftCollection = collection(db, "nfts");
        const nftSnapshot = await getDocs(nftCollection);
        const storage = getStorage();

        const fetchedNFTs = await Promise.all(
          nftSnapshot.docs.map(async (doc) => {
            const data = doc.data();
            const imagePath = data.imagePath || "";
            let imageUrl = "/images/logo.png"; // Default image

            if (imagePath) {
              try {
                const imageRef = ref(storage, imagePath);
                imageUrl = await getDownloadURL(imageRef);
              } catch (error) {
                console.error("Error fetching image URL from Firebase Storage:", error);
              }
            }

            return {
              id: doc.id,
              title: data.title || "",
              image: imageUrl,
              description: data.description || "",
              value: data.value || "",
              link: data.link || "",
              date: data.date || new Date().toISOString(),
            };
          })
        );

        setNFTs(fetchedNFTs);
      } catch (error) {
        console.error("Error fetching NFTs from Firestore:", error);
      }
    };

    fetchNFTsFromFirestore();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // Updated handleAddNFT to include a reference number for each NFT
  const handleAddNFT = (e: React.FormEvent) => {
    e.preventDefault();
    const newNFT = {
      ...form,
      date: new Date().toISOString(), // Add current date and time
      referenceNumber: nfts.length + 1, // Generate reference number based on the order
    };
    setNFTs([...nfts, newNFT]);
    setForm({ title: "", image: "", description: "", value: "", link: "" });
  };

  const handleNFTClick = (nft: NFT) => {
    if (typeof window !== "undefined" && nft.link) {
      // Abrir o link do NFT em uma nova aba
      window.open(nft.link, "_blank", "noopener,noreferrer");
    } else {
      console.warn("Este NFT não tem um link válido", nft);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOption = e.target.value;
    setSortOption(selectedOption);
    const sortedNFTs = [...nfts];
    if (selectedOption === "newest") {
      sortedNFTs.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0)); // Convert id to number
    } else if (selectedOption === "oldest") {
      sortedNFTs.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0)); // Convert id to number
    } else if (selectedOption === "title") {
      sortedNFTs.sort((a, b) => a.title.localeCompare(b.title));
    } else if (selectedOption === "value") {
      sortedNFTs.sort((a, b) => parseFloat(b.value || '0') - parseFloat(a.value || '0'));
    }
    setNFTs(sortedNFTs);
  };

  const filteredNFTs = nfts
    .filter((nft) =>
      nft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nft.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

  useEffect(() => {
    console.log("Sort option changed:", sortOption);
    console.log("Filtered NFTs:", filteredNFTs);
  }, [sortOption, filteredNFTs]);

  // Adicionei classes responsivas para exibir um cartão menor em lista com uma imagem menor no lado esquerdo na versão mobile
  return (
    <Layout>
      <div className="pt-12 sm:pt-16 p-4 min-h-screen bg-gradient-to-b from-black via-zinc-900 to-orange-950 text-white">
        <div className="flex flex-col sm:flex-row justify-center items-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-wide text-center">
            <span className="bg-gradient-to-r from-orange-400 via-orange-600 to-yellow-400 bg-clip-text text-transparent drop-shadow-lg block">
              Own a Web3 Logo NFT
            </span>
            <span className="block mt-2 text-lg sm:text-xl font-medium text-orange-200 opacity-90">
              Get the Art, Get the Brand, Get the Future
            </span>
          </h1>
        </div>
        <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row justify-end items-center gap-4">
          <div className="flex w-full sm:w-auto gap-4">
            <select
              value={sortOption}
              onChange={handleSortChange}
              className="w-full sm:w-auto p-2 border border-orange-500 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm text-black hover:bg-orange-500 min-w-[140px] bg-white"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="title">Title</option>
              <option value="value">Value</option>
            </select>
            <input
              type="text"
              placeholder="Search NFTs..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full sm:w-[300px] p-2 border border-orange-500 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm bg-zinc-900 text-white placeholder-gray-400"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-8 mb-8 px-2 sm:px-8">
          {filteredNFTs.map((nft) => (
            <div
              key={nft.id}
              className="group aspect-square flex flex-col justify-between border-2 border-orange-600 rounded-2xl bg-gradient-to-br from-zinc-900 via-black to-orange-950 shadow-lg hover:shadow-orange-400/30 hover:border-orange-400 transition-all cursor-pointer relative overflow-hidden"
              onClick={() => handleNFTClick(nft)}
            >
              <div className="flex-1 flex items-center justify-center overflow-hidden">
                <img
                  src={nft.image}
                  alt={nft.title}
                  className="w-full h-full object-cover aspect-square transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-3 flex flex-col gap-1 bg-black/70 absolute bottom-0 left-0 right-0">
                <h2 className="text-sm font-bold text-orange-400 truncate">{nft.title}</h2>
                <p className="text-xs font-semibold text-orange-300">{nft.value}</p>
                <p className="text-[10px] text-gray-400 truncate">ID: {nft.id}</p>
              </div>
              <div className="absolute inset-0 bg-black/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2 text-center text-xs font-medium z-10">
                {nft.description}
              </div>
            </div>
          ))}
        </div>
        {filteredNFTs.length === 0 && (
          <div className="text-center text-orange-400 text-lg font-semibold py-12">
            No NFTs found.
          </div>
        )}
      </div>
    </Layout>
  );
}
