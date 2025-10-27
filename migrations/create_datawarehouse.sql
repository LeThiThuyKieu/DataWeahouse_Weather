-- Tạo database datawarehouse và các bảng Dim/Fact
-- File: migrations/create_datawarehouse.sql

-- Tạo database datawarehouse
CREATE DATABASE IF NOT EXISTS datawarehouse;

-- Sử dụng datawarehouse
USE datawarehouse;

-- 1. Bảng Dim_Location (Dimension Địa điểm)
CREATE TABLE IF NOT EXISTS Dim_Location (
  location_key INT AUTO_INCREMENT PRIMARY KEY,
  city VARCHAR(255) NOT NULL,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  timezone VARCHAR(255),
  timezone_abbreviation VARCHAR(255),
  utc_offset_seconds INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_location (city, latitude, longitude)
);

-- 2. Bảng Dim_Time (Dimension Thời gian)
CREATE TABLE IF NOT EXISTS Dim_Time (
  time_key INT AUTO_INCREMENT PRIMARY KEY,
  datetime DATETIME NOT NULL,
  date DATE NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL,
  day INT NOT NULL,
  hour INT NOT NULL,
  day_of_week INT,
  quarter INT,
  season VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_datetime (datetime)
);

-- 3. Bảng Fact_Weather (Fact Thời tiết)
CREATE TABLE IF NOT EXISTS Fact_Weather (
  weather_id INT AUTO_INCREMENT PRIMARY KEY,
  time_key INT NOT NULL,
  location_key INT NOT NULL,
  temperature_2m FLOAT,
  humidity_2m INT,
  elevation FLOAT,
  loaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (time_key) REFERENCES Dim_Time(time_key),
  FOREIGN KEY (location_key) REFERENCES Dim_Location(location_key),
  UNIQUE KEY unique_weather_record (time_key, location_key)
);

-- 4. Tạo indexes để tối ưu performance
CREATE INDEX idx_dim_location_city ON Dim_Location(city);
CREATE INDEX idx_dim_time_datetime ON Dim_Time(datetime);
CREATE INDEX idx_dim_time_date ON Dim_Time(date);
CREATE INDEX idx_fact_weather_time ON Fact_Weather(time_key);
CREATE INDEX idx_fact_weather_location ON Fact_Weather(location_key);
