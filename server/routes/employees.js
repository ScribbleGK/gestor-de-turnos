import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Esta ruta no se modifica, la dejamos como referencia.
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
    // CAMBIO CLAVE: Usamos INNER JOIN para obtener solo empleados con asistencias en el período.
    const query = `
      SELECT 
        e.id, 
        e.name, 
        e.surname,
        GROUP_CONCAT(CONCAT_WS('|', a.punch_time, a.is_overtime) ORDER BY a.punch_time) as punches
      FROM employees e
      INNER JOIN attendances a 
        ON e.id = a.employee_id
        AND a.punch_time >= ? 
        AND a.punch_time < DATE_ADD(?, INTERVAL 14 DAY)
      WHERE 
        e.active = TRUE
      GROUP BY e.id, e.name, e.surname
      ORDER BY e.surname, e.name;
    `;
    const [rows] = await pool.query(query, [startDate, startDate]);

    // El resto de tu lógica de procesamiento de datos permanece intacta.
    const employeesData = rows.map(row => {
        const employee = {
            name: `${row.surname}, ${row.name}`.trim(), // Ajustado para formato Apellido, Nombre
            hours: Array(12).fill(null),
            total: 0
        };

        if (row.punches) {
            const punches = row.punches.split(',');
            punches.forEach(punch => {
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