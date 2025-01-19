import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { Store } from 'react-notifications-component';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import AuthForm from './AuthForm';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailError(false);
    setPasswordError(false);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      Store.addNotification({
        title: 'Login Successful',
        message: 'You have successfully logged in.',
        type: 'success',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: {
          duration: 3000,
          onScreen: true,
        },
      });
      navigate('/');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setEmailError(true);
        Store.addNotification({
          title: 'Login Failed',
          message: 'No user found with this email.',
          type: 'danger',
          insert: 'top',
          container: 'top-right',
          animationIn: ['animate__animated', 'animate__fadeIn'],
          animationOut: ['animate__animated', 'animate__fadeOut'],
          dismiss: {
            duration: 3000,
            onScreen: true,
          },
        });
        document.getElementById('email').focus();
      } else if (error.code === 'auth/wrong-password') {
        setPasswordError(true);
        Store.addNotification({
          title: 'Login Failed',
          message: 'Incorrect password. Please try again.',
          type: 'danger',
          insert: 'top',
          container: 'top-right',
          animationIn: ['animate__animated', 'animate__fadeIn'],
          animationOut: ['animate__animated', 'animate__fadeOut'],
          dismiss: {
            duration: 3000,
            onScreen: true,
          },
        });
        document.getElementById('password').focus();
      } else {
        console.error('Login error:', error.message);
        Store.addNotification({
          title: 'Login Failed',
          message: 'An unexpected error occurred. Please try again later.',
          type: 'danger',
          insert: 'top',
          container: 'top-right',
          animationIn: ['animate__animated', 'animate__fadeIn'],
          animationOut: ['animate__animated', 'animate__fadeOut'],
          dismiss: {
            duration: 3000,
            onScreen: true,
          },
        });
      }
    }
  };

  return (
    <AuthForm
      title="Login"
      submitButtonText="Login"
      submitButtonClasses="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300"
      footerText="Don't have an account?"
      footerLinkText="Register"
      footerLinkTo="/register"
      onSubmit={handleSubmit}
    >
      {/* Email Field */}
      <div className="mb-4">
        <label
          className="block text-gray-700 text-sm font-bold mb-2"
          htmlFor="email"
        >
          Email
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
            emailError ? 'border-red-500' : ''
          }`}
        />
      </div>
      {/* Password Field */}
      <div className="mb-6">
        <label
          className="block text-gray-700 text-sm font-bold mb-2"
          htmlFor="password"
        >
          Password
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline ${
            passwordError ? 'border-red-500' : ''
          }`}
        />
      </div>
      {/* Forgot Password Link */}
      <div className="flex justify-end">
        <Link to="/forgot-password" className="text-blue-500 hover:underline text-sm font-semibold">
          Forgot password?
        </Link>
      </div>
    </AuthForm>
  );
};

export default Login;