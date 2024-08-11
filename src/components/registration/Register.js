import { updateProfile } from 'firebase/auth';
import { doc, setDoc, getDocs, collection } from 'firebase/firestore';
import React, { useState } from 'react';
import { Store } from 'react-notifications-component';
import { Link, useNavigate } from 'react-router-dom';
import { auth, createUserWithEmailAndPassword, db } from '../../firebase';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [nameError, setNameError] = useState(false);

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
        throw new Error('4');
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: name,
      });

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        name: name,
        rating: 1000,
      });

      Store.addNotification({
        title: 'Registration successful',
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
      if (error.message === '4') {
        setNameError(true);
        Store.addNotification({
          title: 'Registration failed',
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
      } else if (error.message.includes('auth/email-already-in-use')) {
        setEmailError(true);
        Store.addNotification({
          title: 'Registration failed',
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
      } else if (error.message.includes('auth/weak-password')) {
        setPasswordError(true);
        Store.addNotification({
          title: 'Registration failed',
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
      }
    }
  };

  return (
    <div className='flex items-center justify-center min-h-screen'>
      <form
        onSubmit={handleSubmit}
        className='w-full max-w-sm mx-auto bg-white p-8 shadow-md'
      >
        <h2 className='text-2xl font-outfit font-bold mb-6 text-gray-700 text-center'>
          Register
        </h2>
        <div className='mb-4'>
          <label
            className='block text-gray-700 text-sm font-bold mb-2'
            htmlFor='name'
          >
            Nickname
          </label>
          <input
            type='text'
            id='name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Nickname'
            required
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
              nameError ? 'border-red-500' : ''
            }`}
          />
        </div>
        <div className='mb-4'>
          <label
            className='block text-gray-700 text-sm font-bold mb-2'
            htmlFor='email'
          >
            Email
          </label>
          <input
            type='email'
            id='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder='Email'
            required
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
              emailError ? 'border-red-500' : ''
            }`}
          />
        </div>
        <div className='mb-6'>
          <label
            className='block text-gray-700 text-sm font-bold mb-2'
            htmlFor='password'
          >
            Password
          </label>
          <input
            type='password'
            id='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder='Password'
            required
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline ${
              passwordError ? 'border-red-500' : ''
            }`}
          />
        </div>
        <div className='flex items-center justify-between'>
          <button
            type='submit'
            className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
          >
            Register
          </button>
        </div>
        <div className='mt-4 text-center'>
          <Link to='/login' className='text-blue-500 hover:underline'>
            Already have an account? Login
          </Link>
        </div>
      </form>
    </div>
  );
};

export default Register;
