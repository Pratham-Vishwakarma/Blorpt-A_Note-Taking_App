import React, { useRef, useState, useEffect } from "react";
import "./App.css";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, signOut } from "firebase/auth";
import CryptoJS from "crypto-js";
import { BrowserRouter as Router } from 'react-router-dom';
import Navbar from "./components/Navbar";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDZ71awUgEPUAEIT0bYjUonAzOGCj7pwPc",
  authDomain: "blorpt.firebaseapp.com",
  projectId: "blorpt",
  storageBucket: "blorpt.firebasestorage.app",
  messagingSenderId: "57784274053",
  appId: "1:57784274053:web:8dd3c1624110f9c34d6dec",
  measurementId: "G-10YEP3QH77",
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

function App() {
  const [text, setText] = useState("");
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [user, setUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false); // Track if the user is anonymous
  const [email, setEmail] = useState(""); // For signup/login email
  const [password, setPassword] = useState(""); // For signup/login password

  // Anonymous Sign-In
  useEffect(() => {
    signInAnonymously(auth)
      .then(() => {
        console.log("Signed in anonymously");
        setUser(auth.currentUser);
        setIsAnonymous(true);
      })
      .catch((error) => {
        console.error("Error during anonymous sign-in", error);
      });
  }, []);

  useEffect(() => {
    // Ensure canvasRef is set before using it
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth * 0.8;
      canvas.height = 400; 
      canvas.style.border = "1px solid #ccc";

      const context = canvas.getContext("2d");
      context.lineCap = "round";
      context.strokeStyle = "black";
      context.lineWidth = 3;
      contextRef.current = context;
    }
  }, []);

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
  };

  const stopDrawing = () => {
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  const encryptData = (data) => {
    const secretKey = "mySecretKey";
    return CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
  };

  const decryptData = (encryptedData) => {
    const secretKey = "mySecretKey";
    const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  };

  const saveNoteToCloud = async () => {
    if (!user) {
      alert("You must be logged in to save notes!");
      return;
    }

    const canvas = canvasRef.current;
    const drawing = canvas.toDataURL();
    const note = { text, drawing };
    const encryptedNote = encryptData(note);

    try {
      await setDoc(doc(db, "users", user.uid), { note: encryptedNote });
      alert("Note saved to cloud!");
    } catch (error) {
      console.error("Error saving note: ", error);
    }
  };

  const loadNoteFromCloud = async () => {
    if (!user) {
      alert("You must be logged in to load notes!");
      return;
    }

    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const encryptedNote = docSnap.data().note;
        const savedNote = decryptData(encryptedNote);
        setText(savedNote.text);

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        const img = new Image();
        img.src = savedNote.drawing;
        img.onload = () => {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(img, 0, 0);
        };
        alert("Note loaded from cloud!");
      } else {
        alert("No cloud note found!");
      }
    } catch (error) {
      console.error("Error loading note: ", error);
    }
  };

  const saveNote = () => {
    const canvas = canvasRef.current;
    const drawing = canvas.toDataURL();
    const note = { text, drawing };
    localStorage.setItem("note", JSON.stringify(note));
    alert("Note saved locally!");
  };

  const loadNote = () => {
    const savedNote = JSON.parse(localStorage.getItem("note"));
    if (savedNote) {
      setText(savedNote.text);
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      const img = new Image();
      img.src = savedNote.drawing;
      img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
      };
    } else {
      alert("No saved note found locally!");
    }
  };

  const exportTextNote = () => {
    const blob = new Blob([text], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "note.txt";
    link.click();
  };

  const exportDrawing = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "drawing.png";
    link.click();
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAnonymous(false);
      alert("Logged out successfully!");
    } catch (error) {
      console.error("Error logging out: ", error.message);
    }
  };

  const signUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      alert("Signed up successfully!");
    } catch (error) {
      console.error("Sign Up Error: ", error.message);
      alert("Error during signup: " + error.message);
    }
  };

  const signIn = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      alert("Signed in successfully!");
    } catch (error) {
      console.error("Sign In Error: ", error.message);
      alert("Error during sign in: " + error.message);
    }
  };

  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode === "true") {
      setIsDarkMode(true);
      document.body.classList.add("dark-mode");
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", !isDarkMode ? "true" : "false");
  };

  return (
    <Router>
      <Navbar
        saveNote={saveNote}
        loadNote={loadNote}
        exportTextNote={exportTextNote}
        exportDrawing={exportDrawing}
        saveNoteToCloud={saveNoteToCloud}
        loadNoteFromCloud={loadNoteFromCloud}
        toggleDarkMode={toggleDarkMode}
        isDarkMode={isDarkMode}
      />
      <div className="App">
        <h1>Blorpt</h1>

        {!user ? (
          <div className="auth-section">
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
            <button onClick={signUp}>Sign Up</button>
            <button onClick={signIn}>Sign In</button>
            <button onClick={() => signInAnonymously(auth).then(() => {
              setUser(auth.currentUser);
              setIsAnonymous(true);
            })}>Sign In Anonymously</button>
          </div>
        ) : (
          <div className="auth-section">
            <p>Welcome, {isAnonymous ? "Anonymous User" : user.email}!</p>
            <button onClick={logOut}>Log Out</button>
          </div>
        )}

        <div className="note-section">
          <textarea
            placeholder="Type your notes here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>

        <div className="button-section">
          <button onClick={saveNote}>Save Locally</button>
          <button onClick={loadNote}>Load Locally</button>
          <button onClick={exportTextNote}>Export Text</button>
          <button onClick={exportDrawing}>Export Drawing</button>
          <button onClick={saveNoteToCloud}>Save to Cloud</button>
          <button onClick={loadNoteFromCloud}>Load from Cloud</button>
        </div>
      </div>
    </Router>
  );
}

export default App;
