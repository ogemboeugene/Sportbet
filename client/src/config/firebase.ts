// Firebase configuration temporarily disabled for build
/*
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
*/

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "your-firebase-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
};

// Initialize Firebase (temporarily disabled)
// const app = initializeApp(firebaseConfig);

// Initialize Firebase services (temporarily disabled)
// export const auth = getAuth(app);
// export const db = getFirestore(app);
// export const storage = getStorage(app);
// export const analytics = getAnalytics(app);

// Temporary exports to avoid build errors
export const auth = null;
export const db = null;
export const storage = null;
export const analytics = null;

export default firebaseConfig;
