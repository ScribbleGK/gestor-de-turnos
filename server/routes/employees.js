import express from 'express';
import pool from '../db.js';
import { toZonedTime } from 'date-fns-tz'

// Usamos el mismo método de importación para consistencia.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { toZonedTime } = require('date-fns-tz');

const router = express.Router();
const TIME_ZONE = 'Australia/Brisbane';

// (La ruta GET / para todos los empleados no necesita cambios)
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

        if (row.punches) {
            const punches = row.punches.split(',');
            punches.forEach(punch => {
                const [punchTimeString, isOvertimeString] = punch.split('|');
                
                // 1. CORRECCIÓN: Convertimos la hora UTC de la BD a la hora de Brisbane.
                const utcPunchDate = new Date(punchTimeString);
                const brisbanePunchDate = toZonedTime(utcPunchDate, TIME_ZONE);

                if (brisbanePunchDate.getDay() === 0) return; // Ignoramos los domingos

                // 2. CORRECCIÓN: Comparamos "manzanas con manzanas".
                //    Convertimos la fecha de inicio (que es un string como '2025-09-29')
                //    a un objeto Date que representa el inicio de ese día en Brisbane.
                const startDateObj = toZonedTime(new Date(startDate), TIME_ZONE);

                // 3. CORRECCIÓN: Calculamos la diferencia de días basándonos en la hora de Brisbane.
                //    Reseteamos las horas para comparar solo los días.
                const brisbanePunchDay = new Date(brisbanePunchDate.getFullYear(), brisbanePunchDate.getMonth(), brisbanePunchDate.getDate());
                const startDay = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate());
                
                const diffTime = brisbanePunchDay - startDay;
                const dayDiff = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                const weeksPassed = Math.floor(dayDiff / 7);
                const dayIndex = dayDiff - weeksPassed; // Calcula el índice correcto (0-11)

                if (dayIndex >= 0 && dayIndex < 12) {
                    const isOvertime = isOvertimeString === '1';
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