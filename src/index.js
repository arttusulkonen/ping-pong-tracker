import 'animate.css/animate.min.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import 'react-notifications-component/dist/theme.css';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import Header from './components/header/Header';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Router>
    <Header />
    <App />
  </Router>
);
