import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/auth/active-employees
// Obtiene una lista simple de empleados activos para el dropdown de login.
// También nos dice si el empleado ya tiene un PIN configurado o no.
router.get('/active-employees', async (req, res) => {
    try {
        // La consulta `pin IS NOT NULL` devuelve 1 si el pin existe, 0 si es NULL.
        const [employees] = await pool.query(
            "SELECT id, name, surname, pin IS NOT NULL AS has_pin FROM employees WHERE active = TRUE ORDER BY surname, name"
        );
        res.json(employees);
    } catch (error) {
        console.error("Error al obtener empleados activos:", error);
        res.status(500).json({ error: "Error al obtener empleados" });
    }
});

// POST /api/auth/login
// Valida el PIN de un empleado.
router.post('/login', async (req, res) => {
    const { employeeId, pin } = req.body;
    if (!employeeId || !pin) {
        return res.status(400).json({ error: 'Faltan datos de empleado o PIN.' });
    }

    try {
        const [rows] = await pool.query("SELECT pin FROM employees WHERE id = ?", [employeeId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado.' });
        }

        const employee = rows[0];
        // Comparamos el PIN enviado con el de la base de datos.
        if (employee.pin === pin) {
            res.json({ success: true, message: 'Login correcto.' });
        } else {
            res.status(401).json({ success: false, message: 'PIN incorrecto.' });
        }
    } catch (error) {
        console.error("Error en el login:", error);
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

// POST /api/auth/set-pin
// Establece un nuevo PIN para un empleado que no tiene uno.
router.post('/set-pin', async (req, res) => {
    const { employeeId, pin } = req.body;
    if (!employeeId || !pin) {
        return res.status(400).json({ error: 'Faltan datos de empleado o PIN.' });
    }

    try {
        await pool.query("UPDATE employees SET pin = ? WHERE id = ?", [pin, employeeId]);
        res.json({ success: true, message: 'PIN establecido con éxito.' });
    } catch (error) {
        console.error("Error al establecer el PIN:", error);
        res.status(500).json({ error: 'Error al establecer el PIN.' });
    }
});

export default router;