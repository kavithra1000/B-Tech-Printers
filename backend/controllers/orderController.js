import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/productmodel.js';

// Create a new order
export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shippingAddress } = req.body;
    
    // Get user's cart
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty, cannot create order'
      });
    }
    
    // Check if all items are in stock
    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.product} not found`
        });
      }
      
      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for ${product.name}`
        });
      }
    }
    
    // Calculate total amount
    const totalAmount = cart.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
    
    // Create order items
    const orderItems = await Promise.all(cart.items.map(async (item) => {
      const product = await Product.findById(item.product);
      
      // Update product quantity
      product.quantity -= item.quantity;
      await product.save();
      
      return {
        product: item.product,
        name: product.name,
        quantity: item.quantity,
        price: item.price
      };
    }));
    
    // Create new order
    const order = new Order({
      user: userId,
      items: orderItems,
      totalAmount,
      shippingAddress
    });
    
    await order.save();
    
    // Clear cart
    cart.items = [];
    await cart.save();
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
};

// Get all orders (admin)
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'fName lName email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// Get user's orders
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user orders',
      error: error.message
    });
  }
};

// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const order = await Order.findById(id)
      .populate('user', 'fName lName email');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if user is owner or admin
    if (order.user._id.toString() !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order'
      });
    }
    
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message
    });
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // If cancelling order, restore product quantities
    if (status === 'cancelled' && order.status !== 'cancelled') {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.quantity += item.quantity;
          await product.save();
        }
      }
    }
    
    // Update order status
    order.status = status;
    await order.save();
    
    res.status(200).json({
      success: true,
      message: 'Order status updated',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: error.message
    });
  }
};

// Delete/cancel order
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if user is owner or admin
    if (order.user.toString() !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }
    
    // Only allow cancellation of pending orders
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order that is not in pending status'
      });
    }
    
    // Restore product quantities
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.quantity += item.quantity;
        await product.save();
      }
    }
    
    // Update order status to cancelled
    order.status = 'cancelled';
    await order.save();
    
    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling order',
      error: error.message
    });
  }
};

// Update order payment status
export const updateOrderPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    
    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'Payment status is required'
      });
    }
    
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Update order payment status
    order.paymentStatus = paymentStatus;
    
    // If payment is completed, update order status to processing if it's still pending
    if (paymentStatus === 'completed' && order.status === 'pending') {
      order.status = 'processing';
    }
    
    await order.save();
    
    res.status(200).json({
      success: true,
      message: 'Order payment status updated',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating order payment status',
      error: error.message
    });
  }
};

// Clear all cancelled orders for a user
export const clearCancelledOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find all cancelled orders for this user
    const cancelledOrders = await Order.find({ 
      user: userId,
      status: 'cancelled'
    });
    
    if (cancelledOrders.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No cancelled orders to clear',
        count: 0
      });
    }
    
    // Delete all cancelled orders
    const result = await Order.deleteMany({
      user: userId,
      status: 'cancelled'
    });
    
    res.status(200).json({
      success: true,
      message: 'Cancelled orders cleared successfully',
      count: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing cancelled orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing cancelled orders',
      error: error.message
    });
  }
};

// Clear all cancelled orders (admin only)
export const clearAllCancelledOrders = async (req, res) => {
  try {
    // Find all cancelled orders
    const cancelledOrders = await Order.find({ 
      status: 'cancelled'
    });
    
    if (cancelledOrders.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No cancelled orders to clear',
        count: 0
      });
    }
    
    // Delete all cancelled orders
    const result = await Order.deleteMany({
      status: 'cancelled'
    });
    
    res.status(200).json({
      success: true,
      message: 'All cancelled orders cleared successfully',
      count: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing all cancelled orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing all cancelled orders',
      error: error.message
    });
  }
}; 