CREATE TABLE IF NOT EXISTS vehicles (
  vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
  tenantID INT NOT NULL,
  user_id INT NOT NULL,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year_model YEAR NULL,
  fuel_type ENUM('Gasoline','Diesel','Electric','Hybrid') NOT NULL DEFAULT 'Gasoline',
  transmission_type ENUM('Manual','Automatic','CVT','DCT','AMT') NOT NULL DEFAULT 'Manual',
  engine_number VARCHAR(100) NULL,
  mileage_km INT NULL,
  vin_number VARCHAR(100) NULL,
  plate_number VARCHAR(50) NOT NULL,
  color VARCHAR(50) NULL,
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  date_added TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vehicle_tenant_user (tenantID, user_id),
  INDEX idx_vehicle_plate (plate_number)
);
