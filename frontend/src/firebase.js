import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // add this
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBMhsYxvCico1NhLzLYc83GUzs_RfmqpxU",
  authDomain: "connectsphere-ef851.firebaseapp.com",
  projectId: "connectsphere-ef851",
  storageBucket: "connectsphere-ef851.firebasestorage.app",
  messagingSenderId: "803384084402",
  appId: "1:803384084402:web:64fb03a11d07ac3bcc06ab",
  measurementId: "G-0G6MF88G67"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app); // 👈 add this

export { app, analytics };
