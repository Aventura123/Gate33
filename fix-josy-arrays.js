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

async function fixJosyProfileArrays() {
  const josyId = "GKRec3MZlXWKUFuViqPF4uIx6ZL2";
  
  try {
    // Primeiro, vamos verificar se o perfil existe
    const docRef = doc(db, "seekers", josyId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log("Perfil existente encontrado. Verificando campos...");
      const currentData = docSnap.data();
      console.log("Experience atual:", typeof currentData.experience, currentData.experience);
      console.log("Languages atual:", typeof currentData.languages, currentData.languages);
    }
      // Dados corrigidos para o perfil da Josy - baseado na interface SeekerProfile
    const josyProfileFix = {
      // Campos básicos
      name: "Josy",
      surname: "Silva", 
      fullName: "Josy Silva",
      email: "josy.test@gate33.net",
      phone: "912 345 678",
      phoneCountryCode: "+351",
      location: "Lisboa, Portugal",
      address: "Rua das Flores, 123",
      zipCode: "1200-001",
      birthDate: "1995-06-15",
      gender: "female",
      nationality: "Portuguese",
      
      // Campos profissionais - SKILLS COMO STRING
      title: "Full-Stack Developer",
      skills: "JavaScript, React, Node.js, Python, HTML, CSS, SQL, Git, TypeScript, MongoDB, Docker, AWS", // STRING
      yearsOfExperience: 3,
      bio: "Desenvolvedora Full-Stack apaixonada por tecnologia e inovação. Experiência em desenvolvimento web moderno com React e Node.js. Sempre em busca de novos desafios e oportunidades de aprendizagem.",
      hourlyRate: 25,
      availability: "Full-time",
      
      // Arrays estruturados corretamente
      education: [
        {
          degree: "Licenciatura em Engenharia Informática",
          institution: "Universidade de Lisboa",
          year: "2020",
          description: "Especialização em Desenvolvimento de Software"
        }
      ],
      
      experience: [
        {
          position: "Frontend Developer",
          company: "Tech Solutions Ltd",
          location: "Lisboa, Portugal",
          startDate: "2021-03",
          endDate: "2023-12",
          current: false,
          description: "Desenvolvimento de aplicações web em React e integração com APIs RESTful"
        },
        {
          position: "Full-Stack Developer", 
          company: "StartupXYZ",
          location: "Remote",
          startDate: "2024-01",
          endDate: "",
          current: true,
          description: "Desenvolvimento full-stack com React, Node.js e MongoDB"
        }
      ],
      
      projects: [
        {
          name: "E-commerce Platform",
          description: "Plataforma de comércio eletrónico completa com React e Node.js",
          url: "https://github.com/josy-silva/ecommerce-platform",
          technologies: "React, Node.js, MongoDB, Stripe",
          startDate: "2023-01",
          endDate: "2023-06"
        }
      ],
      
      certifications: [
        {
          name: "AWS Certified Developer",
          issuer: "Amazon Web Services",
          date: "2023",
          url: "https://aws.amazon.com/certification/"
        }
      ],
      
      languages: [
        {
          language: "Portuguese", 
          proficiency: "Native"
        },
        {
          language: "English",
          proficiency: "Fluent"
        },
        {
          language: "Spanish",
          proficiency: "Intermediate"
        }
      ],
      
      // Links profissionais e sociais
      resumeUrl: "https://drive.google.com/file/d/example-josy-resume",
      portfolioUrl: "https://josy-portfolio.gate33.net",
      githubUrl: "https://github.com/josy-silva",
      linkedinUrl: "https://linkedin.com/in/josy-silva-dev",
      websiteUrl: "https://josy-portfolio.gate33.net",
      
      // Preferências
      remoteOnly: false,
      willingToRelocate: true,
      preferredLocations: ["Lisboa", "Porto", "Remote"],
      cryptoPaymentPreference: true,
      
      // Metadados
      profileComplete: true,
      completionRate: 95,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profileCreatedAt: new Date().toISOString(),
      profileUpdatedAt: new Date().toISOString(),
      
      // Preferências de notificação
      notificationPreferences: {
        supportReplies: true,
        instantJobs: true,
        marketing: false,
        jobAlerts: true,
        sms: true,
        email: true
      }
    };
    
    // Atualizar o perfil
    await setDoc(docRef, josyProfileFix, { merge: true });    console.log("✅ Perfil da Josy criado com estrutura completa!");
    console.log("ID:", josyId);
    console.log("Nome completo:", josyProfileFix.fullName);
    console.log("Skills (STRING):", josyProfileFix.skills);
    console.log("Experience (ARRAY):", josyProfileFix.experience?.length, "entradas");
    console.log("Education (ARRAY):", josyProfileFix.education?.length, "entradas");
    console.log("Languages (ARRAY):", josyProfileFix.languages?.length, "entradas");
    console.log("Projects (ARRAY):", josyProfileFix.projects?.length, "entradas");
    
  } catch (error) {
    console.error("❌ Erro ao corrigir perfil:", error);
  }
}

// Executar a função
fixJosyProfileArrays().then(() => {
  console.log("Script finalizado!");
  process.exit(0);
}).catch((error) => {
  console.error("Erro no script:", error);
  process.exit(1);
});
