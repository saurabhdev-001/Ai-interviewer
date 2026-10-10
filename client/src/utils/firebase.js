import { initializeApp } from "firebase/app";
import {getAuth, GoogleAuthProvider} from "firebase/auth";

const firebaseConfig = {
  apiKey:import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: "interviewiq-b31e1.firebaseapp.com",
  projectId: "interviewiq-b31e1",
  storageBucket: "interviewiq-b31e1.firebasestorage.app",
  messagingSenderId: "692681833754",
  appId: "1:692681833754:web:7f71ba11b4bad70d9100a3"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const provider = new GoogleAuthProvider()

export { auth, provider }