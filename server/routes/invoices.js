import express from 'express';
import pool from '../db.js'

const router = express.Router();

// GET /api/invoices/preview?employeeId=1&startDate=YYYY-MM-DD
router.get('/preview', async (req, res) => {
  const { employeeId, startDate } = req.query;

  if (!employeeId || !startDate) {
    return res.status(400).json({ error: 'Se requieren employeeId y startDate.' });
  }

  try {
    // 1. Obtener la configuración de la factura (tarifa por hora, etc.)
    const [configRows] = await pool.query('SELECT * FROM invoice_config WHERE id = 1');
    const config = configRows[0];
    if (!config) throw new Error('No se encontró la configuración de factura.');

    // 2. Obtener las marcaciones del empleado en el rango de fechas
    const attendancesQuery = `
      SELECT punch_time, is_overtime 
      FROM attendances 
      WHERE employee_id = ? 
        AND punch_time >= ? 
        AND punch_time < DATE_ADD(?, INTERVAL 14 DAY)
      ORDER BY punch_time;
    `;
    const [attendanceRows] = await pool.query(attendancesQuery, [employeeId, startDate, startDate]);

    // 3. Procesar los datos con JavaScript
    const shifts = attendanceRows.map(att => {
      const duration = att.is_overtime ? 2.4 : 2.0;
      const gross = duration * config.hour_rate;
      return {
        date: new Date(att.punch_time).toLocaleDateString('es-ES'),
        description: config.description,
        duration: duration,
        rate: parseFloat(config.hour_rate),
        gross: gross
      };
    });

    const total = shifts.reduce((sum, shift) => sum + shift.gross, 0);

    // 4. Ensamblar y enviar la respuesta final
    const invoiceData = {
      invoiceNumber: 0, // Número de factura temporal
      date: new Date().toLocaleDateString('es-ES'),
      terms: `${new Date(startDate).toLocaleDateString('es-ES')} - ${new Date(new Date(startDate).setDate(new Date(startDate).getDate() + 13)).toLocaleDateString('es-ES')}`,
      shifts: shifts,
      total: parseFloat(total.toFixed(2))
    };

    res.json(invoiceData);

  } catch (error) {
    console.error("Error al generar la vista previa de la factura:", error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
