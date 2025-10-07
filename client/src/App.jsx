import { useState } from 'react'
import './App.css'
import Navbar from './components/Navbar'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./pages/ProtectedRoute";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CandidatesPage from "./pages/CandidatesPage";
import CandidateProfilePage from "./pages/CandidateProfilePage";
function App() {
  const [count, setCount] = useState(0)

  return (
  <AuthProvider>
<BrowserRouter>
<Navbar />


<Routes>
<Route path="/" element={<HomePage />} />


<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />


{/* Protected routes wrapper - uses <Outlet /> inside */}
<Route element={<ProtectedRoute />}>
<Route path="/dashboard" element={<Dashboard/>} />
</Route>


<Route path="/candidates" element={<CandidatesPage />} />
<Route path="/candidates/:id" element={<CandidateProfilePage />} />


{/* catch-all -> redirect to home */}
<Route path="*" element={<Navigate to="/" replace />} />
</Routes>
</BrowserRouter>
</AuthProvider>
  )
}

export default App
