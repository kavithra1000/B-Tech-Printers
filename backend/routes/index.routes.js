import express from 'express'
import authRouter from './auth.routes.js';
import userRouter from './user.routes.js';
import productRouter from './productroute.js';
import feedbackRouter from './feedback.routes.js';
import cartRouter from './cart.routes.js';
import orderRouter from './order.routes.js';
import paymentRouter from './payment.routes.js';
import dashboardRouter from './dashboard.routes.js';
import issueRouter from './issue.routes.js';
import financeRouter from './finance.routes.js';

const router = express.Router()

// Authentication routes
router.use('/auth', authRouter)

// User management routes
router.use('/users', userRouter)

// Product routes
router.use('/products', productRouter)

// Feedback routes
router.use('/feedback', feedbackRouter)

// Cart routes
router.use('/cart', cartRouter)

// Order routes
router.use('/orders', orderRouter)

// Payment routes
router.use('/payments', paymentRouter)

// Dashboard routes
router.use('/dashboard', dashboardRouter)

// Issue Reporting routes
router.use('/issues', issueRouter)

// Finance Management routes
router.use('/finance', financeRouter)

export default router;