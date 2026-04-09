-- ============================================
-- RapidRepair Appointment System Database Schema
-- Version: 1.0
-- Created: 2026-04-05
-- Database: rapidrepairs (Azure MySQL)
-- ============================================

-- Table: appointments
-- Description: Core appointment records for service bookings
-- Usage: Stores all appointment details including date, time, status, and total cost
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
  appointment_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique appointment identifier',
  tenantID INT NOT NULL COMMENT 'Tenant/Shop ID for multi-tenancy support',
  user_id INT NOT NULL COMMENT 'User/Customer ID who booked the appointment',
  vehicle_id INT NOT NULL COMMENT 'Vehicle ID for which service is booked',
  appointment_date DATE NOT NULL COMMENT 'Scheduled appointment date (YYYY-MM-DD)',
  appointment_time TIME NOT NULL COMMENT 'Scheduled appointment time (HH:MM:SS)',
  status ENUM('Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Pending' COMMENT 'Current status of the appointment',
  notes TEXT COMMENT 'Additional notes/requirements from customer',
  total_amount DECIMAL(10, 2) DEFAULT 0 COMMENT 'Total service cost before taxes/fees',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record last update timestamp',
  
  -- Foreign Key Constraints
  FOREIGN KEY (tenantID) REFERENCES tenants(tenantID) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
  
  -- Indexes for Performance
  INDEX idx_tenant_user (tenantID, user_id) COMMENT 'Query appointments by tenant and user',
  INDEX idx_appointment_date (appointment_date) COMMENT 'Query appointments by date',
  INDEX idx_status (status) COMMENT 'Query appointments by status',
  INDEX idx_tenant_date (tenantID, appointment_date) COMMENT 'Query appointments by tenant and date',
  INDEX idx_user_date (user_id, appointment_date) COMMENT 'Query user appointments by date'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Appointment booking records';


-- Table: appointment_services
-- Description: Junction table linking appointments to services
-- Usage: Tracks which services are included in each appointment
-- Note: Supports multiple services per appointment
-- ============================================
CREATE TABLE IF NOT EXISTS appointment_services (
  appointment_service_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique appointment service record ID',
  appointment_id INT NOT NULL COMMENT 'Reference to appointments table',
  tenantID INT NOT NULL COMMENT 'Tenant/Shop ID (denormalized for query efficiency)',
  service_id INT NOT NULL COMMENT 'Reference to services table',
  service_price DECIMAL(10, 2) DEFAULT 0 COMMENT 'Price of service at time of booking (snapshot)',
  duration_minutes INT DEFAULT 0 COMMENT 'Estimated service duration in minutes',
  notes TEXT COMMENT 'Service-specific notes or requirements',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  
  -- Foreign Key Constraints
  FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
  FOREIGN KEY (tenantID) REFERENCES tenants(tenantID) ON DELETE RESTRICT,
  FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE RESTRICT,
  
  -- Indexes for Performance
  INDEX idx_appointment (appointment_id) COMMENT 'Query services for specific appointment',
  INDEX idx_tenant (tenantID) COMMENT 'Query services by tenant',
  INDEX idx_service (service_id) COMMENT 'Find appointments for specific service'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Services linked to appointments';


-- Table: payments (May already exist - create if not present)
-- Description: Payment records for appointments
-- Usage: Tracks payment status and amounts
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique payment record ID',
  tenantID INT NOT NULL COMMENT 'Tenant/Shop ID',
  user_id INT NOT NULL COMMENT 'User/Customer ID',
  appointment_id INT NOT NULL COMMENT 'Reference to appointments table',
  paymentAmount DECIMAL(10, 2) NOT NULL COMMENT 'Total amount to be paid',
  amountPaid DECIMAL(10, 2) DEFAULT 0 COMMENT 'Amount paid so far',
  balance DECIMAL(10, 2) DEFAULT 0 COMMENT 'Remaining balance (paymentAmount - amountPaid)',
  paymentMethod VARCHAR(50) DEFAULT 'Pending' COMMENT 'Payment method (Cash, GCash, Card, Bank Transfer, etc.)',
  paymentDate TIMESTAMP NULL COMMENT 'Date payment was completed',
  paymentStatus ENUM('Pending', 'Completed', 'Failed', 'Refunded') DEFAULT 'Pending' COMMENT 'Current payment status',
  referenceNumber VARCHAR(100) COMMENT 'Internal reference number (e.g., RR-00001)',
  transactionReferenceNumber VARCHAR(100) COMMENT 'Third-party transaction ID',
  remarks TEXT COMMENT 'Additional payment notes or remarks',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record last update timestamp',
  
  -- Foreign Key Constraints
  FOREIGN KEY (tenantID) REFERENCES tenants(tenantID) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
  FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
  
  -- Indexes for Performance
  INDEX idx_tenant_user (tenantID, user_id) COMMENT 'Query payments by tenant and user',
  INDEX idx_appointment (appointment_id) COMMENT 'Query payment for appointment',
  INDEX idx_payment_status (paymentStatus) COMMENT 'Query payments by status',
  INDEX idx_payment_date (paymentDate) COMMENT 'Query payments by date',
  UNIQUE INDEX idx_reference_number (referenceNumber) COMMENT 'Ensure unique reference numbers'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Payment records for appointments';


-- ============================================
-- Sample Data for Testing
-- ============================================

-- Insert sample appointment (requires existing tenant, user, and vehicle)
-- INSERT INTO appointments (tenantID, user_id, vehicle_id, appointment_date, appointment_time, status, notes, total_amount)
-- VALUES (1, 10, 5, '2026-04-15', '10:30:00', 'Pending', 'Regular service and inspection', 1500);

-- Insert sample appointment services
-- INSERT INTO appointment_services (appointment_id, tenantID, service_id, service_price, duration_minutes, notes)
-- VALUES 
-- (1, 1, 1, 500, 30, 'Oil change'),
-- (1, 1, 2, 1000, 60, 'Tire rotation and balance');

-- Insert sample payment record
-- INSERT INTO payments (tenantID, user_id, appointment_id, paymentAmount, amountPaid, balance, paymentMethod, paymentStatus, referenceNumber)
-- VALUES (1, 10, 1, 1500, 0, 1500, 'Pending', 'Pending', 'RR-00001');


-- ============================================
-- Useful Queries
-- ============================================

-- Get all appointments for a user with their services
-- SELECT 
--   a.appointment_id,
--   a.appointment_date,
--   a.appointment_time,
--   a.status,
--   a.total_amount,
--   COUNT(aps.appointment_service_id) as service_count
-- FROM appointments a
-- LEFT JOIN appointment_services aps ON a.appointment_id = aps.appointment_id
-- WHERE a.user_id = 10 AND a.tenantID = 1
-- GROUP BY a.appointment_id
-- ORDER BY a.appointment_date DESC;

-- Get detailed appointment with services
-- SELECT 
--   a.appointment_id,
--   a.appointment_date,
--   a.appointment_time,
--   a.status,
--   s.service_name,
--   aps.service_price,
--   aps.duration_minutes
-- FROM appointments a
-- LEFT JOIN appointment_services aps ON a.appointment_id = aps.appointment_id
-- LEFT JOIN services s ON aps.service_id = s.service_id
-- WHERE a.appointment_id = 1
-- ORDER BY aps.appointment_service_id;

-- Get payment information for appointment
-- SELECT 
--   p.payment_id,
--   p.paymentAmount,
--   p.amountPaid,
--   p.balance,
--   p.paymentStatus,
--   p.referenceNumber
-- FROM payments p
-- WHERE p.appointment_id = 1;

-- Get pending appointments scheduled for today or later
-- SELECT 
--   a.appointment_id,
--   a.user_id,
--   a.vehicle_id,
--   a.appointment_date,
--   a.appointment_time,
--   a.total_amount,
--   p.paymentStatus
-- FROM appointments a
-- LEFT JOIN payments p ON a.appointment_id = p.appointment_id
-- WHERE a.tenantID = 1
--   AND a.status IN ('Pending', 'Confirmed')
--   AND a.appointment_date >= CURDATE()
-- ORDER BY a.appointment_date, a.appointment_time;

-- Get revenue by status
-- SELECT 
--   a.status,
--   COUNT(*) as appointment_count,
--   SUM(a.total_amount) as total_revenue,
--   SUM(p.amountPaid) as amount_received,
--   SUM(p.balance) as pending_amount
-- FROM appointments a
-- LEFT JOIN payments p ON a.appointment_id = p.appointment_id
-- WHERE a.tenantID = 1
-- GROUP BY a.status
-- ORDER BY total_revenue DESC;


-- ============================================
-- Maintenance Queries
-- ============================================

-- Get schema information for appointments table
-- DESC appointments;

-- Get all indexes on appointments table
-- SHOW INDEXES FROM appointments WHERE TABLE_NAME = 'appointments';

-- Get row count
-- SELECT 
--   'appointments' as table_name, COUNT(*) as row_count FROM appointments
-- UNION ALL
-- SELECT 'appointment_services', COUNT(*) FROM appointment_services
-- UNION ALL
-- SELECT 'payments', COUNT(*) FROM payments;

-- Find appointments without payment records (data integrity check)
-- SELECT a.appointment_id, a.user_id, a.total_amount
-- FROM appointments a
-- LEFT JOIN payments p ON a.appointment_id = p.appointment_id
-- WHERE p.payment_id IS NULL;

-- ============================================
-- Version History
-- ============================================
-- Version 1.0 (2026-04-05)
-- - Initial schema for appointment booking system
-- - Added appointments table with full details
-- - Added appointment_services junction table
-- - Added payments table with payment tracking
-- - Added comprehensive indexes for performance
-- - Added detailed comments for reference
