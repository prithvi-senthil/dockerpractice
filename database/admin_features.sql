-- Infrastructure Table
CREATE TABLE IF NOT EXISTS infrastructure (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  subtype VARCHAR(100) NOT NULL,
  capacity INT NOT NULL,
  location VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_is_active (is_active),
  INDEX idx_created_at (created_at)
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value LONGTEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_setting_key (setting_key)
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  actor_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id INT,
  entity_name VARCHAR(255),
  old_value LONGTEXT,
  new_value LONGTEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_actor_id (actor_id),
  INDEX idx_entity_type (entity_type),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  INDEX idx_entity_id (entity_id),
  CONSTRAINT fk_actor_id FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert default system settings if they don't exist
INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
('otp_validity', '300', 'OTP validity in seconds'),
('working_hours_start', '09:00', 'Working hours start time (HH:MM format)'),
('working_hours_end', '17:00', 'Working hours end time (HH:MM format)'),
('working_hours_enabled', 'true', 'Whether working hours validation is enabled'),
('admin_panel_view_user_ids', '[]', 'JSON array of user IDs with admin panel access');
