// Script para marcar jobs específicos como featured
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBUZ-F0kzPxRdlSkBacI2AnlNe8_-BuSZo",
  authDomain: "gate33-b5029.firebaseapp.com",
  projectId: "gate33-b5029",
  storageBucket: "gate33-b5029.firebasestorage.app",
  messagingSenderId: "823331487278",
  appId: "1:823331487278:web:932f2936eef09e37c3a9bf"
};

// IDs dos jobs para marcar como featured
const jobIds = [
  'BRwyh4x6MavFzCBXWJWu',
  '2nTLYzrsb3mzADMbmkCI', 
  '4N9lOTKAoZfKgxBCeuvT'
];

async function markJobsAsFeatured() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('Marcando jobs como featured...');
    
    for (const jobId of jobIds) {
      try {
        const jobRef = doc(db, 'jobs', jobId);        await updateDoc(jobRef, {
          featured: true,
          isFeatured: true, // Para compatibilidade
          updatedAt: new Date().toISOString()
        });
        console.log(`✅ Job ${jobId} marcado como featured`);
      } catch (error) {
        console.error(`❌ Erro ao marcar job ${jobId}:`, error);
      }
    }
    
    console.log('✅ Processo concluído!');
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

markJobsAsFeatured();
