import React, { useState } from 'react';
import { Store } from 'react-notifications-component';
import { Link, useNavigate } from 'react-router-dom';
import { auth, signInWithEmailAndPassword } from '../../firebase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      Store.addNotification({
        title: 'Login successful',
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
      navigate('/'); // Redirect to home page
    } catch (error) {
      console.error('Error logging in:', error);
      Store.addNotification({
        title: 'Login failed',
        message: 'Invalid email or password.',
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
  };

  return (
    <div className='flex items-center justify-center min-h-screen '>
      <form
        onSubmit={handleSubmit}
        className='w-full max-w-sm mx-auto bg-white p-8 shadow-md'
      >
        <h2 className='text-2xl font-outfit font-bold mb-6 text-gray-700 text-center'>
          Login
        </h2>
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
            className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
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
            className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline'
          />
        </div>
        <div className='flex items-center justify-between'>
          <button
            type='submit'
            className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
          >
            Login
          </button>
        </div>
        <div className='mt-4 text-center flex flex-col'>
          <Link to='/register' className='text-blue-500 hover:underline'>
            Not registered? Register
          </Link>
          {/* forgot the password */}
          <Link to='/forgot-password' className='text-blue-500 hover:underline'>
            Forgot password?
          </Link>
        </div>
      </form>
    </div>
  );
};

export default Login;
