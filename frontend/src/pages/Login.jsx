import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ for navigation
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
} from "firebase/auth";

const Login = () => {
  const [activeForm, setActiveForm] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const navigate = useNavigate(); // ✅ navigation hook

  // providers
  const googleProvider = new GoogleAuthProvider();
  const githubProvider = new GithubAuthProvider();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in:", userCred.user);
      navigate("/profile"); // ✅ redirect to profile page
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      console.log("Account created:", userCred.user);
      navigate("/profile");
    } catch (err) {
      alert(err.message);
    }
  };

  const socialLogin = async (provider) => {
    try {
      const prov = provider === "google" ? googleProvider : githubProvider;
      const res = await signInWithPopup(auth, prov);
      console.log(`${provider} user:`, res.user);
      navigate("/profile");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-400 to-purple-600 font-sans overflow-hidden">
      {/* floating circles */}
      <div className="absolute w-20 h-20 bg-white/10 rounded-full top-1/5 left-10 animate-[float_6s_ease-in-out_infinite]" />
      <div className="absolute w-32 h-32 bg-white/10 rounded-full bottom-1/5 right-10 animate-[float_6s_ease-in-out_infinite_2s]" />
      <div className="absolute w-24 h-24 bg-white/10 rounded-full top-3/4 left-1/4 animate-[float_6s_ease-in-out_infinite_4s]" />

      <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-10 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-white text-4xl font-bold drop-shadow-md">
            ConnectSphere
          </h1>
          <p className="text-white/80 text-sm mt-1">
            Collaborative Learning Platform
          </p>
        </div>

        <div className="flex bg-white/10 rounded-full overflow-hidden mb-8">
          <button
            className={`flex-1 py-2 text-center transition ${
              activeForm === "login"
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white"
            }`}
            onClick={() => setActiveForm("login")}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 text-center transition ${
              activeForm === "signup"
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white"
            }`}
            onClick={() => setActiveForm("signup")}
          >
            Sign Up
          </button>
        </div>

        {/* Login Form */}
        {activeForm === "login" && (
          <form className="space-y-5" onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-5 py-3 rounded-full bg-white/10 border-2 border-white/20 text-white placeholder-white/60 focus:outline-none focus:border-white/50"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-5 py-3 rounded-full bg-white/10 border-2 border-white/20 text-white placeholder-white/60 focus:outline-none focus:border-white/50"
            />

            <button
              type="submit"
              className="w-full py-3 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 text-white font-semibold shadow-lg hover:-translate-y-0.5 transition"
            >
              Sign In
            </button>

            <div className="text-center mt-2">
              <a
                href="#"
                className="text-white/80 text-sm hover:text-white transition"
              >
                Forgot your password?
              </a>
            </div>

            <div className="relative text-center my-4">
              <span className="relative z-10 bg-gradient-to-br from-indigo-400 to-purple-600 px-3 text-white/70 text-sm">
                or continue with
              </span>
              <div className="absolute left-0 right-0 top-1/2 h-px bg-white/20" />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => socialLogin("google")}
                className="flex-1 py-2 rounded-full border-2 border-white/20 bg-white/10 text-white text-sm hover:bg-white/20 transition"
              >
                📧 Google
              </button>
              <button
                type="button"
                onClick={() => socialLogin("github")}
                className="flex-1 py-2 rounded-full border-2 border-white/20 bg-white/10 text-white text-sm hover:bg-white/20 transition"
              >
                👨‍💻 GitHub
              </button>
            </div>
          </form>
        )}

        {/* Signup Form */}
        {activeForm === "signup" && (
          <form className="space-y-5" onSubmit={handleSignup}>
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-5 py-3 rounded-full bg-white/10 border-2 border-white/20 text-white placeholder-white/60 focus:outline-none focus:border-white/50"
            />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-5 py-3 rounded-full bg-white/10 border-2 border-white/20 text-white placeholder-white/60 focus:outline-none focus:border-white/50"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-5 py-3 rounded-full bg-white/10 border-2 border-white/20 text-white placeholder-white/60 focus:outline-none focus:border-white/50"
            />
            <input
              type="password"
              placeholder="Confirm Password"
              required
              className="w-full px-5 py-3 rounded-full bg-white/10 border-2 border-white/20 text-white placeholder-white/60 focus:outline-none focus:border-white/50"
            />

            <label className="flex items-center gap-2 text-white/80 text-sm">
              <input type="checkbox" required className="w-4 h-4" />
              I agree to the Terms of Service and Privacy Policy
            </label>

            <button
              type="submit"
              className="w-full py-3 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 text-white font-semibold shadow-lg hover:-translate-y-0.5 transition"
            >
              Create Account
            </button>

            <div className="relative text-center my-4">
              <span className="relative z-10 bg-gradient-to-br from-indigo-400 to-purple-600 px-3 text-white/70 text-sm">
                or continue with
              </span>
              <div className="absolute left-0 right-0 top-1/2 h-px bg-white/20" />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => socialLogin("google")}
                className="flex-1 py-2 rounded-full border-2 border-white/20 bg-white/10 text-white text-sm hover:bg-white/20 transition"
              >
                📧 Google
              </button>
              <button
                type="button"
                onClick={() => socialLogin("github")}
                className="flex-1 py-2 rounded-full border-2 border-white/20 bg-white/10 text-white text-sm hover:bg-white/20 transition"
              >
                👨‍💻 GitHub
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
