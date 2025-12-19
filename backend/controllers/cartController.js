import Cart from '../models/Cart.js';
import Product from '../models/productmodel.js';

// Get cart for the current user
export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    
    let cart = await Cart.findOne({ user: userId }).populate({
      path: 'items.product',
      select: 'name images price discount'
    });
    
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
      await cart.save();
    }
    
    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cart',
      error: error.message
    });
  }
};

// Add item to cart
export const addToCart = async (req, res) => {
  try {
    console.log('Add to cart request received:', { 
      body: req.body,
      user: req.user
    });
    
    const { productId, quantity = 1 } = req.body;
    const userId = req.user.id;
    
    if (!productId) {
      console.log('Product ID missing from request');
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }
    
    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      console.log(`Product not found with ID: ${productId}`);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if product is in stock
    if (product.quantity < quantity) {
      console.log(`Insufficient stock for product ${productId}: requested ${quantity}, available ${product.quantity}`);
      return res.status(400).json({
        success: false,
        message: 'Not enough product in stock'
      });
    }
    
    // Get cart or create if doesn't exist
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      console.log(`Creating new cart for user ${userId}`);
      cart = new Cart({ user: userId, items: [] });
    }
    
    // Calculate price with discount
    const price = product.price * (1 - (product.discount / 100));
    
    // Check if product already in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );
    
    if (existingItemIndex > -1) {
      // Update quantity if product is already in cart
      console.log(`Product ${productId} already in cart, updating quantity from ${cart.items[existingItemIndex].quantity} to ${cart.items[existingItemIndex].quantity + quantity}`);
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item to cart
      console.log(`Adding new product ${productId} to cart with quantity ${quantity}`);
      cart.items.push({
        product: productId,
        quantity,
        price
      });
    }
    
    await cart.save();
    console.log('Cart saved successfully');
    
    // Populate product details before returning response
    await cart.populate({
      path: 'items.product',
      select: 'name images price discount'
    });
    
    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: cart
    });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding item to cart',
      error: error.message
    });
  }
};

// Update cart item quantity
export const updateCartItem = async (req, res) => {
  try {
    const { itemId, quantity } = req.body;
    const userId = req.user.id;
    
    if (!itemId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Item ID and quantity are required'
      });
    }
    
    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }
    
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    
    // Find the cart item
    const cartItem = cart.items.id(itemId);
    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }
    
    // Check if product is in stock
    const product = await Product.findById(cartItem.product);
    if (product.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Not enough product in stock'
      });
    }
    
    // Update quantity
    cartItem.quantity = quantity;
    await cart.save();
    
    // Populate product details before returning response
    await cart.populate({
      path: 'items.product',
      select: 'name images price discount'
    });
    
    res.status(200).json({
      success: true,
      message: 'Cart item updated',
      data: cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating cart item',
      error: error.message
    });
  }
};

// Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;
    
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    
    // Find the item index
    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }
    
    // Remove the item
    cart.items.splice(itemIndex, 1);
    await cart.save();
    
    // Populate product details before returning response
    await cart.populate({
      path: 'items.product',
      select: 'name images price discount'
    });
    
    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing item from cart',
      error: error.message
    });
  }
};

// Clear cart
export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    
    cart.items = [];
    await cart.save();
    
    res.status(200).json({
      success: true,
      message: 'Cart cleared',
      data: cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error clearing cart',
      error: error.message
    });
  }
}; 