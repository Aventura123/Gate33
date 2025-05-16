/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as admin from "firebase-admin";

// Inicialize o Firebase Admin SDK apenas se ainda não estiver inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

// Import functions from syncLearn2EarnStatus
import { syncLearn2EarnStatusJob, syncLearn2EarnStatusV2 } from "../syncLearn2EarnStatus";

// Re-export for external use
export { syncLearn2EarnStatusJob, syncLearn2EarnStatusV2 };