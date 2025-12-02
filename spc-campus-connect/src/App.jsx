import { useState } from 'react'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import Archive from './pages/Archive';
import PostDetail from './pages/PostDetail';
import ProfileSettings from './pages/ProfileSettings';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/profile" element={<ProfileSettings />} />
          <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
