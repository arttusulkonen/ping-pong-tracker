import React, { useState } from 'react';
import { Store } from 'react-notifications-component';
import { Link, useNavigate } from 'react-router-dom';
import { auth, sendPasswordResetEmail } from '../../firebase';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email);
      Store.addNotification({
        title: 'Password reset email sent',
        message: 'A password reset email has been sent to your email address.',
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
      navigate('/login'); // Redirect to login page
    } catch (error) {
      console.error('Error sending password reset email:', error);
      Store.addNotification({
        title: 'Password reset failed',
        message: 'Invalid email address.',
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
    <div className='flex items-center justify-center min-h-screen'>
      <form
        onSubmit={handleSubmit}
        className='w-full max-w-sm mx-auto bg-white p-8 shadow-md'
      >
        <h2 className='text-2xl font-bold mb-6 text-gray-700 text-center'>
          Reset Password
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
            name='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
            placeholder='Email'
          />
        </div>
        <div className='flex items-center justify-between'>
          <button
          type='submit'
          className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
          >
            Reset Password
          </button>
        </div>
        <Link
          to='/login'
          className='block text-center text-sm text-blue-500 mt-4'
        >
          Back to Login
        </Link>
      </form>
    </div>
  );
};

export default ResetPassword;