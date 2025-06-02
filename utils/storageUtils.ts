import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function uploadImage(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function getImageUrl(path: string): Promise<string> {
  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
}

export async function uploadPartnerLogo(partnerName: string, logoFile: File): Promise<string> {
  const path = `partners/${partnerName}/logo.png`; // Define the storage path for the partner logo
  return uploadImage(logoFile, path); // Reuse the existing uploadImage function
}
