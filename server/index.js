import express from 'express';
import cors from 'cors';
import pool from './db.js';

//Iniciando servidor
const app = express();
const PORT = 3001;

//Peticiones
app.use(cors());
app.use(express.json());

//--Rutas--
//Obtener los empleados
app.get('/api/employees', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM employees');
    res.json(rows); // Enviamos los resultados como JSON
  } catch (error) {
    console.error('Error al obtener empleados:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

//Prueba
app.get('/', (req, res) => {
    res.send('funciona');
});

//Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
