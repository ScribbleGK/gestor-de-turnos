import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Carga las variables de entorno del archivo .env
dotenv.config();

// Creamos un "pool" de conexiones. Esto es más eficiente que crear
// una conexión nueva para cada consulta.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, // <--- ESTA ES LA LÍNEA CLAVE QUE SOLUCIONA EL ERROR
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Función para verificar la conexión al iniciar el servidor
async function testConnection() {
  try {
    // Intentamos obtener una conexión del pool
    const connection = await pool.getConnection();
    console.log('✅ Conexión a la base de datos establecida con éxito.');
    // Devolvemos la conexión al pool para que otros la usen
    connection.release();
  } catch (error) {
    console.error('❌ Error al conectar con la base de datos:', error.message);
    // Si la conexión falla, es un error crítico y detenemos la aplicación.
    process.exit(1);
  }
}

// Ejecutamos el test de conexión
testConnection();

// Exportamos el pool para poder usarlo en nuestros archivos de rutas
export default pool;
