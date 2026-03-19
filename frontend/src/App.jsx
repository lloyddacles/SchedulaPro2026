import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TermProvider } from './context/TermContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';

import Programs from './pages/Programs';
import Sections from './pages/Sections';
import Rooms from './pages/Rooms';
import Dashboard from './pages/Dashboard';
import Faculty from './pages/Faculty';
import Subjects from './pages/Subjects';
import TeachingLoads from './pages/TeachingLoads';
import Schedules from './pages/Schedules';
import MySchedule from './pages/MySchedule';
import Requests from './pages/Requests';
import AuditLogs from './pages/AuditLogs';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-brand-200 border-dashed rounded-full animate-spin"></div>
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/dashboard' : '/my-schedule'} replace />;
  }
  return children;
};

const IndexRedirect = () => {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'admin' ? '/dashboard' : '/my-schedule'} replace />;
};

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <TermProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<IndexRedirect />} />
            
            <Route path="dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>
            } />
            <Route path="programs" element={
              <ProtectedRoute allowedRoles={['admin']}><Programs /></ProtectedRoute>
            } />
            <Route path="sections" element={
              <ProtectedRoute allowedRoles={['admin']}><Sections /></ProtectedRoute>
            } />
            <Route path="rooms" element={
              <ProtectedRoute allowedRoles={['admin']}><Rooms /></ProtectedRoute>
            } />
            <Route path="faculty" element={
              <ProtectedRoute allowedRoles={['admin']}><Faculty /></ProtectedRoute>
            } />
            <Route path="subjects" element={
              <ProtectedRoute allowedRoles={['admin']}><Subjects /></ProtectedRoute>
            } />
            <Route path="teaching-loads" element={
              <ProtectedRoute allowedRoles={['admin']}><TeachingLoads /></ProtectedRoute>
            } />
            <Route path="schedules" element={
              <ProtectedRoute allowedRoles={['admin']}><Schedules /></ProtectedRoute>
            } />
            <Route path="requests" element={
              <ProtectedRoute allowedRoles={['admin']}><Requests /></ProtectedRoute>
            } />
            <Route path="audit-logs" element={
              <ProtectedRoute allowedRoles={['admin']}><AuditLogs /></ProtectedRoute>
            } />
            
            <Route path="my-schedule" element={
              <ProtectedRoute allowedRoles={['viewer', 'admin']}><MySchedule /></ProtectedRoute>
            } />
          </Route>
        </Routes>
      </TermProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
