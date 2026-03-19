const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const facultyRoutes = require('./routes/faculty');
const subjectRoutes = require('./routes/subjects');
const teachingLoadRoutes = require('./routes/teachingLoads');
const scheduleRoutes = require('./routes/schedules');
const dashboardRoutes = require('./routes/dashboard');
const termsRoutes = require('./routes/terms');
const programsRoutes = require('./routes/programs');
const sectionsRoutes = require('./routes/sections');
const roomsRoutes = require('./routes/rooms');
const unavailabilityRoutes = require('./routes/unavailability');
const bulkRoutes = require('./routes/bulk');
const requestsRoutes = require('./routes/requests');
const auditLogRoutes = require('./routes/auditLogs');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
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

app.get('/', (req, res) => {
  res.send('Faculty Scheduling System API is running...');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
