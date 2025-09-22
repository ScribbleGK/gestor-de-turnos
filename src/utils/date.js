
export const getFortnightStartDate = () => {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-11

  let startDate;

  if (dayOfMonth <= 14) {
    // Si estamos en la primera quincena (días 1-14), el inicio es el día 1.
    startDate = new Date(year, month, 1);
  } else {
    // Si estamos en la segunda quincena (días 15 en adelante), el inicio es el día 15.
    startDate = new Date(year, month, 15);
  }

  // Devolvemos la fecha en el formato YYYY-MM-DD que necesita nuestra API.
  const yyyy = startDate.getFullYear();
  const mm = String(startDate.getMonth() + 1).padStart(2, '0'); // Los meses son 0-11
  const dd = String(startDate.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
};