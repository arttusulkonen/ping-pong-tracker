// src/components/Announcement.jsx
import { X } from 'lucide-react';
import React from 'react';

export default function Announcement({ onClose }) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
      <div className='relative max-w-lg w-full bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-lg shadow-xl p-6 z-[9px]'>
        {/* Кнопка закрыть */}
        <button
          onClick={onClose}
          className='absolute top-4 right-4 text-white hover:text-gray-200'
          aria-label='Close announcement'
        >
          <X size={20} />
        </button>

        <h1 className='text-3xl sm:text-4xl font-bold mb-4 text-center'>
          Big changes are coming!
        </h1>
        <p className='max-w-md mx-auto text-lg sm:text-xl text-center mb-6'>
          Our old Ping-Pong tracker is going into the history books—an all-new,
          more powerful version is on its way with deeper stats, fresh features
          and a shinier UI.
        </p>
        <p className='text-center mb-8'>
          Don’t worry—your username and password remain exactly the same.
        </p>
        <div className='flex justify-center'>
          <a
            href='https://tabletennis-f4c23.web.app'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-block bg-white text-blue-800 font-semibold px-6 py-3 rounded-lg shadow hover:bg-gray-100 transition'
          >
            Go to the New Site →
          </a>
        </div>
      </div>
    </div>
  );
}
