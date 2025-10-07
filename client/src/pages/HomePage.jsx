import React from "react";


const HomePage = () => {
return (
<div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen">
<section id="home" className="min-h-screen flex flex-col justify-center items-center text-center px-6">
<h1 className="text-4xl md:text-6xl font-bold mb-4">Welcome to <span className="text-blue-500">MyWebsite</span></h1>
<p className="max-w-xl text-lg md:text-xl mb-6">A modern and responsive React website with dark mode support.</p>
<a href="#" className="px-6 py-3 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600">Get Started</a>
</section>


<section id="about" className="py-16 px-6 max-w-5xl mx-auto text-center">
<h2 className="text-3xl font-semibold mb-6">About Us</h2>
<p className="text-lg text-gray-600 dark:text-gray-300">
This is a simple website built with React and Tailwind CSS. It includes
a responsive Navbar, dark mode toggle, and a clean modern design.
</p>
</section>
</div>
);
};


export default HomePage;