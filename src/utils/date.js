import { startOfWeek, addDays, format } from 'date-fns';

// Configuración: Fecha Ancla (Lunes 8 de Diciembre 2025)
const ANCHOR_DATE = new Date(2025, 11, 8); // Mes 11 = Diciembre

/**
 * Calcula el inicio de la quincena actual basado en la fecha ancla.
 * Retorna un objeto Date.
 */
export const getFortnightStart = (date = new Date()) => {
  // Aseguramos que trabajamos con el inicio de la semana (Lunes)
  const currentCheck = startOfWeek(date, { weekStartsOn: 1 });
  
  const diffTime = currentCheck.getTime() - ANCHOR_DATE.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Calculamos cuántos bloques de 14 días han pasado
  // Math.floor maneja correctamente fechas anteriores al ancla devolviendo negativos
  const fortnightsPassed = Math.floor(diffDays / 14);
  
  // Sumamos esas quincenas a la fecha ancla
  return addDays(ANCHOR_DATE, fortnightsPassed * 14);
};

/**
 * RE-AGREGADA: Esta es la función que TableView.jsx estaba buscando.
 * Devuelve la fecha en string 'YYYY-MM-DD' para las consultas SQL.
 */
export const getFortnightStartDate = () => {
  const date = getFortnightStart(new Date());
  return format(date, 'yyyy-MM-dd');
};

/**
 * Genera opciones para el selector de periodos (dropdown).
 */
export const getFortnightOptions = () => {
  const options = [];
  // Empezamos 4 quincenas en el futuro para tener margen
  let current = getFortnightStart(addDays(new Date(), 14 * 4)); 
  
  // Generamos 16 periodos hacia atrás
  for (let i = 0; i < 16; i++) {
    const end = addDays(current, 13);
    const label = `${format(current, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')}`;
    const value = format(current, 'yyyy-MM-dd');
    
    options.push({ label, value });
    current = addDays(current, -14); // Retroceder 14 días
  }
  return options;
};

// Formateador auxiliar
export const formatDateForSQL = (date) => format(date, 'yyyy-MM-dd');