-- Tạo database datawarehouse và các bảng Dim/Fact
-- File: migrations/create_datawarehouse.sql

-- Tạo database datawarehouse
CREATE DATABASE IF NOT EXISTS datawarehouse;

-- Sử dụng datawarehouse
USE datawarehouse;

-- 0. Bảng Dim_Date (Dimension ngày chuẩn, sử dụng CSV chuẩn của thầy)
DROP TABLE IF EXISTS Dim_Date;

CREATE TABLE IF NOT EXISTS Dim_Date (
  date_key INT PRIMARY KEY,             
  full_date DATE NOT NULL,
  day_since_2005 INT,
  month_since_2005 INT,
  day_of_week VARCHAR(50),
  calendar_month VARCHAR(50),
  calendar_year VARCHAR(10),
  calendar_year_month VARCHAR(20),
  day_of_month INT,
  day_of_year INT,
  week_of_year_sunday INT,
  year_week_sunday VARCHAR(20),
  week_sunday_start DATE,
  week_of_year_monday INT,
  year_week_monday VARCHAR(20),
  week_monday_start DATE,
  holiday VARCHAR(50),
  day_type VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- index giúp lookup nhanh
CREATE UNIQUE INDEX IF NOT EXISTS idx_dim_date_full_date ON Dim_Date(full_date);


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


-- 2. Bảng Fact_Weather (Fact Thời tiết)
-- NOTE: date_key = Dim_Date.date_key
CREATE TABLE IF NOT EXISTS Fact_Weather (
  weather_id INT AUTO_INCREMENT PRIMARY KEY,
  date_key INT NOT NULL,
  location_key INT NOT NULL,
  temperature_2m FLOAT,
  humidity_2m INT,
  elevation FLOAT,
  loaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (date_key) REFERENCES Dim_Date(date_key),
  FOREIGN KEY (location_key) REFERENCES Dim_Location(location_key),
  UNIQUE KEY unique_weather_record (date_key, location_key)
);


-- 3. Indexes tối ưu performance
CREATE INDEX IF NOT EXISTS idx_dim_location_city ON Dim_Location(city);
CREATE INDEX IF NOT EXISTS idx_fact_weather_date ON Fact_Weather(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_weather_location ON Fact_Weather(location_key);


-- 4. Load file date_dim_without_quarter.csv vào bảng dim_date của db: datawarehouse (date_dim chuẩn)
SET GLOBAL local_infile = 1;
LOAD DATA LOCAL INFILE 'D:/code_nam4/DataWarehouse/weather-etl/date_dim_without_quarter.csv' 
REPLACE INTO TABLE 
    Dim_Date FIELDS TERMINATED BY ';' OPTIONALLY ENCLOSED BY '"' LINES TERMINATED BY '\r\n' 
IGNORE 1 LINES (@v1,@v2,@v3,@v4,@v5,@v6,@v7,@v8,@v9,@v10,@v11,@v12,@v13,@v14,@v15,@v16,@v17,@v18) 
SET 
  date_key = CAST(NULLIF(@v1,'') AS SIGNED), 
  full_date = STR_TO_DATE(NULLIF(@v2,''), '%d/%m/%Y'), 
  day_since_2005 = CAST(NULLIF(@v3,'') AS SIGNED), 
  month_since_2005 = CAST(NULLIF(@v4,'') AS SIGNED), 
  day_of_week = @v5, 
  calendar_month = @v6, 
  calendar_year = @v7, 
  calendar_year_month = @v8, 
  day_of_month = CAST(NULLIF(@v9,'') AS SIGNED), 
  day_of_year = CAST(NULLIF(@v10,'') AS SIGNED), 
  week_of_year_sunday = CAST(NULLIF(@v11,'') AS SIGNED), 
  year_week_sunday = @v12, 
  week_sunday_start = STR_TO_DATE(NULLIF(@v13,''), '%d/%m/%Y'), 
  week_of_year_monday = CAST(NULLIF(@v14,'') AS SIGNED), 
  year_week_monday = @v15, 
  week_monday_start = STR_TO_DATE(NULLIF(@v16,''), '%d/%m/%Y'), 
  holiday = @v17, day_type = @v18;