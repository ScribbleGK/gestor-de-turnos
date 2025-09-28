// Esta variable cambiará automáticamente dependiendo si estamos en desarrollo o producción.
const apiUrl = import.meta.env.PROD 
  ? 'https://gestor-de-turnos-api.onrender.com/api' // URL de Producción
  : 'http://localhost:3001/api'; // URL de Desarrollo

export default apiUrl;
