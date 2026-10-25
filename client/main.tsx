import React from 'react';
import { createRoot } from 'react-dom/client';
import MediaClient from './media-client.js';
import './style.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><MediaClient/></React.StrictMode>);
