// assignAdminRole.js
const admin = require('firebase-admin');

// Reemplaza con la ruta a tu archivo de clave de servicio.
// Este script asume que has descargado tu clave y la has guardado
// en la raíz de tu proyecto como 'serviceAccountKey.json'.
// ¡ASEGÚRATE DE QUE ESTE ARCHIVO NO SE SUBA A TU REPOSITORIO DE GITHUB!
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Reemplaza con el UID del usuario que quieres que sea admin
const uid = 'REEMPLAZA_CON_EL_UID_DE_TU_USUARIO';

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log('¡Rol de administrador asignado con éxito!');
    console.log('Para que los cambios surtan efecto, es posible que el usuario deba cerrar sesión y volver a iniciarla.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error al asignar el rol de administrador:', error);
    process.exit(1);
  });
