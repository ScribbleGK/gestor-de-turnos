CREATE DATABASE gestor_turnos_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gestor_turnos_db;

-- Tabla para los empleados
CREATE TABLE employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    second_name VARCHAR(255),
    surname VARCHAR(255) NOT NULL,
    second_surname VARCHAR(255),
    address VARCHAR(255) NOT NULL,
    telephone VARCHAR(50) NOT NULL,
    abn VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    bank_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(100) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    bsb VARCHAR(20) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    pin VARCHAR(255),
    role ENUM('admin', 'worker') NOT NULL DEFAULT 'worker'
);

-- Tabla para las marcaciones de asistencia
CREATE TABLE attendances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    punch_time DATETIME NOT NULL,
    shift_type ENUM('morning', 'evening') NOT NULL,
    is_overtime BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Tabla para la configuración de facturas
CREATE TABLE invoice_config (
    id INT PRIMARY KEY DEFAULT 1,
    company_email VARCHAR(255) NOT NULL,
    company_abn VARCHAR(50) NOT NULL,
    business_telephone VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    hour_rate DECIMAL(10, 2) NOT NULL,
    CONSTRAINT id_check CHECK (id = 1)
);

-- Añade asistencias de Lunes a Jueves (mañana)
INSERT INTO attendances (employee_id, punch_time, shift_type, is_overtime) VALUES
(1, '2025-09-15 07:30:00', 'morning', FALSE),
(1, '2025-09-16 07:32:00', 'morning', FALSE),
(1, '2025-09-17 07:28:00', 'morning', TRUE),
(1, '2025-09-18 07:35:00', 'morning', FALSE);

-- Añade dos asistencias para el Viernes (mañana y noche)
INSERT INTO attendances (employee_id, punch_time, shift_type, is_overtime) VALUES
(1, '2025-09-19 07:30:00', 'morning', FALSE),
(1, '2025-09-19 18:00:00', 'evening', FALSE);