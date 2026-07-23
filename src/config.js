// ============================================================
// URL de l'API Laravel
// - Téléphone physique : IP locale de ton PC (même Wi-Fi)
//   ex: http://192.168.1.50:8000/api  (php artisan serve --host=0.0.0.0)
// - Émulateur Android  : http://10.0.2.2:8000/api
// - Simulateur iOS     : http://127.0.0.1:8000/api
// ============================================================
export const API_URL = 'http://192.168.1.16:8000/api';
export const SERVER_URL = API_URL.replace(/\/api\/?$/, '');
