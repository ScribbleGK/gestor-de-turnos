import express from 'express';
import cors from 'cors';
import employeeRoutes from './routes/employees.js'; 
import invoiceRoutes from './routes/invoices.js';
import attendanceRoutes from './routes/attendances.js';
import authRoutes from './routes/auth.js';

//Iniciando servidor
const app = express();
const PORT = 3001;

//Peticiones
app.use(cors());
app.use(express.json());

//--Rutas--
app.use('/api/employees', employeeRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/attendances', attendanceRoutes);
app.use('/api/auth', authRoutes); 

//Prueba
app.get('/', (req, res) => {
    res.send('funciona');
});

//Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});



