// Script para criar vaga de teste no Firestore real
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBUZ-F0kzPxRdlSkBacI2AnlNe8_-BuSZo",
  authDomain: "gate33-b5029.firebaseapp.com",
  projectId: "gate33-b5029",
  storageBucket: "gate33-b5029.firebasestorage.app",
  messagingSenderId: "823331487278",
  appId: "1:823331487278:web:932f2936eef09e37c3a9bf"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function criarVagaTeste() {
  const vaga = {
    title: "Desenvolvedor Web3 Senior",
    description: "Atue em projetos inovadores de blockchain.",
    category: "Desenvolvimento",
    company: "Gate33",
    requiredSkills: "Solidity, React, Node.js, Web3.js",
    salaryRange: "15000-25000",
    location: "Remoto",
    employmentType: "CLT",
    experienceLevel: "Senior",
    blockchainExperience: "Avançado",
    remoteOption: "Sim",
    contactEmail: "rh@gate33.com",
    applicationLink: "",
    pricingPlanId: "test-plan",
    paymentStatus: "completed",
    paymentId: "test-payment-id",
    responsibilities: "• Desenvolver smart contracts\n• Integrar sistemas blockchain\n• Liderar equipe técnica",
    idealCandidate: "• Proativo\n• Experiência comprovada em Web3\n• Inglês avançado",
    screeningQuestions: [
      "Descreva sua experiência com smart contracts.",
      "Já trabalhou com DeFi? Dê exemplos.",
      "Qual seu maior desafio em blockchain?"
    ],
    companyId: "company-susana1-1745631109298",
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  };
  try {
    const docRef = await addDoc(collection(db, "jobs"), vaga);
    console.log("Vaga criada com sucesso! ID:", docRef.id);
  } catch (e) {
    console.error("Erro ao criar vaga:", e);
  }
}

criarVagaTeste();
