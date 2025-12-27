import React, { useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const ContactAdmin = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useGSAP(() => {
    gsap.from(".contact-card", {
      y: 100,
      opacity: 0,
      duration: 1.2,
      ease: "power3.out",
    });

    gsap.to(".blob1", {
      x: 80,
      y: -30,
      scale: 1.2,
      duration: 6,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    gsap.to(".blob2", {
      x: -60,
      y: 50,
      scale: 1.2,
      duration: 7,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name || !email || !subject || !message) {
      setError("Please fill all fields");
      return;
    }

    // Here you can call API
    // await axios.post("/api/contact-admin", {name,email,subject,message})

    setSuccess("Your request has been submitted successfully!");
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0b1220]">
      
      {/* Animated Background */}
      <div className="blob1 absolute w-[500px] h-[500px] bg-cyan-400 opacity-30 blur-3xl rounded-full -top-24 -left-10"></div>
      <div className="blob2 absolute w-[500px] h-[500px] bg-purple-500 opacity-30 blur-3xl rounded-full bottom-0 right-0"></div>

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="
          contact-card w-full max-w-xl p-8 
          bg-white/10 backdrop-blur-xl border border-white/20
          rounded-2xl shadow-2xl text-white
        "
      >
        <h1 className="text-3xl font-bold mb-4">Contact Admin</h1>
        <p className="text-gray-300 mb-6">
          Have an issue, complaint, or need assistance? Send your message here.
        </p>

        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-400 text-red-200 px-4 py-2 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-500/20 border border-green-400 text-green-200 px-4 py-2 rounded">
            {success}
          </div>
        )}

        {/* Name */}
        <label className="block mb-4">
          <span className="text-sm text-gray-200">Full Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full p-3 rounded-md bg-white/10 border border-white/20 focus:outline-none focus:border-cyan-400"
            type="text"
          />
        </label>

        {/* Email */}
        <label className="block mb-4">
          <span className="text-sm text-gray-200">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full p-3 rounded-md bg-white/10 border border-white/20 focus:outline-none focus:border-cyan-400"
            type="email"
          />
        </label>

        {/* Subject */}
        <label className="block mb-4">
          <span className="text-sm text-gray-200">Subject</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full p-3 rounded-md bg-white/10 border border-white/20 focus:outline-none focus:border-cyan-400"
            type="text"
          />
        </label>

        {/* Message */}
        <label className="block mb-6">
          <span className="text-sm text-gray-200">Your Message</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="mt-1 w-full p-3 rounded-md bg-white/10 border border-white/20 focus:outline-none focus:border-cyan-400"
          />
        </label>

        {/* Submit */}
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
          Submit Request
        </button>
      </form>
    </div>
  );
};

export default ContactAdmin;
