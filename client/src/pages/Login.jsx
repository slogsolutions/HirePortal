import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow"
      >
        <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-100">
          Login
        </h2>

        {error && <div className="mb-4 text-red-600">{error}</div>}

        <label className="block mb-3">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Email
          </span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2"
            type="email"
          />
        </label>

        <label className="block mb-4">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Password
          </span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2"
            type="password"
          />
        </label>

        <button
          type="submit"
          className="w-full py-2 bg-blue-500 text-white rounded-md"
        >
          Sign in
        </button>

        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          Don't have an account?{" "}
          <Link to="/register" className="text-blue-500">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
