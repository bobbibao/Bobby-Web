import * as admin from 'firebase-admin';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
const firebaseConfig = {
  type: process.env.TYPE,
  project_id: process.env.PROJECT_ID,
  private_key_id: process.env.PRIVATE_KEY_ID,
  private_key: process.env.PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.CLIENT_EMAIL,
  client_id: process.env.CLIENT_ID,
  auth_uri: process.env.AUTH_URI,
  token_uri: process.env.TOKEN_URI,
  auth_provider_x509_cert_url: process.env.AUTH_CERT_URL,
  client_x509_cert_url: process.env.CLIENT_CERT_URL,
  universe_domain: process.env.UNIVERSAL_DOMAIN,
} as admin.ServiceAccount;

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
});

const prisma = new PrismaClient();

async function updateEmailVerifiedFromFirebase() {
  try {
    console.log('Starting to update emailVerified from Firebase...');

    // Fetch all users from Firebase Auth
    const listUsersResult = await admin.auth().listUsers();
    const firebaseUsers = listUsersResult.users;

    console.log(`Found ${firebaseUsers.length} users in Firebase Auth`);

    let updatedCount = 0;

    for (const firebaseUser of firebaseUsers) {
      // Check if user exists in database
      const dbUser = await prisma.user.findUnique({
        where: { id: firebaseUser.uid },
      });

      if (dbUser) {
        // Update emailVerified if different
        if (dbUser.emailVerified !== firebaseUser.emailVerified) {
          await prisma.user.update({
            where: { id: firebaseUser.uid },
            data: { emailVerified: firebaseUser.emailVerified },
          });
          updatedCount++;
          console.log(`Updated user ${firebaseUser.uid}: emailVerified = ${firebaseUser.emailVerified}`);
        }
      } else {
        console.log(`User ${firebaseUser.uid} not found in database`);
      }
    }

    console.log(`Successfully updated emailVerified for ${updatedCount} users`);
  } catch (error) {
    console.error('Error updating emailVerified:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateEmailVerifiedFromFirebase();
