import express from 'express';
import pool from '../db.js';
import { toZonedTime } from 'date-fns-tz';

const router = express.Router();

const TIME_ZONE = 'Australia/Brisbane';

// Esta función auxiliar nos ayudará a formatear la fecha para MySQL
const formatForMySQL = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  const second = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

const getCurrentShift = (date) => {
  const day = date.getDay();
  const hour = date.getHours();
  const minutes = date.getMinutes();
  const time = hour + minutes / 60;

  if (day >= 1 && day <= 4) { // Lunes a Jueves
    if (time >= 7 && time < 10) return { type: 'morning' };
  }
  if (day === 5) { // Viernes
    if (time >= 7 && time < 10) return { type: 'morning' };
    if (time >= 19.5 && time < 22.5) return { type: 'evening' };
  }
  if (day === 6) { // Sábado
    if (time >= 16.5 && time < 19.5) return { type: 'evening' };
  }
  return null;
};

router.get('/status', async (req, res) => {
  const { employeeId } = req.query;
  if (!employeeId) return res.status(400).json({ error: 'Falta employeeId' });

  try {
    const utcNow = new Date();
    const nowInBrisbane = toZonedTime(utcNow, TIME_ZONE);
    const currentShift = getCurrentShift(nowInBrisbane);

    if (!currentShift) {
      return res.json({ status: 'blocked', message: 'Fuera de Horario' });
    }

    // Definimos el inicio y fin del día en la zona horaria de Brisbane.
    const brisbaneTodayStart = new Date(nowInBrisbane.getFullYear(), nowInBrisbane.getMonth(), nowInBrisbane.getDate(), 0, 0, 0);
    const brisbaneTodayEnd = new Date(nowInBrisbane.getFullYear(), nowInBrisbane.getMonth(), nowInBrisbane.getDate(), 23, 59, 59, 999);

    // CORRECCIÓN #2: Usamos los límites del día de Brisbane directamente en la consulta.
    // Esto funciona porque ahora la columna `punch_time` también estará guardada en hora de Brisbane.
    // Comparamos "manzanas con manzanas".
    const query = `SELECT punch_time FROM attendances WHERE employee_id = ? AND shift_type = ? AND punch_time BETWEEN ? AND ?;`;
    const [rows] = await pool.query(query, [employeeId, currentShift.type, brisbaneTodayStart, brisbaneTodayEnd]);

    if (rows.length > 0) {
      return res.json({ status: 'punched', message: 'Asistencia Registrada', punchTime: rows[0].punch_time });
    } else {
      return res.json({ status: 'ready', message: 'A la espera de asistencia' });
    }
  } catch (error) {
    console.error("Error al obtener estado de asistencia:", error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/punch', async (req, res) => {
  const { employeeId } = req.body;
  if (!employeeId) return res.status(400).json({ error: 'Falta employeeId' });

  try {
    const utcNow = new Date();
    const nowInBrisbane = toZonedTime(utcNow, TIME_ZONE);
    const currentShift = getCurrentShift(nowInBrisbane);

    if (!currentShift) {
      return res.status(400).json({ error: 'No se puede marcar fuera de horario.' });
    }

    // CORRECCIÓN #1: Formateamos la hora de Brisbane a un string 'YYYY-MM-DD HH:MM:SS'.
    // Esto asegura que MySQL la inserte como un valor de tiempo local sin convertirla.
    const punchTimeToSave = formatForMySQL(nowInBrisbane);

    const query = `INSERT INTO attendances (employee_id, punch_time, shift_type, is_overtime) VALUES (?, ?, ?, ?);`;
    await pool.query(query, [employeeId, punchTimeToSave, currentShift.type, false]);
    
    // Devolvemos la hora que se guardó para consistencia en la UI.
    res.status(201).json({ success: true, message: 'Asistencia registrada con éxito.', punchTime: punchTimeToSave });
  } catch (error) {
    console.error("Error al registrar asistencia:", error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
