import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

// Configure Environment
dotenv.config();

// Route Imports
import authRoutes from './routes/auth.js';
import facultyRoutes from './routes/faculty.js';
import subjectRoutes from './routes/subjects.js';
import teachingLoadRoutes from './routes/teachingLoads.js';
import scheduleRoutes from './routes/schedules.js';
import dashboardRoutes from './routes/dashboard.js';
import termsRoutes from './routes/terms.js';
import programsRoutes from './routes/programs.js';
import sectionsRoutes from './routes/sections.js';
import roomsRoutes from './routes/rooms.js';
import unavailabilityRoutes from './routes/unavailability.js';
import bulkRoutes from './routes/bulk.js';
import requestsRoutes from './routes/requests.js';
import auditLogRoutes from './routes/auditLogs.js';
import exportRoutes from './routes/export.js';
import usersRoutes from './routes/users.js';
import notificationsRoutes from './routes/notifications.js';
import reportsRoutes from './routes/reports.js';
import campusesRoutes from './routes/campuses.js';
import settingsRoutes from './routes/settings.js';

// Utility Imports
import { setIo } from './utils/socketStore.js';

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const app = express();
const server = http.createServer(app);

let io: any;

if (process.env.VERCEL) {
  // Mock Socket.io for Vercel Serverless environment
  io = {
    to: () => io,
    emit: () => {},
    on: () => {}
  };
} else {
  io = new Server(server, {
    cors: {
      origin: FRONTEND_URL,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      credentials: true
    }
  });
}

setIo(io);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

// Realtime Sync Middleware
app.use((req: any, res: Response, next: NextFunction) => {
  req.io = io;
  next();
});

// Public Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes); // Public GET for branding, protected PUT for admin

// Protected Routes (Authentication Required)
import { authenticateToken } from './utils/auth.js';
app.use(authenticateToken);

app.use('/api/faculty', facultyRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/teaching-loads', teachingLoadRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/terms', termsRoutes);
app.use('/api/programs', programsRoutes);
app.use('/api/sections', sectionsRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/unavailability', unavailabilityRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/campuses', campusesRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('Faculty Scheduling System API with Realtime Sync is running on TypeScript...');
});

const PORT = process.env.PORT || 5001;

import { ApiError } from './utils/ApiError.js';

// Global Error Handler (Moved to end to catch route errors)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err instanceof ApiError ? err.statusCode : (err.status || 500);
  const message = err.message || 'Internal Server Error';
  const code = err instanceof ApiError ? err.code : 'INTERNAL_ERROR';

  if (statusCode >= 500) {
    console.error(` [API Error ${code}]:`, err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      details: (err instanceof ApiError) ? err.details : null,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Socket.io Lifecycle Management
io.on('connection', (socket) => {
  console.log('User connected to Realtime Sync:', socket.id);
  
  socket.on('join_campus', (campusId) => {
    socket.join(`campus_${campusId}`);
    console.log(`Socket ${socket.id} joined campus_${campusId}`);
  });

  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined user_${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected from Realtime Sync');
  });
});

// Server Initialization
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    console.log(`Realtime Server running on port ${PORT} [TypeScript Mode]`);
  });
}

export default app;
