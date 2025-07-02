-- LogiTrack MySQL Database Setup
-- Run this script to create the MySQL database structure

-- Create database
CREATE DATABASE IF NOT EXISTS logistics CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE logistics;

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR(255) NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP NOT NULL,
  INDEX IDX_session_expire (expire)
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) NOT NULL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  profile_image_url VARCHAR(500),
  role VARCHAR(50) NOT NULL DEFAULT 'client',
  client_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Zones table
CREATE TABLE IF NOT EXISTS zones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  direction VARCHAR(50) NOT NULL,
  radius INT NOT NULL DEFAULT 300,
  center_lat DECIMAL(10,8),
  center_lng DECIMAL(11,8),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  license_number VARCHAR(255),
  vehicle VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'offline',
  current_location JSON,
  phone_number VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT true,
  zone_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (zone_id) REFERENCES zones(id)
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Route batches table
CREATE TABLE IF NOT EXISTS route_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  cutoff_time TIME NOT NULL DEFAULT '14:30:00',
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  total_orders INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(255) NOT NULL UNIQUE,
  client_id INT,
  customer_id INT,
  driver_id INT,
  zone_id INT,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  delivery_line1 VARCHAR(255) NOT NULL,
  delivery_line2 VARCHAR(255),
  delivery_city VARCHAR(255) NOT NULL,
  delivery_state VARCHAR(100) NOT NULL,
  delivery_zip VARCHAR(20) NOT NULL,
  delivery_country VARCHAR(100) NOT NULL DEFAULT 'USA',
  pickup_date DATE NOT NULL,
  packages JSON NOT NULL,
  weight DECIMAL(10,2),
  distance DECIMAL(10,2),
  special_instructions TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  assigned_at TIMESTAMP NULL,
  picked_up_at TIMESTAMP NULL,
  actual_delivery_time TIMESTAMP NULL,
  estimated_delivery_time TIMESTAMP NULL,
  coordinates JSON,
  created_by VARCHAR(255),
  void_reason VARCHAR(255),
  voided_at TIMESTAMP NULL,
  voided_by VARCHAR(255),
  batch_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (driver_id) REFERENCES drivers(id),
  FOREIGN KEY (zone_id) REFERENCES zones(id),
  FOREIGN KEY (batch_id) REFERENCES route_batches(id)
);

-- Optimized routes table
CREATE TABLE IF NOT EXISTS optimized_routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_id INT NOT NULL,
  zone_id INT NOT NULL,
  driver_id INT,
  route_data JSON,
  estimated_distance DECIMAL(10,2),
  estimated_time INT,
  status VARCHAR(50) DEFAULT 'pending',
  assigned_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES route_batches(id),
  FOREIGN KEY (zone_id) REFERENCES zones(id),
  FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

-- Order status history table
CREATE TABLE IF NOT EXISTS order_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(255),
  notes TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  action VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSON,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert sample data
INSERT IGNORE INTO clients (id, name, address, contact_email, contact_phone, username, password, is_active) VALUES
(1, 'American Distributors LLC', '123 Business Ave, Chicago, IL 60601', 'admin@americandist.com', '555-0100', 'american_dist', 'password123', true),
(2, 'Midwest Supply Co', '456 Industrial Blvd, Milwaukee, WI 53202', 'contact@midwestsupply.com', '555-0200', 'midwest_supply', 'password123', true),
(3, 'Great Lakes Logistics', '789 Commerce St, Detroit, MI 48201', 'info@greatlakes.com', '555-0300', 'greatlakes_logistics', 'password123', true);

-- Insert sample zones
INSERT IGNORE INTO zones (id, name, direction, radius, center_lat, center_lng, is_active) VALUES
(7, 'East Zone', 'East', 300, 41.8781, -87.6298, true),
(8, 'West Zone', 'West', 300, 41.8781, -87.6298, true),
(9, 'North Zone', 'North', 300, 41.8781, -87.6298, true),
(10, 'South Zone', 'South', 300, 41.8781, -87.6298, true);

-- Create indexes for better performance
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_client_id ON orders(client_id);
CREATE INDEX idx_orders_driver_id ON orders(driver_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_zone_id ON drivers(zone_id);