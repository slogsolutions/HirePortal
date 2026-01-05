import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  useGSAP(() => {
    gsap.from(".login-card", {
      y: 80,
      opacity: 0,
      duration: 1.2,
      ease: "power3.out",
    });

    gsap.to(".bg-blob", {
      x: 80,
      y: -40,
      scale: 1.2,
      duration: 6,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    gsap.to(".bg-blob2", {
      x: -60,
      y: 60,
      scale: 1.2,
      duration: 7,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    gsap.from(".title", {
      opacity: 0,
      y: -20,
      delay: 0.3,
      duration: 1,
      ease: "power3.out",
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      await login({ email, password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0b1220]">

      {/* Background Blobs */}
      <div className="bg-blob absolute w-[500px] h-[500px] bg-cyan-400 opacity-30 blur-3xl rounded-full -top-24 -left-10"></div>
      <div className="bg-blob2 absolute w-[500px] h-[500px] bg-purple-500 opacity-30 blur-3xl rounded-full bottom-0 right-0"></div>

      {/* Glassmorphism Card */}
      <form
        onSubmit={handleSubmit}
        className="
          login-card w-full max-w-md p-8 
          bg-white/10 backdrop-blur-xl border border-white/20
          rounded-2xl shadow-2xl 
          text-white
        "
      >
        <h2 className="title text-3xl font-bold mb-6 tracking-wide">
          Welcome Back 
        </h2>

        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-400 text-red-200 px-4 py-2 rounded">
            {error}
          </div>
        )}

        {/* Email */}
        <label className="block mb-4">
          <span className="text-sm text-gray-200">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="
              mt-1 w-full p-3 rounded-md
              bg-white/10 border border-white/20
              focus:outline-none focus:border-cyan-400
            "
            type="email"
          />
        </label>

        {/* Password */}
        <label className="block mb-6">
          <span className="text-sm text-gray-200">Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="
              mt-1 w-full p-3 rounded-md
              bg-white/10 border border-white/20
              focus:outline-none focus:border-cyan-400
            "
            type="password"
          />
        </label>

        {/* Button */}
        <button
          type="submit"
          className="
            w-full py-3 text-lg font-semibold 
            bg-gradient-to-r from-cyan-400 to-blue-500 
            rounded-md shadow-[6px_6px_0px_#000]
            hover:scale-[1.02] active:scale-[0.98]
            transition-all duration-200
          "
        >
          Sign In
        </button>

        <p className="mt-5 text-sm text-gray-300">
          Don't have an account?{" "}
          <Link to="/complain" className="text-cyan-300 underline">
            Contact Admin 
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
