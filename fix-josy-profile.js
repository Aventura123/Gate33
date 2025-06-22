const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBUZ-F0kzPxRdlSkBacI2AnlNe8_-BuSZo",
  authDomain: "gate33-b5029.firebaseapp.com",
  projectId: "gate33-b5029",
  storageBucket: "gate33-b5029.firebasestorage.app",
  messagingSenderId: "823331487278",
  appId: "1:823331487278:web:932f2936eef09e37c3a9bf"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixJosyProfile() {
  const josyId = "GKRec3MZlXWKUFuViqPF4uIx6ZL2";
  
  try {
    // Primeiro, vamos verificar se o perfil existe
    const docRef = doc(db, "seekers", josyId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log("Perfil existente encontrado:", docSnap.data());
    }
    
    // Dados completos para o perfil da Josy
    const josyProfile = {
      name: "Josy Silva",
      email: "josy.test@gate33.net",
      phone: "+351 912 345 678",
      location: "Lisboa, Portugal",
      skills: "JavaScript, React, Node.js, Python, HTML, CSS, SQL, Git, TypeScript, MongoDB", // STRING
      experience: "3 anos",
      education: "Licenciatura em Engenharia Informática - Universidade de Lisboa",
      bio: "Desenvolvedora Full-Stack apaixonada por tecnologia e inovação. Experiência em desenvolvimento web moderno com React e Node.js. Sempre em busca de novos desafios e oportunidades de aprendizagem.",
      portfolio: "https://josy-portfolio.gate33.net",
      linkedIn: "https://linkedin.com/in/josy-silva-dev",
      github: "https://github.com/josy-silva",
      availability: "Imediata",
      expectedSalary: "45000",
      workType: "Remote",
      profileComplete: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Preferências de notificação
      notificationPreferences: {
        supportReplies: true,
        instantJobs: true,
        marketing: false
      }
    };
    
    // Atualizar o perfil
    await setDoc(docRef, josyProfile, { merge: true });
    console.log("✅ Perfil da Josy atualizado com sucesso!");
    console.log("ID:", josyId);
    console.log("Nome:", josyProfile.name);
    console.log("Skills (STRING):", josyProfile.skills);
    
  } catch (error) {
    console.error("❌ Erro ao atualizar perfil:", error);
  }
}

// Executar a função
fixJosyProfile().then(() => {
  console.log("Script finalizado!");
  process.exit(0);
}).catch((error) => {
  console.error("Erro no script:", error);
  process.exit(1);
});
