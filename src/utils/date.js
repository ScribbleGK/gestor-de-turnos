// Usamos una fecha ancla en la zona horaria local.
const ANCHOR_DATE = new Date('2025-09-15T00:00:00'); 
const PERIOD_DAYS = 14;

/**
 * Calcula la fecha de inicio de la quincena de 14 días para cualquier fecha dada,
 * basándose en la zona horaria local del navegador.
 * @param {Date} targetDate - La fecha para la cual calcular el inicio de la quincena.
 * @returns {Date} La fecha de inicio de la quincena.
 */
const getFortnightStartDateForDate = (targetDate) => {
  // Reseteamos la hora para trabajar solo con días y evitar problemas con el horario de verano.
  const targetDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const anchorDay = new Date(ANCHOR_DATE.getFullYear(), ANCHOR_DATE.getMonth(), ANCHOR_DATE.getDate());

  const diffTime = targetDay - anchorDay;
  // Calculamos la diferencia en días.
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    // Maneja fechas anteriores a la fecha ancla (no debería pasar en nuestro caso, pero es robusto)
    const periodsToGoBack = Math.ceil(Math.abs(diffDays) / PERIOD_DAYS) || 1;
    const startDate = new Date(anchorDay);
    startDate.setDate(startDate.getDate() - periodsToGoBack * PERIOD_DAYS);
    return startDate;
  }

  // Calculamos cuántos períodos completos de 14 días han pasado.
  const periodsPassed = Math.floor(diffDays / PERIOD_DAYS);
  
  // La fecha de inicio es la fecha ancla más los días de los períodos que han pasado.
  const startDate = new Date(anchorDay);
  startDate.setDate(startDate.getDate() + periodsPassed * PERIOD_DAYS);

  return startDate;
};


/**
 * Genera una lista de las últimas 12 quincenas para el menú desplegable.
 * @returns {Array<{value: string, label: string}>} Un array de objetos para el <select>.
 */
export const getFortnightOptions = () => {
  const options = [];
  let currentStartDate = getFortnightStartDateForDate(new Date());

  for (let i = 0; i < 12; i++) {
    const endDate = new Date(currentStartDate);
    endDate.setDate(endDate.getDate() + 13);

    const yyyy = currentStartDate.getFullYear();
    const mm = String(currentStartDate.getMonth() + 1).padStart(2, '0');
    const dd = String(currentStartDate.getDate()).padStart(2, '0');
    const value = `${yyyy}-${mm}-${dd}`;

    const label = `${currentStartDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}`;
    
    options.push({ value, label });

    // Retrocedemos 14 días para encontrar el inicio de la quincena anterior.
    currentStartDate.setDate(currentStartDate.getDate() - PERIOD_DAYS);
  }

  return options;
};

/**
 * **NUEVA FUNCIÓN CORREGIDA**
 * Obtiene la fecha de inicio de la quincena actual en formato YYYY-MM-DD.
 * Esta función es necesaria para componentes como TableView.
 * @returns {string} La fecha de inicio de la quincena actual.
 */
export const getFortnightStartDate = () => {
  const startDate = getFortnightStartDateForDate(new Date());
  
  const yyyy = startDate.getFullYear();
  const mm = String(startDate.getMonth() + 1).padStart(2, '0');
  const dd = String(startDate.getDate()).padStart(2, '0');
  
  return `${yyyy}-${mm}-${dd}`;
};