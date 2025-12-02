// src/firebase.js
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyClmwz3de55d07gJqtq-aXlnNmX5-wBDt0",
  authDomain: "hireportal-9eb96.firebaseapp.com",
  projectId: "hireportal-9eb96",
  storageBucket: "hireportal-9eb96.firebasestorage.app",
  messagingSenderId: "1075449951445",
  appId: "1:1075449951445:web:a16720d74096fc84551e5c",
  measurementId: "G-TJFBQ9TPY1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
