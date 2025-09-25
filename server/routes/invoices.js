import express from 'express';
import pool from '../db.js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();
const formatDate = (date) => new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

router.get('/preview', async (req, res) => {
    const { employeeId, startDate } = req.query;
    if (!employeeId || !startDate) return res.status(400).json({ error: 'Faltan parámetros.' });
    try {
        const [configRows] = await pool.query('SELECT description FROM invoice_config WHERE id = 1');
        const config = configRows[0];
        
        // Obtenemos los datos del empleado, incluyendo su tarifa
        const [employeeRows] = await pool.query('SELECT hourly_rate FROM employees WHERE id = ?', [employeeId]);
        const employee = employeeRows[0];
        if (!employee) return res.status(404).json({ error: 'Empleado no encontrado.' });

        const attendancesQuery = `SELECT * FROM attendances WHERE employee_id = ? AND punch_time >= ? AND punch_time < DATE_ADD(?, INTERVAL 14 DAY) ORDER BY punch_time;`;
        const [attendanceRows] = await pool.query(attendancesQuery, [employeeId, startDate, startDate]);

        const shifts = attendanceRows.map(att => {
            const duration = att.is_overtime ? 2.4 : 2.0;
            const hourlyRate = parseFloat(employee.hourly_rate);
            const gross = duration * hourlyRate;
            const day = new Date(att.punch_time).getDay();
            let clockText = 'N/A';
            if (att.shift_type === 'morning') clockText = att.is_overtime ? '7:30 - 9:54' : '7:30 - 9:30';
            else if (att.shift_type === 'evening') clockText = (day === 5) ? '20:00 - 22:00' : '17:00 - 19:00';
            
            return { 
                date: formatDate(att.punch_time), 
                description: config.description, 
                clockText, 
                duration, 
                rate: hourlyRate, 
                gross 
            };
        });

        const subtotal = shifts.reduce((sum, shift) => sum + shift.gross, 0);
        const lastDay = new Date(startDate);
        lastDay.setDate(lastDay.getDate() + 13);
        
        res.json({
            invoiceNumber: Math.floor(Date.now() / 1000),
            terms: `${formatDate(startDate)} - ${formatDate(lastDay)}`,
            shifts,
            subtotal: parseFloat(subtotal.toFixed(2)),
            total: parseFloat(subtotal.toFixed(2))
        });
    } catch (error) {
        console.error("Error en /preview:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


router.post('/generate', async (req, res) => {
  const { employeeId, startDate, invoiceNumber } = req.body;
  if (!employeeId || !startDate || !invoiceNumber) return res.status(400).json({ error: 'Faltan parámetros' });

  try {
    const templatePath = path.join(__dirname, '../templates/invoice-template.pdf');
    const templateBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const page = pdfDoc.getPages()[0];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const black = rgb(0, 0, 0);

    const [employeeRows] = await pool.query('SELECT * FROM employees WHERE id = ?', [employeeId]);
    const employee = employeeRows[0];
    const [configRows] = await pool.query('SELECT * FROM invoice_config WHERE id = 1');
    const config = configRows[0];
    const attendancesQuery = `SELECT * FROM attendances WHERE employee_id = ? AND punch_time >= ? AND punch_time < DATE_ADD(?, INTERVAL 14 DAY) ORDER BY punch_time;`;
    const [attendances] = await pool.query(attendancesQuery, [employeeId, startDate, startDate]);

    const FONT_SIZE = 7;
    const fullName = [employee.name, employee.second_name, employee.surname, employee.second_surname].filter(Boolean).join(' ');

    const headLeftX = 115;
    const headRightX = 420;
    const headLeftY = 716;
    const headRightY = 716;
    const footLeftX = 90;
    const footRightX = 350;
    const footLeftY = 242;
    const footRightY = 242;

    page.drawText(fullName, { x: headLeftX, y: headLeftY, font, size: FONT_SIZE, color: black });
    page.drawText(employee.address, { x: headLeftX, y: headLeftY - 15, font, size: FONT_SIZE, color: black });
    page.drawText(employee.telephone, { x: headLeftX, y: headLeftY - 30, font, size: FONT_SIZE, color: black });
    page.drawText(employee.abn, { x: headLeftX, y: headLeftY - 45, font, size: FONT_SIZE, color: black });
    page.drawText(employee.email, { x: headLeftX, y: headLeftY - 60, font, size: FONT_SIZE, color: black });
    page.drawText(config.company_email, { x: headLeftX, y: (headLeftY - 92), font, size: FONT_SIZE, color: black });
    page.drawText(config.company_abn, { x: headLeftX, y: (headLeftY - 92) - 15, font, size: FONT_SIZE, color: black });
    page.drawText(config.business_telephone, { x: headLeftX, y: (headLeftY - 92) - 30, font, size: FONT_SIZE, color: black });
    page.drawText(employee.bank_name, { x: footLeftX, y: footLeftY - 2, font, size: FONT_SIZE, color: black });
    page.drawText(employee.account_type, { x: footLeftX, y: footLeftY - 30 - 3, font, size: FONT_SIZE, color: black });
    page.drawText(employee.account_name, { x: footRightX, y: footRightY - 2, font, size: FONT_SIZE, color: black });
    page.drawText(employee.bsb, { x: footRightX, y: footRightY - 15 - 2, font, size: FONT_SIZE, color: black });
    page.drawText(employee.account_number, { x: footRightX, y: footRightY - 30 - 3, font, size: FONT_SIZE, color: black });
    
    const lastDayOfFortnight = new Date(new Date(startDate).setDate(new Date(startDate).getDate() + 13));
    const dueDate = new Date(new Date(lastDayOfFortnight).setDate(lastDayOfFortnight.getDate() + 5));
    
    page.drawText(String(invoiceNumber), { x: headRightX, y: headRightY, font, size: FONT_SIZE, color: black });
    page.drawText(formatDate(lastDayOfFortnight), { x: headRightX, y: headRightY - 15, font, size: FONT_SIZE, color: black });
    page.drawText(`${formatDate(startDate)} - ${formatDate(lastDayOfFortnight)}`, { x: headRightX, y: headRightY - 30, font, size: FONT_SIZE, color: black });
    page.drawText(formatDate(dueDate), { x: headRightX, y: headRightY - 45, font, size: FONT_SIZE, color: black });
    page.drawText(config.description, { x: headRightX, y: headRightY - 60, font, size: FONT_SIZE, color: black });
    
    let currentY = 532;
    let bodyX = 62;
    let grandTotal = 0;
    let totalHours = 0;

    for (const att of attendances) {
      const punchDate = new Date(att.punch_time);
      const day = punchDate.getDay();
      let clockText = 'N/A';
      if (att.shift_type === 'morning') clockText = att.is_overtime ? '7:30 - 9:54' : '7:30 - 9:30';
      else if (att.shift_type === 'evening') clockText = (day === 5) ? '20:00 - 22:00' : '17:00 - 19:00';
      
      const duration = att.is_overtime ? 2.4 : 2.0;
      const hourlyRate = parseFloat(employee.hourly_rate);
      const gross = duration * hourlyRate;
      grandTotal += gross;
      totalHours += duration;

      page.drawText(formatDate(punchDate), { x: bodyX, y: currentY, font, size: FONT_SIZE, color: black });
      page.drawText(config.description, { x: bodyX + 80, y: currentY, font, size: FONT_SIZE, color: black });
      if (att.shift_type === 'morning') {
        page.drawText(clockText, { x: bodyX + 232, y: currentY, font, size: FONT_SIZE, color: black });
      } else {
        page.drawText(clockText, { x: bodyX + 228, y: currentY, font, size: FONT_SIZE, color: black });
      }
      page.drawText(duration.toFixed(2), { x: bodyX + 314, y: currentY, font, size: FONT_SIZE, color: black });
      page.drawText(`$${hourlyRate.toFixed(2)}`, { x: bodyX + 384, y: currentY, font, size: FONT_SIZE, color: black });
      page.drawText(`$${gross.toFixed(2)}`, { x: bodyX + 457, y: currentY, font, size: FONT_SIZE, color: black });
      
      currentY -= 15.4;
    }
    
    page.drawText(`${totalHours.toFixed(2)}`, { x: 373, y: 317, font, size: FONT_SIZE, color: black });
    page.drawText(`$${grandTotal.toFixed(2)}`, { x: 516, y: 317, font, size: FONT_SIZE, color: black });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceNumber}.pdf`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("[BACKEND] Error al generar el PDF:", error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;