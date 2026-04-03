-- Vehicle Information Table Schema
-- Database: Vehicle Management System
-- Table: vehicleinformation
-- 
-- This table stores all vehicle information for users in the Rapid Repair mobile app.
-- Each vehicle is linked to a specific user (user_id) within a tenant (tenantID).

CREATE TABLE IF NOT EXISTS vehicleinformation (
  vehicle_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique vehicle identifier',
  tenantID INT NOT NULL COMMENT 'Tenant/Organization ID',
  user_id INT NOT NULL COMMENT 'User ID who owns the vehicle',
  brand VARCHAR(100) NOT NULL COMMENT 'Vehicle brand/make (e.g., Honda, Toyota, Tesla)',
  model VARCHAR(100) NOT NULL COMMENT 'Vehicle model (e.g., Civic, Camry)',
  year_model YEAR NOT NULL COMMENT 'Manufacturing year (YYYY format)',
  fuel_type ENUM('Gasoline', 'Diesel', 'Electric', 'Hybrid') DEFAULT 'Gasoline' COMMENT 'Type of fuel the vehicle uses',
  transmission_type ENUM('Manual', 'Automatic', 'CVT', 'DCT', 'AMT') DEFAULT 'Manual' COMMENT 'Transmission type',
  engine_number VARCHAR(100) COMMENT 'Engine/Motor serial number',
  mileage_km INT DEFAULT 0 COMMENT 'Current mileage/odometer reading in kilometers',
  vin_number VARCHAR(100) COMMENT 'Vehicle Identification Number (17 characters)',
  plate_number VARCHAR(50) NOT NULL COMMENT 'License plate number',
  color VARCHAR(50) COMMENT 'Vehicle exterior color',
  status ENUM('Active', 'Inactive') DEFAULT 'Active' COMMENT 'Current status of the vehicle',
  date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when vehicle was registered',
  
  -- Indexes for performance
  UNIQUE KEY unique_plate_user (plate_number, tenantID, user_id) COMMENT 'Ensure plate numbers are unique per user',
  INDEX idx_tenant_user (tenantID, user_id) COMMENT 'Speed up queries filtering by tenant and user',
  INDEX idx_status (status) COMMENT 'Speed up queries filtering by status',
  INDEX idx_user_vehicles (user_id, tenantID) COMMENT 'Fast lookup of user vehicles'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores vehicle information for all users';

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================
-- DELETE FROM vehicleinformation WHERE tenantID = 1 AND user_id IN (5, 6);
-- INSERT INTO vehicleinformation (tenantID, user_id, brand, model, year_model, fuel_type, transmission_type, engine_number, mileage_km, vin_number, plate_number, color, status)
-- VALUES 
-- (1, 5, 'Honda', 'Civic', '2018', 'Gasoline', 'Automatic', 'K20A2', 45000, '1HGCV1F32DA123456', 'ABC1234', 'Silver', 'Active'),
-- (1, 5, 'Tesla', 'Model 3', '2022', 'Electric', 'Automatic', 'N/A', 12500, '5YJ3E1EA1MF000053', 'ELON123', 'White', 'Active'),
-- (1, 6, 'Toyota', 'Camry', '2020', 'Gasoline', 'Automatic', '2GR-FE', 28000, '4T1BF1AK8CU123456', 'XYZ9876', 'Black', 'Active');

-- ============================================================================
-- USEFUL QUERIES
-- ============================================================================

-- Get all vehicles for a user
-- SELECT * FROM vehicleinformation WHERE tenantID = 1 AND user_id = 5 ORDER BY date_added DESC;

-- Get active vehicles only
-- SELECT * FROM vehicleinformation WHERE tenantID = 1 AND user_id = 5 AND status = 'Active';

-- Count vehicles per user
-- SELECT user_id, COUNT(*) as vehicle_count FROM vehicleinformation WHERE tenantID = 1 GROUP BY user_id;

-- Find vehicles by fuel type
-- SELECT * FROM vehicleinformation WHERE tenantID = 1 AND fuel_type = 'Electric';

-- Update vehicle status
-- UPDATE vehicleinformation SET status = 'Inactive' WHERE vehicle_id = 1;

-- Delete all vehicles for a user (CAUTION!)
-- DELETE FROM vehicleinformation WHERE tenantID = 1 AND user_id = 5;

-- Check for duplicate plate numbers
-- SELECT plate_number, tenantID, user_id, COUNT(*) FROM vehicleinformation GROUP BY plate_number, tenantID, user_id HAVING COUNT(*) > 1;

-- Get average mileage per user
-- SELECT user_id, AVG(mileage_km) as avg_mileage FROM vehicleinformation WHERE tenantID = 1 GROUP BY user_id;

-- ============================================================================
-- TABLE MODIFICATIONS (for future enhancements)
-- ============================================================================

-- To add more fields later:
-- ALTER TABLE vehicleinformation ADD COLUMN service_due_date DATE COMMENT 'Next service due date';
-- ALTER TABLE vehicleinformation ADD COLUMN insurance_expiry DATE COMMENT 'Insurance policy expiry date';
-- ALTER TABLE vehicleinformation ADD COLUMN registration_expiry DATE COMMENT 'Registration expiry date';
-- ALTER TABLE vehicleinformation ADD COLUMN purchase_price DECIMAL(10,2) COMMENT 'Vehicle purchase price';
-- ALTER TABLE vehicleinformation ADD COLUMN notes TEXT COMMENT 'Additional notes about the vehicle';

-- To add image/document storage:
-- CREATE TABLE vehicle_images (
--   image_id INT AUTO_INCREMENT PRIMARY KEY,
--   vehicle_id INT NOT NULL,
--   image_type ENUM('Front', 'Back', 'Left', 'Right', 'Interior', 'Other'),
--   image_path VARCHAR(255),
--   uploaded_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   FOREIGN KEY (vehicle_id) REFERENCES vehicleinformation(vehicle_id) ON DELETE CASCADE
-- );

-- To add service history tracking:
-- CREATE TABLE vehicle_services (
--   service_id INT AUTO_INCREMENT PRIMARY KEY,
--   vehicle_id INT NOT NULL,
--   service_type VARCHAR(100),
--   service_date DATE,
--   cost DECIMAL(10,2),
--   notes TEXT,
--   FOREIGN KEY (vehicle_id) REFERENCES vehicleinformation(vehicle_id) ON DELETE CASCADE
-- );
