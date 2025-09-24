const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

const userRoutes = require("./routes/userRoutes");
const clientRoutes = require('./routes/clientRoutes');
const coachRoutes = require('./routes/coachRoutes');
const adminRoutes = require('./routes/adminRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');            // admin
const paymentClientRoutes = require('./routes/paymentClientRoutes'); // client
const feedbackRoutes = require('./routes/feedbackRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const subscriptionClientRoutes = require("./routes/subscriptionClientRoutes");
const feedbackClientRoutes = require('./routes/feedbackClientRoutes');
const coachClientsRoutes = require("./routes/coachClientsRoutes");
const paymentCoachRoutes = require("./routes/paymentCoachRoutes");
const coachProfileRoutes = require("./routes/coachProfileRoutes");  // <-- keep only this one

const path = require('path');

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// DB connect
connectDB();

// Routes
app.use('/api/test', require('./routes/test.route'));
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/admin', adminRoutes);

// --- Client-facing routes (non-admin) ---
app.use('/api/payments', paymentClientRoutes);
app.use('/api/subscriptions', subscriptionClientRoutes);
app.use('/api/feedbacks', feedbackClientRoutes);

// --- Admin routes under /api/admin/... ---
app.use('/api/admin/subscriptions', subscriptionRoutes);
app.use('/api/admin/payments', paymentRoutes);
app.use('/api/admin/feedbacks', feedbackRoutes);
app.use('/api/admin/sessions', sessionRoutes);

// --- Coach-facing routes ---
app.use('/api/coach/clients', coachClientsRoutes);
app.use('/api', require('./routes/sessionRequestRoutes'));
app.use('/api/coach/payments', paymentCoachRoutes);
app.use('/api/coach/profile', coachProfileRoutes);     // <-- mount profile routes

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
