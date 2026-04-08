import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ErrorBoundary from './components/ErrorBoundary';
import { ProtectedRoute, IndexRedirect } from './components/Navigation';
import { Toaster } from 'react-hot-toast';

// Page Imports
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
import UsersManagement from './pages/UsersManagement';
import Reports from './pages/Reports';
import Campuses from './pages/Campuses';
import SystemSettings from './pages/Settings';

import Landing from './pages/Landing';

// Role Groups for Authorization
const ADMIN_ONLY  = ['admin'];
const SCHEDULER   = ['admin', 'program_head', 'program_assistant'];
const ALL_LOGGED  = ['admin', 'program_head', 'program_assistant', 'viewer'];

export default function App() {
  return (
    <ErrorBoundary>
      <Toaster position="top-right" reverseOrder={false} />
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />

            <Route element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>

              {/* Scheduler + Admin routes */}
              <Route path="dashboard"      element={<ProtectedRoute allowedRoles={SCHEDULER}><Dashboard /></ProtectedRoute>} />
              <Route path="programs"       element={<ProtectedRoute allowedRoles={SCHEDULER}><Programs /></ProtectedRoute>} />
              <Route path="sections"       element={<ProtectedRoute allowedRoles={SCHEDULER}><Sections /></ProtectedRoute>} />
              <Route path="rooms"          element={<ProtectedRoute allowedRoles={SCHEDULER}><Rooms /></ProtectedRoute>} />
              <Route path="faculty"        element={<ProtectedRoute allowedRoles={SCHEDULER}><Faculty /></ProtectedRoute>} />
              <Route path="subjects"       element={<ProtectedRoute allowedRoles={SCHEDULER}><Subjects /></ProtectedRoute>} />
              <Route path="teaching-loads" element={<ProtectedRoute allowedRoles={SCHEDULER}><TeachingLoads /></ProtectedRoute>} />
              <Route path="schedules"      element={<ProtectedRoute allowedRoles={SCHEDULER}><Schedules /></ProtectedRoute>} />
              <Route path="requests"       element={<ProtectedRoute allowedRoles={SCHEDULER}><Requests /></ProtectedRoute>} />
              <Route path="reports"        element={<ProtectedRoute allowedRoles={SCHEDULER}><Reports /></ProtectedRoute>} />

              {/* Admin-only routes */}
              <Route path="audit-logs"     element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><AuditLogs /></ProtectedRoute>} />
              <Route path="users"          element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><UsersManagement /></ProtectedRoute>} />
              <Route path="campuses"       element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><Campuses /></ProtectedRoute>} />
              <Route path="settings"       element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><SystemSettings /></ProtectedRoute>} />

              {/* Viewer (faculty) route */}
              <Route path="my-schedule"    element={<ProtectedRoute allowedRoles={ALL_LOGGED}><MySchedule /></ProtectedRoute>} />
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
