import '../styles/globals.css';
import React from 'react';

export default function MyApp({ Component, pageProps }) {
  return (
    <div className="app-container bg-gray-50 min-h-screen text-gray-900">
      <Component {...pageProps} />
    </div>
  );
}
