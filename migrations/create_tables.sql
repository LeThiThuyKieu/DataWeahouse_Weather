CREATE DATABASE IF NOT EXISTS weatherdb;
USE weatherdb;

-- Bảng chứa dữ liệu gốc (từ API, lưu dạng TEXT)
CREATE TABLE IF NOT EXISTS general_weather (
  id INT AUTO_INCREMENT PRIMARY KEY,
  city TEXT,
  latitude TEXT,
  longitude TEXT,
  elevation TEXT,
  utc_offset_seconds TEXT,
  timezone TEXT,
  timezone_abbreviation TEXT,
  time TEXT,
  temperature_2m TEXT,
  humidity_2m TEXT,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_transformed BOOLEAN DEFAULT FALSE
);

-- Bảng chứa dữ liệu sau khi transform (đúng kiểu dữ liệu)
CREATE TABLE IF NOT EXISTS transform_weather (
  id INT AUTO_INCREMENT PRIMARY KEY,
  city VARCHAR(255),
  latitude FLOAT,
  longitude FLOAT,
  elevation FLOAT,
  utc_offset_seconds INT,
  timezone VARCHAR(255),
  timezone_abbreviation VARCHAR(255),
  time DATETIME,
  temperature_2m FLOAT,
  humidity_2m INT,
  loaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
