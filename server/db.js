import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config(); // Carga las variables del archivo .env

// Creamos un "pool" de conexiones. Es más eficiente que crear
// una conexión nueva para cada consulta.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;