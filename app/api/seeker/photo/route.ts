import { NextRequest, NextResponse } from 'next/server';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { storage, db } from '../../../../lib/firebase'; // Adjust path as needed

// Helper function to get file extension
const getFileExtension = (filename: string): string => {
    return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
};

// GET handler to retrieve seeker photo URL
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const seekerId = searchParams.get('seekerId');

    if (!seekerId) {
        return NextResponse.json({ message: 'Seeker ID is required' }, { status: 400 });
    }

    if (!db) {
        console.error('Firestore not initialized');
        return NextResponse.json({ message: 'Internal Server Error: Firestore not initialized' }, { status: 500 });
    }

    try {
        const seekerRef = doc(db, 'seekers', seekerId);
        const seekerSnap = await getDoc(seekerRef);

        if (!seekerSnap.exists()) {
            return NextResponse.json({ message: 'Seeker not found' }, { status: 404 });
        }

        // Check both photoUrl and photoURL fields for maximum compatibility
        const data = seekerSnap.data();
        const photoUrl = data?.photoUrl || data?.photoURL || null;

        return NextResponse.json({ photoUrl });

    } catch (error: any) {
        console.error('Error fetching seeker photo URL:', error);
        // Fornecer feedback mais específico baseado no tipo de erro
        const errorMessage = error.code === 'permission-denied' 
            ? 'Permissão negada ao acessar o documento' 
            : 'Erro interno ao buscar URL da foto';
        return NextResponse.json({ message: errorMessage, error: error.message }, { status: 500 });
    }
}


// POST handler to upload seeker photo
export async function POST(request: NextRequest) {
    if (!db || !storage) {
        console.error('Firestore or Storage not initialized');
        return NextResponse.json({ message: 'Internal Server Error: Firebase services not initialized' }, { status: 500 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const seekerId = formData.get('seekerId') as string | null;

        if (!file) {
            return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
        }
        if (!seekerId) {
            return NextResponse.json({ message: 'Seeker ID is required' }, { status: 400 });
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ 
                message: 'Invalid file type. Only image files are allowed.' 
            }, { status: 400 });
        }
        
        // Validate file size (5MB max)
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ 
                message: 'File too large. Maximum size is 5MB.' 
            }, { status: 400 });
        }

        console.log(`Received photo upload for seeker: ${seekerId}, filename: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);

        // Define storage path (e.g., seekers/{seekerId}/profile.[ext])
        const fileExtension = getFileExtension(file.name);
        const storagePath = `seekers/${seekerId}/profile.${fileExtension}`;
        const storageRef = ref(storage, storagePath);

        // Check if seeker exists
        const seekerRef = doc(db, 'seekers', seekerId);
        const seekerSnap = await getDoc(seekerRef);

        if (!seekerSnap.exists()) {
            return NextResponse.json({ message: 'Seeker not found' }, { status: 404 });
        }

        // Delete old photo if it exists and has a different extension (optional but good practice)
        const currentPhotoUrl = seekerSnap.data()?.photoUrl;
        if (currentPhotoUrl) {
            try {
                const oldStorageRef = ref(storage, currentPhotoUrl);
                // Check if the old path is different before deleting
                if (oldStorageRef.fullPath !== storageRef.fullPath) {
                     await deleteObject(oldStorageRef);
                     console.log(`Deleted old photo for seeker ${seekerId} at ${oldStorageRef.fullPath}`);
                }
            } catch (deleteError: any) {
                 // Ignore 'object-not-found' error, log others
                if (deleteError.code !== 'storage/object-not-found') {
                    console.error(`Error deleting old photo for seeker ${seekerId}:`, deleteError);
                }
            }
        }


        // Upload the new file
        const snapshot = await uploadBytes(storageRef, file);
        console.log(`Uploaded photo for seeker ${seekerId} to ${snapshot.metadata.fullPath}`);

        // Get the download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log(`Download URL for seeker ${seekerId}: ${downloadURL}`);

        // Update the seeker's document in Firestore with the new photo URL
        // Store with both field names for maximum compatibility
        await updateDoc(seekerRef, {
            photoUrl: downloadURL,
            photoURL: downloadURL // Add uppercase version for compatibility
        });
        console.log(`Updated Firestore for seeker ${seekerId} with new photo URL.`);

        return NextResponse.json({ message: 'Photo uploaded successfully', url: downloadURL });

    } catch (error: any) {
        console.error('Error uploading seeker photo:', error);
        // Provide more specific error messages if possible
        let errorMessage = 'Internal Server Error';
        if (error.code === 'storage/unauthorized') {
            errorMessage = 'Permission denied. Check Storage rules.';
        } else if (error.code === 'storage/canceled') {
            errorMessage = 'Upload canceled.';
        }
        return NextResponse.json({ message: errorMessage, error: error.message || String(error) }, { status: 500 });
    }
}
