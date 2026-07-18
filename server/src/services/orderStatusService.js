const pool = require("../config/db");

/**
 * Order Status Service
 * 
 * Handles all order status transitions, validation, and related operations
 * including inventory synchronization and timeline tracking.
 */

// Define complete order status flow
const ORDER_STATUS_FLOW = {
  pending: ['payment_pending', 'cancelled'],
  payment_pending: ['payment_completed', 'payment_failed', 'cancelled'],
  payment_completed: ['supplier_accepted', 'cancelled'],
  supplier_accepted: ['processing', 'cancelled'],
  processing: ['packed', 'cancelled'],
  packed: ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['shipped', 'cancelled'],
  shipped: ['in_transit', 'cancelled'],
  in_transit: ['out_for_delivery'],
  out_for_delivery: ['delivered', 'failed_delivery'],
  delivered: ['completed', 'return_requested'],
  completed: ['return_requested'],
  return_requested: ['return_approved', 'return_rejected'],
  return_approved: ['return_completed', 'replacement_requested'],
  replacement_requested: ['replacement_issued'],
  replacement_issued: ['completed'],
  return_completed: ['refunded'],
  cancelled: [], // Terminal state
  refunded: [], // Terminal state
  failed_delivery: ['out_for_delivery', 'cancelled'],
  payment_failed: [],
  payment_completed: ['supplier_accepted', 'cancelled'],
  return_rejected: [],
  return_approved: ['return_completed', 'replacement_requested'],
  replacement_requested: ['replacement_issued'],
  replacement_issued: ['completed']
};

// Define status that can be cancelled by buyer
const BUYER_CANCELLABLE_STATUSES = ['pending', 'payment_pending', 'payment_completed', 'supplier_accepted'];

// Define status that can be cancelled by supplier
const SUPPLIER_CANCELLABLE_STATUSES = ['pending', 'payment_completed', 'supplier_accepted', 'processing'];

// Define status that can be returned
const RETURNABLE_STATUSES = ['delivered', 'completed'];

/**
 * Validate if a status transition is allowed
 */
const validateStatusTransition = (currentStatus, newStatus) => {
  if (!ORDER_STATUS_FLOW[currentStatus]) {
    return { valid: false, message: `Invalid current status: ${currentStatus}` };
  }
  
  if (!ORDER_STATUS_FLOW[currentStatus].includes(newStatus)) {
    return { 
      valid: false, 
      message: `Cannot transition from ${currentStatus} to ${newStatus}. Valid transitions: ${ORDER_STATUS_FLOW[currentStatus].join(', ')}` 
    };
  }
  
  return { valid: true };
};

const mapPaymentStatusToOrderStatus = (paymentStatus) => {
  switch (paymentStatus) {
    case 'paid':
    case 'partial':
      return 'payment_completed';
    case 'pending':
      return 'payment_pending';
    case 'failed':
    case 'cod':
      return 'payment_failed';
    default:
      return 'payment_pending';
  }
};

/**
 * Update order status with validation and history tracking
 */
const updateOrderStatus = async (orderId, newStatus, userId, userRole, remarks = null) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get current order status
    const orderResult = await client.query(
      'SELECT status, buyer_id, supplier_id FROM orders WHERE id = $1',
      [orderId]
    );
    
    if (orderResult.rows.length === 0) {
      throw new Error('Order not found');
    }
    
    const currentStatus = orderResult.rows[0].status;
    const order = orderResult.rows[0];
    
    // Validate status transition
    const validation = validateStatusTransition(currentStatus, newStatus);
    if (!validation.valid) {
      throw new Error(validation.message);
    }
    
    // Update order status
    await client.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStatus, orderId]
    );
    
    // Record status change in history
    await client.query(
      `INSERT INTO order_status_history (order_id, status, previous_status, updated_by, updated_by_role, remarks)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orderId, newStatus, currentStatus, userId, userRole, remarks]
    );
    
    await client.query('COMMIT');
    
    return { success: true, currentStatus, newStatus };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Cancel an order with inventory restoration
 */
const cancelOrder = async (orderId, userId, userRole, reason = null) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get order details
    const orderResult = await client.query(
      'SELECT status, buyer_id, supplier_id, inventory_item_id, quantity FROM orders WHERE id = $1',
      [orderId]
    );
    
    if (orderResult.rows.length === 0) {
      throw new Error('Order not found');
    }
    
    const order = orderResult.rows[0];
    
    // Validate cancellation permissions
    if (userRole === 'buyer' && order.buyer_id !== userId) {
      throw new Error('You can only cancel your own orders');
    }
    
    if (userRole === 'supplier' && order.supplier_id !== userId) {
      throw new Error('You can only cancel orders placed with you');
    }
    
    // Validate if order can be cancelled
    if (userRole === 'buyer' && !BUYER_CANCELLABLE_STATUSES.includes(order.status)) {
      throw new Error(`Cannot cancel order in ${order.status} status`);
    }
    
    if (userRole === 'supplier' && !SUPPLIER_CANCELLABLE_STATUSES.includes(order.status)) {
      throw new Error(`Cannot cancel order in ${order.status} status`);
    }
    
    // Update order status to cancelled
    await client.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['cancelled', orderId]
    );
    
    // Record status change
    await client.query(
      `INSERT INTO order_status_history (order_id, status, previous_status, updated_by, updated_by_role, remarks)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orderId, 'cancelled', order.status, userId, userRole, reason || 'Order cancelled']
    );
    
    // Restore inventory stock
    await restoreInventoryStock(order.inventory_item_id, order.quantity, orderId, userId);
    
    await client.query('COMMIT');
    
    return { success: true, message: 'Order cancelled successfully' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Record status change in history
 */
const recordStatusChange = async (orderId, status, previousStatus, userId, userRole, remarks = null) => {
  try {
    await pool.query(
      `INSERT INTO order_status_history (order_id, status, previous_status, updated_by, updated_by_role, remarks)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orderId, status, previousStatus, userId, userRole, remarks]
    );
  } catch (error) {
    console.error('Error recording status change:', error);
    throw error;
  }
};

/**
 * Deduct inventory stock when order is placed
 */
const deductInventoryStock = async (inventoryId, quantity, orderId, userId) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get current stock
    const stockResult = await client.query(
      'SELECT stock FROM supplier_inventory WHERE id = $1',
      [inventoryId]
    );
    
    if (stockResult.rows.length === 0) {
      throw new Error('Inventory item not found');
    }
    
    const currentStock = stockResult.rows[0].stock;
    
    if (currentStock < quantity) {
      throw new Error(`Insufficient stock. Available: ${currentStock}, Required: ${quantity}`);
    }
    
    // Deduct stock
    await client.query(
      'UPDATE supplier_inventory SET stock = stock - $1 WHERE id = $2',
      [quantity, inventoryId]
    );
    
    // Log inventory change
    await client.query(
      `INSERT INTO inventory_log (inventory_id, order_id, user_id, action, quantity_change, previous_stock, new_stock, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [inventoryId, orderId, userId, 'deducted', -quantity, currentStock, currentStock - quantity, 'Order placed']
    );
    
    await client.query('COMMIT');
    
    return { success: true, previousStock: currentStock, newStock: currentStock - quantity };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Restore inventory stock when order is cancelled or returned
 */
const restoreInventoryStock = async (inventoryId, quantity, orderId, userId) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get current stock
    const stockResult = await client.query(
      'SELECT stock FROM supplier_inventory WHERE id = $1',
      [inventoryId]
    );
    
    if (stockResult.rows.length === 0) {
      throw new Error('Inventory item not found');
    }
    
    const currentStock = stockResult.rows[0].stock;
    
    // Restore stock
    await client.query(
      'UPDATE supplier_inventory SET stock = stock + $1 WHERE id = $2',
      [quantity, inventoryId]
    );
    
    // Log inventory change
    await client.query(
      `INSERT INTO inventory_log (inventory_id, order_id, user_id, action, quantity_change, previous_stock, new_stock, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [inventoryId, orderId, userId, 'restored', quantity, currentStock, currentStock + quantity, 'Order cancelled/returned']
    );
    
    await client.query('COMMIT');
    
    return { success: true, previousStock: currentStock, newStock: currentStock + quantity };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get complete order timeline
 */
const getOrderTimeline = async (orderId) => {
  try {
    const result = await pool.query(
      `SELECT 
        osh.id,
        osh.status,
        osh.previous_status,
        osh.updated_by,
        osh.updated_by_role,
        osh.remarks,
        osh.created_at,
        u.first_name,
        u.last_name
       FROM order_status_history osh
       LEFT JOIN users u ON osh.updated_by = u.id
       WHERE osh.order_id = $1
       ORDER BY osh.created_at ASC`,
      [orderId]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching order timeline:', error);
    throw error;
  }
};

/**
 * Check if order can be cancelled by buyer
 */
const canCancelOrder = (orderStatus, userRole) => {
  if (userRole === 'buyer') {
    return BUYER_CANCELLABLE_STATUSES.includes(orderStatus);
  }
  if (userRole === 'supplier') {
    return SUPPLIER_CANCELLABLE_STATUSES.includes(orderStatus);
  }
  return false;
};

/**
 * Check if order can be returned
 */
const canReturnOrder = (orderStatus) => {
  return RETURNABLE_STATUSES.includes(orderStatus);
};

/**
 * Get next possible statuses for current status
 */
const getNextPossibleStatuses = (currentStatus) => {
  return ORDER_STATUS_FLOW[currentStatus] || [];
};

/**
 * Get all valid statuses
 */
const getAllStatuses = () => {
  return Object.keys(ORDER_STATUS_FLOW);
};

module.exports = {
  validateStatusTransition,
  mapPaymentStatusToOrderStatus,
  updateOrderStatus,
  cancelOrder,
  recordStatusChange,
  deductInventoryStock,
  restoreInventoryStock,
  getOrderTimeline,
  canCancelOrder,
  canReturnOrder,
  getNextPossibleStatuses,
  getAllStatuses,
  ORDER_STATUS_FLOW,
  BUYER_CANCELLABLE_STATUSES,
  SUPPLIER_CANCELLABLE_STATUSES,
  RETURNABLE_STATUSES
};
