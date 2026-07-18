-- Enterprise Order Management System Database Migration
-- This migration extends the existing database schema to support enterprise-grade order management

-- =====================================================
-- 1. ENHANCE ORDERS TABLE FOR ENTERPRISE FEATURES
-- =====================================================

-- Add order number (auto-generated unique identifier)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_number VARCHAR(50) UNIQUE;

-- Add direct supplier reference for easier queries
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add billing address (separate from delivery address)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS billing_address JSONB;

-- Add financial breakdown fields
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) DEFAULT 0;
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(12,2) DEFAULT 0;
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0;

-- Add tracking fields
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS expected_delivery_date DATE;
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS actual_delivery_date DATE;

-- Add return/refund tracking
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS return_status VARCHAR(50) DEFAULT 'none'; -- none, requested, approved, rejected, completed
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMP;
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS return_completed_at TIMESTAMP;
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMP;

-- Add notes field
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add updated timestamp for tracking modifications
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_supplier_id ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_return_status ON orders(return_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN orders.order_number IS 'Unique order number for customer reference (auto-generated)';
COMMENT ON COLUMN orders.supplier_id IS 'Direct reference to supplier user for faster queries';
COMMENT ON COLUMN orders.billing_address IS 'Billing address as JSON: {name, phone, house, street, area, city, state, country, pincode}';
COMMENT ON COLUMN orders.subtotal IS 'Subtotal before tax and shipping';
COMMENT ON COLUMN orders.tax_amount IS 'Tax amount (GST)';
COMMENT ON COLUMN orders.shipping_cost IS 'Shipping cost';
COMMENT ON COLUMN orders.discount_amount IS 'Discount amount applied';
COMMENT ON COLUMN orders.tracking_number IS 'Shipment tracking number';
COMMENT ON COLUMN orders.expected_delivery_date IS 'Expected delivery date';
COMMENT ON COLUMN orders.actual_delivery_date IS 'Actual delivery date when order is delivered';
COMMENT ON COLUMN orders.return_status IS 'Return status: none, requested, approved, rejected, completed';
COMMENT ON COLUMN orders.return_requested_at IS 'Timestamp when return was requested';
COMMENT ON COLUMN orders.return_completed_at IS 'Timestamp when return was completed';
COMMENT ON COLUMN orders.refund_amount IS 'Amount refunded to buyer';
COMMENT ON COLUMN orders.refund_processed_at IS 'Timestamp when refund was processed';
COMMENT ON COLUMN orders.notes IS 'Additional notes for the order';
COMMENT ON COLUMN orders.updated_at IS 'Last update timestamp';

-- =====================================================
-- 2. CREATE ORDER STATUS HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    previous_status VARCHAR(50),
    updated_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    updated_by_role VARCHAR(20) NOT NULL, -- 'buyer', 'supplier', 'admin'
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_created_at ON order_status_history(created_at DESC);

COMMENT ON TABLE order_status_history IS 'Complete audit trail of order status changes';
COMMENT ON COLUMN order_status_history.status IS 'New status after transition';
COMMENT ON COLUMN order_status_history.previous_status IS 'Status before transition';
COMMENT ON COLUMN order_status_history.updated_by IS 'User ID who made the change';
COMMENT ON COLUMN order_status_history.updated_by_role IS 'Role of user who made the change';
COMMENT ON COLUMN order_status_history.remarks IS 'Optional remarks about the status change';

-- =====================================================
-- 3. CREATE ORDER ITEMS TABLE (SUPPORT MULTI-ITEM ORDERS)
-- =====================================================

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    supplier_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    discount_price DECIMAL(10,2),
    total_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_supplier_id ON order_items(supplier_id);

COMMENT ON TABLE order_items IS 'Individual line items within orders (supports multi-item orders)';
COMMENT ON COLUMN order_items.product_name IS 'Product name snapshot at time of order';
COMMENT ON COLUMN order_items.unit_price IS 'Unit price at time of order';
COMMENT ON COLUMN order_items.discount_price IS 'Discount price if applicable';
COMMENT ON COLUMN order_items.total_price IS 'Total price for this line item (quantity * price)';

-- =====================================================
-- 4. CREATE PAYMENT TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    transaction_id VARCHAR(100) UNIQUE, -- Razorpay transaction ID
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'razorpay', 'upi', 'cod', 'bank_transfer'
    payment_status VARCHAR(50) NOT NULL, -- 'pending', 'completed', 'failed', 'refunded'
    payment_date TIMESTAMP,
    refund_amount DECIMAL(12,2) DEFAULT 0,
    refund_date TIMESTAMP,
    gateway_response JSONB, -- Store gateway response for reference
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_id ON payment_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_status ON payment_transactions(payment_status);

COMMENT ON TABLE payment_transactions IS 'All payment transactions including partial payments and refunds';
COMMENT ON COLUMN payment_transactions.transaction_id IS 'Gateway transaction ID (e.g., Razorpay payment ID)';
COMMENT ON COLUMN payment_transactions.payment_method IS 'Payment method used';
COMMENT ON COLUMN payment_transactions.gateway_response IS 'Raw gateway response for debugging and reconciliation';

-- =====================================================
-- 5. CREATE SHIPMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS shipments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    tracking_number VARCHAR(100) UNIQUE NOT NULL,
    carrier VARCHAR(100), -- 'delhivery', 'bluedart', 'fedex', etc.
    shipping_address JSONB NOT NULL,
    shipped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    delivery_status VARCHAR(50) DEFAULT 'in_transit', -- 'in_transit', 'out_for_delivery', 'delivered', 'failed'
    delivery_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_delivery_status ON shipments(delivery_status);

COMMENT ON TABLE shipments IS 'Detailed shipment tracking information';
COMMENT ON COLUMN shipments.carrier IS 'Shipping carrier/service provider';
COMMENT ON COLUMN shipments.delivery_status IS 'Current delivery status';

-- =====================================================
-- 6. CREATE RETURN REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS return_requests (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    order_item_id INTEGER REFERENCES order_items(id) ON DELETE SET NULL,
    requested_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    return_type VARCHAR(50) NOT NULL, -- 'return', 'replacement', 'refund'
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'completed'
    processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    processed_at TIMESTAMP,
    refund_amount DECIMAL(12,2),
    replacement_order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_return_requests_order_id ON return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_requested_by ON return_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(status);

COMMENT ON TABLE return_requests IS 'Formal return/refund/replacement requests';
COMMENT ON COLUMN return_requests.return_type IS 'Type of return: return, replacement, or refund';
COMMENT ON COLUMN return_requests.processed_by IS 'User who approved/rejected the return';
COMMENT ON COLUMN return_requests.replacement_order_id IS 'New order ID if replacement was issued';

-- =====================================================
-- 7. CREATE INVOICES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_data JSONB NOT NULL, -- Complete invoice data as JSON
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

COMMENT ON TABLE invoices IS 'Generated invoices for orders';
COMMENT ON COLUMN invoices.invoice_number IS 'Unique invoice number (auto-generated)';
COMMENT ON COLUMN invoices.invoice_data IS 'Complete invoice data including buyer, supplier, items, totals';

-- =====================================================
-- 8. CREATE ORDER ANALYTICS TABLE (PRE-COMPUTED STATS)
-- =====================================================

CREATE TABLE IF NOT EXISTS order_analytics (
    idSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'buyer', 'supplier'
    period VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    pending_orders INTEGER DEFAULT 0,
    completed_orders INTEGER DEFAULT 0,
    cancelled_orders INTEGER DEFAULT 0,
    returned_orders INTEGER DEFAULT 0,
    average_order_value DECIMAL(12,2) DEFAULT 0,
    top_products JSONB, -- Array of top selling products
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role, period, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_order_analytics_user_id ON order_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_order_analytics_period ON order_analytics(period, period_start);

COMMENT ON TABLE order_analytics IS 'Pre-computed analytics for reporting and dashboards';
COMMENT ON COLUMN order_analytics.top_products IS 'Top products as JSON array';

-- =====================================================
-- 9. CREATE NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'order_created', 'order_accepted', 'order_cancelled', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional data related to notification
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

COMMENT ON TABLE notifications IS 'User notifications for order events';
COMMENT ON COLUMN notifications.notification_type IS 'Type of notification event';
COMMENT ON COLUMN notifications.data IS 'Additional context data (order_id, product_id, etc.)';

-- =====================================================
-- 10. CREATE INVENTORY LOG TABLE (COMPLETE AUDIT TRAIL)
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_log (
    id SERIAL PRIMARY KEY,
    inventory_id INTEGER NOT NULL REFERENCES supplier_inventory(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'deducted', 'restored', 'added', 'adjusted'
    quantity_change INTEGER NOT NULL, -- Positive for addition, negative for deduction
    previous_stock INTEGER,
    new_stock INTEGER,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_log_inventory_id ON inventory_log(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_order_id ON inventory_log(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_created_at ON inventory_log(created_at DESC);

COMMENT ON TABLE inventory_log IS 'Complete audit trail of inventory movements';
COMMENT ON COLUMN inventory_log.action IS 'Type of inventory action';
COMMENT ON COLUMN inventory_log.quantity_change IS 'Quantity changed (positive/negative)';

-- =====================================================
-- 11. CREATE DATABASE FUNCTIONS
-- =====================================================

-- Function to generate unique order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    order_num VARCHAR(50);
    timestamp_part VARCHAR(20);
    random_part VARCHAR(10);
BEGIN
    timestamp_part := TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISS');
    random_part := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    order_num := 'ORD' || timestamp_part || random_part;
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM orders WHERE order_number = order_num) LOOP
        random_part := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        order_num := 'ORD' || timestamp_part || random_part;
    END LOOP;
    
    RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    invoice_num VARCHAR(50);
    timestamp_part VARCHAR(20);
    random_part VARCHAR(10);
BEGIN
    timestamp_part := TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISS');
    random_part := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    invoice_num := 'INV' || timestamp_part || random_part;
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM invoices WHERE invoice_number = invoice_num) LOOP
        random_part := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        invoice_num := 'INV' || timestamp_part || random_part;
    END LOOP;
    
    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Function to validate order status transitions
CREATE OR REPLACE FUNCTION validate_order_status_transition(
    current_status VARCHAR(50),
    new_status VARCHAR(50)
) RETURNS BOOLEAN AS $$
BEGIN
    -- Define valid transitions
    CASE current_status
        WHEN 'pending' THEN
            RETURN new_status IN ('payment_pending', 'cancelled');
        WHEN 'payment_pending' THEN
            RETURN new_status IN ('payment_completed', 'payment_failed', 'cancelled');
        WHEN 'payment_completed' THEN
            RETURN new_status IN ('supplier_accepted', 'cancelled');
        WHEN 'supplier_accepted' THEN
            RETURN new_status IN ('processing', 'cancelled');
        WHEN 'processing' THEN
            RETURN new_status IN ('packed', 'cancelled');
        WHEN 'packed' THEN
            RETURN new_status IN ('ready_for_pickup', 'cancelled');
        WHEN 'ready_for_pickup' THEN
            RETURN new_status IN ('shipped', 'cancelled');
        WHEN 'shipped' THEN
            RETURN new_status IN ('in_transit', 'cancelled');
        WHEN 'in_transit' THEN
            RETURN new_status IN ('out_for_delivery');
        WHEN 'out_for_delivery' THEN
            RETURN new_status IN ('delivered', 'failed_delivery');
        WHEN 'delivered' THEN
            RETURN new_status IN ('completed', 'return_requested');
        WHEN 'completed' THEN
            RETURN new_status IN ('return_requested');
        WHEN 'return_requested' THEN
            RETURN new_status IN ('return_approved', 'return_rejected');
        WHEN 'return_approved' THEN
            RETURN new_status IN ('return_completed', 'replacement_requested');
        WHEN 'replacement_requested' THEN
            RETURN new_status IN ('replacement_issued');
        WHEN 'replacement_issued' THEN
            RETURN new_status IN ('completed');
        WHEN 'return_completed' THEN
            RETURN new_status IN ('refunded');
        WHEN 'cancelled' THEN
            RETURN false; -- No transitions from cancelled
        ELSE
            RETURN false;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. CREATE TRIGGERS
-- =====================================================

-- Trigger to auto-generate order number on insert
CREATE OR REPLACE FUNCTION trigger_generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_order_number();

-- Trigger to auto-generate invoice number on insert
CREATE OR REPLACE FUNCTION trigger_generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number := generate_invoice_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_invoice_number();

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_updated_at();

CREATE TRIGGER trg_update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_updated_at();

CREATE TRIGGER trg_update_return_requests_updated_at
    BEFORE UPDATE ON return_requests
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_updated_at();

CREATE TRIGGER trg_update_order_analytics_updated_at
    BEFORE UPDATE ON order_analytics
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_updated_at();

-- =====================================================
-- 13. BACKFILL EXISTING ORDERS WITH ORDER NUMBERS
-- =====================================================

UPDATE orders 
SET order_number = generate_order_number() 
WHERE order_number IS NULL OR order_number = '';

-- =====================================================
-- 14. BACKFILL SUPPLIER_ID FROM INVENTORY
-- =====================================================

UPDATE orders o
SET supplier_id = si.supplier_id
FROM supplier_inventory si
WHERE o.inventory_item_id = si.id 
AND o.supplier_id IS NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
