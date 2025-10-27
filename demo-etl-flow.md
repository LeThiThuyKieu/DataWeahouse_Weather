# 🚀 DEMO ETL FLOW - Weather Data Warehouse

## 📋 **TÓM TẮT CÁC THAY ĐỔI ĐÃ SỬA**

### ✅ **1. Sửa lỗi Hardcode Database Name**

**Trước:**

```sql
SELECT * FROM controldb.config WHERE is_active = TRUE
```

**Sau:**

```sql
SELECT * FROM ${dbConfig.database}.config WHERE is_active = TRUE
```

### ✅ **2. Cải thiện getConnection Function**

**Trước:**

```typescript
// Default chỉ có weatherdb
const config = dbConfig || {
  database: "weatherdb", // ❌ Không có controldb
  // ...
};
```

**Sau:**

```typescript
// Buộc phải truyền config, không có default
if (!dbConfig) {
  throw new Error(
    "Database config is required. Please provide dbConfig parameter."
  );
}
```

### ✅ **3. Sửa tất cả SQL Queries**

- `logConfigRun()`: `INSERT INTO ${dbConfig.database}.config_log`
- `updateConfigLogStatus()`: `UPDATE ${dbConfig.database}.config_log`
- `logProcess()`: `INSERT INTO ${dbConfig.database}.process_log`
- `updateProcessLogStatus()`: `UPDATE ${dbConfig.database}.process_log`
- `getActiveConfigs()`: `SELECT * FROM ${dbConfig.database}.config`

---

## 🔄 **LUỒNG CHẠY CHI TIẾT KHI CHẠY `npm run run:etl`**

### **BƯỚC 1: LOAD CONFIG**

```bash
npm run run:etl
```

↓

```typescript
await configManager.loadConfig();
```

**Hệ thống sẽ:**

1. **Kiểm tra Environment Variable:**

   ```bash
   echo $ENVIRONMENT  # DEV/QA/PROD
   ```

2. **Chọn file config:**

   - `DEV` → `config-dev.xml` → `controldb_dev`, `weatherdb_dev`
   - `QA` → `config-qa.xml` → `controldb_qa`, `weatherdb_qa`
   - `PROD` → `config-prod.xml` → `controldb_prod`, `weatherdb_prod`

3. **Parse XML và lưu config:**
   ```typescript
   this.config = {
     databases: {
       weatherdb: { database: "weatherdb_dev", ... },
       controldb: { database: "controldb_dev", ... }
     }
   }
   ```

### **BƯỚC 2: KẾT NỐI CONTROL DATABASE**

```typescript
const activeConfigs = await controlDBManager.getActiveConfigs();
```

**Hệ thống sẽ:**

1. **Lấy config controldb:**

   ```typescript
   const dbConfig = {
     host: "localhost",
     port: 3306,
     database: "controldb_dev", // ✅ Dynamic database name
     username: "root",
     password: "",
   };
   ```

2. **Kết nối MySQL:**

   ```typescript
   const conn = await getConnection(dbConfig);
   console.log("Connecting to database: controldb_dev on localhost:3306");
   ```

3. **Query với dynamic database name:**

   ```sql
   SELECT * FROM controldb_dev.config WHERE is_active = TRUE
   ```

4. **Log bắt đầu ETL:**
   ```sql
   INSERT INTO controldb_dev.config_log (config_id, d_run, status, start_time)
   VALUES (?, ?, 'RUNNING', NOW())
   ```

### **BƯỚC 3: FETCH DATA**

```typescript
const csvFilePath = await fetchAndSaveWeatherData();
```

**Hệ thống sẽ:**

1. **Lấy API config từ XML:**

   ```xml
   <weather-api>
     <url>https://api.open-meteo.com/v1/forecast</url>
     <cities>
       <city name="Ho Chi Minh City" latitude="10.82" longitude="106.63"/>
       <city name="Hanoi" latitude="21.02" longitude="105.84"/>
     </cities>
   </weather-api>
   ```

2. **Gọi API cho từng thành phố:**

   ```typescript
   // Ho Chi Minh City
   const url =
     "https://api.open-meteo.com/v1/forecast?latitude=10.82&longitude=106.63&hourly=temperature_2m,relative_humidity_2m";
   const response = await axios.get(url);
   ```

3. **Lưu vào CSV:**
   ```typescript
   // File: staging_data_dev/data_20241201_1430.csv
   const csvContent =
     "city,latitude,longitude,time,temperature_2m,humidity_2m\nHo Chi Minh City,10.82,106.63,2024-12-01T14:00,28.5,75\n...";
   fs.writeFileSync(csvFilePath, csvContent);
   ```

### **BƯỚC 4: LOAD DATA**

```typescript
await loadLatestCSVFile();
```

**Hệ thống sẽ:**

1. **Tìm file CSV mới nhất:**

   ```typescript
   const files = fs.readdirSync("staging_data_dev");
   const latestFile = files.sort().pop(); // data_20241201_1430.csv
   ```

2. **Kết nối Weather Database:**

   ```typescript
   const weatherDbConfig = configManager.getWeatherDbConfig();
   // { database: "weatherdb_dev", ... }
   const conn = await getConnection(weatherDbConfig);
   console.log("Connecting to database: weatherdb_dev on localhost:3306");
   ```

3. **Load CSV vào general_weather:**
   ```sql
   INSERT INTO weatherdb_dev.general_weather
   (city, latitude, longitude, time, temperature_2m, humidity_2m, fetched_at, is_transformed)
   VALUES (?, ?, ?, ?, ?, ?, NOW(), FALSE)
   ```

### **BƯỚC 5: TRANSFORM DATA**

```typescript
await transformOnce();
```

**Hệ thống sẽ:**

1. **Kết nối Weather Database:**

   ```typescript
   const weatherDbConfig = configManager.getWeatherDbConfig();
   const conn = await getConnection(weatherDbConfig);
   ```

2. **Đọc data từ general_weather:**

   ```sql
   SELECT * FROM weatherdb_dev.general_weather WHERE is_transformed = FALSE
   ```

3. **Transform kiểu dữ liệu:**

   ```typescript
   // TEXT → FLOAT
   const latitude = parseFloat(record.latitude);
   const temperature = parseFloat(record.temperature_2m);

   // TEXT → INT
   const humidity = parseInt(record.humidity_2m);

   // TEXT → DATETIME
   const time = new Date(record.time);
   ```

4. **Insert vào transform_weather:**

   ```sql
   INSERT INTO weatherdb_dev.transform_weather
   (city, latitude, longitude, time, temperature_2m, humidity_2m, loaded_at)
   VALUES (?, ?, ?, ?, ?, ?, NOW())
   ```

5. **Update is_transformed:**
   ```sql
   UPDATE weatherdb_dev.general_weather
   SET is_transformed = TRUE WHERE id = ?
   ```

### **BƯỚC 6: LOG KẾT QUẢ**

```typescript
await controlDBManager.updateConfigLogStatus(configLogId, "SUCCESS");
```

**Hệ thống sẽ:**

1. **Kết nối Control Database:**

   ```typescript
   const controlDbConfig = configManager.getControlDbConfig();
   const conn = await getConnection(controlDbConfig);
   ```

2. **Update config_log:**

   ```sql
   UPDATE controldb_dev.config_log
   SET status = 'SUCCESS', end_time = NOW(), records_processed = 48
   WHERE id = ?
   ```

3. **Update process_log:**
   ```sql
   UPDATE controldb_dev.process_log
   SET status = 'SUCCESS', end_time = NOW(), records_processed = 48
   WHERE id = ?
   ```

---

## 🎯 **DEMO CHO THẦY**

### **Khi chạy `npm run run:etl`:**

1. **"Hệ thống tự động detect environment và load config phù hợp"**

   ```bash
   Loading config from: config-dev.xml for environment: DEV
   ```

2. **"Kết nối database control với dynamic database name"**

   ```bash
   Connecting to database: controldb_dev on localhost:3306
   ```

3. **"Fetch dữ liệu thời tiết từ API cho các thành phố Việt Nam"**

   ```bash
   Fetching weather data for Ho Chi Minh City...
   Fetching weather data for Hanoi...
   Data saved to: staging_data_dev/data_20241201_1430.csv
   ```

4. **"Load dữ liệu thô vào database staging"**

   ```bash
   Connecting to database: weatherdb_dev on localhost:3306
   Successfully loaded 48 rows into general_weather table
   ```

5. **"Transform dữ liệu từ TEXT sang kiểu dữ liệu chính xác"**

   ```bash
   Transforming 48 records...
   Successfully transformed 48 records to transform_weather table
   ```

6. **"Log toàn bộ quá trình để tracking và monitoring"**
   ```bash
   ETL Process Completed Successfully
   ```

### **Điểm mạnh của hệ thống sau khi sửa:**

- ✅ **Multi-environment support** (DEV/QA/PROD) hoạt động đúng
- ✅ **Dynamic database naming** không còn hardcode
- ✅ **Configurable qua XML** cho từng environment
- ✅ **Full logging và monitoring** với proper database connections
- ✅ **Error handling và rollback** với proper connection management
- ✅ **Staging area** để backup data trước khi transform

---

## 🔧 **CÁCH TEST**

### **Test với DEV environment:**

```bash
export ENVIRONMENT=DEV
npm run run:etl
```

### **Test với QA environment:**

```bash
export ENVIRONMENT=QA
npm run run:etl
```

### **Test với PROD environment:**

```bash
export ENVIRONMENT=PROD
npm run run:etl
```

**Mỗi environment sẽ:**

- Load config file khác nhau
- Kết nối database khác nhau
- Sử dụng staging directory khác nhau
- Có logging level khác nhau
