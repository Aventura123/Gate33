const admin = require("firebase-admin");

// Para usar com emulador, basta rodar:
// $env:FIRESTORE_EMULATOR_HOST="localhost:8080"; node clear-system-logs.js
// Para produção, descomente e ajuste o caminho do serviceAccount:
// const serviceAccount = require("./serviceAccountKey.json");
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   projectId: "SEU_PROJECT_ID"
// });

if (!admin.apps.length) {
  admin.initializeApp(); // Emulador: sem credencial
}

async function clearSystemLogs() {
  const db = admin.firestore();
  const snapshot = await db.collection("systemLogs").get();
  if (snapshot.empty) {
    console.log("Nenhum log encontrado em systemLogs.");
    return;
  }
  const batch = db.batch();
  let count = 0;
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
    count++;
  });
  await batch.commit();
  console.log(`Removidos ${count} logs da coleção systemLogs.`);
}

clearSystemLogs().then(() => process.exit(0));
