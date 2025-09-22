import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Ruta para obtener todos los empleados
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM employees ORDER BY surname, name');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener empleados:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/employees/timesheet?startDate=YYYY-MM-DD
router.get('/timesheet', async (req, res) => {
  const { startDate } = req.query;

  if (!startDate) {
    return res.status(400).json({ error: 'Se requiere una fecha de inicio (startDate).' });
  }

  try {
    const query = `
      SELECT e.id, e.name, e.surname, a.punch_time, a.is_overtime
      FROM employees e
      LEFT JOIN attendances a 
        ON e.id = a.employee_id 
        AND a.punch_time >= ? 
        AND a.punch_time < DATE_ADD(?, INTERVAL 14 DAY)
      ORDER BY e.surname, e.name, a.punch_time;
    `;
    const [rows] = await pool.query(query, [startDate, startDate]);
    const employeesMap = new Map();
    const [allEmployees] = await pool.query('SELECT id, name, surname FROM employees ORDER BY surname, name');

    allEmployees.forEach(emp => {
      employeesMap.set(emp.id, {
        name: `${emp.name} ${emp.surname}`.trim(),
        hours: Array(12).fill(null),
        total: 0
      });
    });

    rows.forEach(row => {
      if (!row.punch_time) return;

      const employeeData = employeesMap.get(row.id);
      if (!employeeData) return;

      const punchDate = new Date(row.punch_time);
      if (punchDate.getDay() === 0) return;

      const startDateObj = new Date(startDate);
      const diffTime = punchDate.setHours(0,0,0,0) - startDateObj.setHours(0,0,0,0);
      const dayDiff = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const weeksPassed = Math.floor(dayDiff / 7);
      const dayIndex = dayDiff - weeksPassed;

      if (dayIndex >= 0 && dayIndex < 12) {
        const hours = row.is_overtime ? 2.4 : 2.0;

        // --- INICIO DE LA CORRECCIÓN ---
        if (employeeData.hours[dayIndex] === null) {
          // Si no hay horas registradas para este día, las establecemos.
          employeeData.hours[dayIndex] = hours;
        } else {
          // Si ya hay horas, las sumamos.
          employeeData.hours[dayIndex] += hours;
        }
        // --- FIN DE LA CORRECCIÓN ---
      }
    });

    const result = Array.from(employeesMap.values()).map(emp => {
        const total = emp.hours.reduce((sum, h) => sum + (h || 0), 0);
        return { ...emp, total: parseFloat(total.toFixed(1)) };
    });

    res.json({
      startDate,
      employees: result
    });

  } catch (error) {
    console.error('Error al obtener el timesheet:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;