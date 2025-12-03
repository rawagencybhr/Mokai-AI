

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCQCT7jSJQYJYBhFIVapgpBQOhenUDs3K4",
  authDomain: "mokai-bot.firebaseapp.com",
  projectId: "mokai-bot",
  storageBucket: "mokai-bot.firebasestorage.app",
  messagingSenderId: "28722487944",
  appId: "1:28722487944:web:0183b2afc0ef7d021e753d",
  measurementId: "G-MC2P6DLV9N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Analytics only in browser environment to prevent Vercel Serverless crashes
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };
