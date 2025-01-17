import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Store } from 'react-notifications-component';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [nameError, setNameError] = useState(false);

  // Function to format date as "dd.mm.yyyy"
  const getCurrentFormattedDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = now.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailError(false);
    setPasswordError(false);
    setNameError(false);

    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      let isNicknameTaken = false;

      usersSnapshot.forEach((doc) => {
        if (doc.data().name.toLowerCase() === name.toLowerCase()) {
          isNicknameTaken = true;
        }
      });

      if (isNicknameTaken) {
        throw new Error('NicknameTaken');
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Generate the current date in "dd.mm.yyyy" format
      const userRegistered = getCurrentFormattedDate();

      await updateProfile(user, {
        displayName: name,
      });

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        name: name,
        rating: 1000,
        registered: userRegistered,
      });

      Store.addNotification({
        title: 'Registration Successful',
        message: 'You have successfully registered.',
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
      if (error.message === 'NicknameTaken') {
        setNameError(true);
        Store.addNotification({
          title: 'Registration Failed',
          message: 'Nickname is already taken. Please choose another one.',
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
        document.getElementById('name').focus();
      } else if (error.code === 'auth/email-already-in-use') {
        setEmailError(true);
        Store.addNotification({
          title: 'Registration Failed',
          message: 'This email is already in use. Please use another email.',
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
      } else if (error.code === 'auth/weak-password') {
        setPasswordError(true);
        Store.addNotification({
          title: 'Registration Failed',
          message: 'Password should be at least 6 characters.',
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
        console.error('Registration error:', error.message);
        Store.addNotification({
          title: 'Registration Failed',
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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 p-4">
      <div className="w-full max-w-md bg-white bg-opacity-90 rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Register</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="name"
            >
              Nickname
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nickname"
              required
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                nameError ? 'border-red-500' : ''
              }`}
            />
          </div>
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
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300"
            >
              Register
            </button>
          </div>
        </form>
        <div className="mt-6 text-center">
          <span className="text-gray-700">Already have an account? </span>
          <Link to="/login" className="text-blue-500 hover:underline font-semibold">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;