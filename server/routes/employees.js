import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM employees ORDER BY surname, name');
      res.json(rows);
    } catch (error) {
      console.error('Error al obtener empleados:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.get('/timesheet', async (req, res) => {
  const { startDate } = req.query;
  if (!startDate) {
    return res.status(400).json({ error: 'Se requiere una fecha de inicio (startDate).' });
  }
  try {
    // CORRECCIÓN: Volvemos a LEFT JOIN para incluir a todos los empleados activos.
    // Y usamos un separador seguro ('|') en GROUP_CONCAT.
    const query = `
      SELECT 
        e.id, 
        e.name, 
        e.surname,
        GROUP_CONCAT(CONCAT_WS('|', a.punch_time, a.is_overtime)) as punches
      FROM employees e
      LEFT JOIN attendances a 
        ON e.id = a.employee_id
        AND a.punch_time >= ? 
        AND a.punch_time < DATE_ADD(?, INTERVAL 14 DAY)
      WHERE 
        e.active = TRUE
      GROUP BY e.id
      ORDER BY e.surname, e.name;
    `;
    const [rows] = await pool.query(query, [startDate, startDate]);

    const employeesData = rows.map(row => {
        const employee = {
            name: `${row.name} ${row.surname}`.trim(),
            hours: Array(12).fill(null),
            total: 0
        };

        // CORRECCIÓN: Manejamos el caso en que un empleado no tiene asistencias (punches será null).
        if (row.punches) {
            const punches = row.punches.split(',');
            punches.forEach(punch => {
                // CORRECCIÓN: Usamos el separador seguro '|'.
                const [punchTimeString, isOvertimeString] = punch.split('|');
                const punchDate = new Date(punchTimeString);
                const isOvertime = isOvertimeString === '1';

                if (punchDate.getDay() === 0) return;

                const startDateObj = new Date(startDate);
                const diffTime = punchDate.setHours(0,0,0,0) - startDateObj.setHours(0,0,0,0);
                const dayDiff = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                const weeksPassed = Math.floor(dayDiff / 7);
                const dayIndex = dayDiff - weeksPassed;

                if (dayIndex >= 0 && dayIndex < 12) {
                    const hours = isOvertime ? 2.4 : 2.0;
                    if (employee.hours[dayIndex] === null) {
                        employee.hours[dayIndex] = hours;
                    } else {
                        employee.hours[dayIndex] += hours;
                    }
                }
            });
        }
        
        const total = employee.hours.reduce((sum, h) => sum + (h || 0), 0);
        employee.total = parseFloat(total.toFixed(1));
        
        return employee;
    });

    res.json({
      startDate,
      employees: employeesData
    });

  } catch (error) {
    console.error('Error al obtener el timesheet:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
