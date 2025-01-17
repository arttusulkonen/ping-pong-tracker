import React from 'react';
import { Link } from 'react-router-dom';

const WelcomePage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 p-4">
      <h1 className="text-5xl font-bold text-white mb-6 text-center">
        Welcome to Ping-Pong Stats Central! 🏓🎉
      </h1>
      <p className="text-lg text-white mb-8 text-center max-w-md">
        Dive into the exciting world of ping-pong with our platform designed to track your stats, create vibrant rooms, and challenge your friends to thrilling matches. Whether you're a seasoned pro or just starting out, there's a place for you here!
      </p>
      <div className="flex space-x-4">
        <Link
          to="/login"
          className="bg-white text-blue-600 px-6 py-3 rounded-full font-semibold hover:bg-gray-200 transition"
        >
          Log In
        </Link>
        <Link
          to="/register"
          className="bg-blue-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-600 transition"
        >
          Register
        </Link>
      </div>
    </div>
  );
};

export default WelcomePage;