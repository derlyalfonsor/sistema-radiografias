require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error de conexión a MongoDB:', err));

// Modelo de Paciente
const pacienteSchema = new mongoose.Schema({
  idPaciente: String,
  nombre: String,
  radiografias: [{
    idRadiografia: String,
    tipo: String,
    estado: { 
      type: String, 
      enum: ['pendiente', 'lista', 'revisada'],
      default: 'pendiente'
    },
    fechaNotificacion: Date
  }]
});

const Paciente = mongoose.model('Paciente', pacienteSchema);

// Función de notificación
async function notificarPaciente(paciente, radiografia) {
  radiografia.fechaNotificacion = new Date();
  await paciente.save();
  console.log(`📄 Radiografía ${radiografia.idRadiografia} (${radiografia.tipo}) lista para ${paciente.nombre}`);
}

// Interfaz web principal
app.get('/', async (req, res) => {
  try {
    const pacienteId = req.query.id;

    if (!pacienteId) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Sistema de Radiografías</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #2c3e50; }
            form { background: #f9f9f9; padding: 20px; border-radius: 8px; }
            input, button { padding: 10px; margin: 5px 0; }
            button { background: #3498db; color: white; border: none; cursor: pointer; }
            .radiografia { margin: 10px 0; padding: 10px; border-left: 4px solid; }
            .pendiente { border-color: #e74c3c; background: #fdecea; }
            .lista { border-color: #2ecc71; background: #e8f8f0; }
            .revisada { border-color: #3498db; background: #ebf5fb; }
          </style>
        </head>
        <body>
          <h1>🔍 Consulta de Radiografías</h1>
          <form method="get">
            <label for="id"><strong>Ingrese ID del paciente:</strong></label><br>
            <input type="text" id="id" name="id" required placeholder="Ej: 652a3b1c4c1d8f001d8e8f90">
            <button type="submit">Verificar</button>
          </form>
          <p><strong>Endpoints API:</strong></p>
          <ul>
            <li><strong>POST</strong> /api/pacientes - Crear paciente</li>
            <li><strong>PUT</strong> /api/pacientes/:id/radiografias/:idRad - Actualizar estado</li>
            <li><strong>GET</strong> /api/pacientes - Listar todos los pacientes</li>
          </ul>
        </body>
        </html>
      `);
    }

    const paciente = await Paciente.findById(pacienteId);
    
    if (!paciente) {
      return res.send(`
        <h1>⚠️ Paciente no encontrado</h1>
        <p>El ID <strong>${pacienteId}</strong> no existe en nuestros registros.</p>
        <a href="/">Volver</a>
      `);
    }

    const radiografiasPendientes = paciente.radiografias.filter(r => r.estado === 'pendiente');
    const radiografiasListas = paciente.radiografias.filter(r => r.estado === 'lista');
    const radiografiasRevisadas = paciente.radiografias.filter(r => r.estado === 'revisada');

    let mensajePrincipal = '';
    if (radiografiasPendientes.length > 0) {
      mensajePrincipal = `<h2>⚠️ ${paciente.nombre}, tienes <strong>${radiografiasPendientes.length}</strong> radiografía(s) pendiente(s)</h2>`;
    } else {
      mensajePrincipal = `<h2>✅ ${paciente.nombre}, no tienes radiografías pendientes</h2>`;
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Estado de Radiografías</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #2c3e50; }
          h2 { margin-top: 30px; }
          .radiografia { margin: 10px 0; padding: 10px; border-left: 4px solid; }
          .pendiente { border-color: #e74c3c; background: #fdecea; }
          .lista { border-color: #2ecc71; background: #e8f8f0; }
          .revisada { border-color: #3498db; background: #ebf5fb; }
          .volver { display: inline-block; margin-top: 20px; padding: 8px 15px; background: #3498db; color: white; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>📊 Estado de Radiografías</h1>
        ${mensajePrincipal}
        
        ${radiografiasPendientes.length > 0 ? `
          <h3>Pendientes:</h3>
          ${radiografiasPendientes.map(r => `
            <div class="radiografia pendiente">
              <strong>Tipo:</strong> ${r.tipo}<br>
              <strong>ID Radiografía:</strong> ${r.idRadiografia}
            </div>
          `).join('')}
        ` : ''}

        ${radiografiasListas.length > 0 ? `
          <h3>Listas para revisión:</h3>
          ${radiografiasListas.map(r => `
            <div class="radiografia lista">
              <strong>Tipo:</strong> ${r.tipo}<br>
              <strong>ID Radiografía:</strong> ${r.idRadiografia}<br>
              <