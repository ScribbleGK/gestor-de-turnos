import express from 'express';
import pool from '../db.js';

const router = express.Router();

const getCurrentShift = (date) => {
  const day = date.getDay();
  const hour = 7;
  const minutes = 30;
  const time = hour + minutes / 60;
  if (day >= 1 && day <= 4) {
    if (time >= 7 && time < 10) return { type: 'morning', start: 7, end: 10 };
  }
  if (day === 5) {
    if (time >= 7 && time < 10) return { type: 'morning', start: 7, end: 10 };
    if (time >= 19.5 && time < 22.5) return { type: 'evening', start: 19.5, end: 22.5 };
  }
  if (day === 6) {
    if (time >= 16.5 && time < 19.5) return { type: 'evening', start: 16.5, end: 19.5 };
  }
  return null;
};

router.get('/status', async (req, res) => {
  const { employeeId } = req.query;
  if (!employeeId) return res.status(400).json({ error: 'Falta employeeId' });

  try {
    const now = new Date();
    const currentShift = getCurrentShift(now);

    if (!currentShift) {
      return res.json({ status: 'blocked', message: 'Fuera de Horario' });
    }

    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
    const query = `SELECT punch_time FROM attendances WHERE employee_id = ? AND shift_type = ? AND punch_time BETWEEN ? AND ?;`;
    const [rows] = await pool.query(query, [employeeId, currentShift.type, todayStart, todayEnd]);

    if (rows.length > 0) {
      // CAMBIO: Ahora devolvemos la hora exacta de la marcación.
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
    const now = new Date();
    const currentShift = getCurrentShift(now);

    if (!currentShift) {
      return res.status(400).json({ error: 'No se puede marcar fuera de horario.' });
    }

    const query = `INSERT INTO attendances (employee_id, punch_time, shift_type, is_overtime) VALUES (?, ?, ?, ?);`;
    const [result] = await pool.query(query, [employeeId, now, currentShift.type, false]);
    
    // CAMBIO: Devolvemos la hora exacta que acabamos de insertar.
    res.status(201).json({ success: true, message: 'Asistencia registrada con éxito.', punchTime: now.toISOString() });
  } catch (error) {
    console.error("Error al registrar asistencia:", error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;