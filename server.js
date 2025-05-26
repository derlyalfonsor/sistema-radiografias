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

// Función de notificación (simulada)
async function notificarPaciente(paciente, radiografia) {
  const mensaje = `📄 Radiografía de ${radiografia.tipo} lista para ${paciente.nombre}`;
  console.log(mensaje);
  
  // Actualiza fecha de notificación
  radiografia.fechaNotificacion = new Date();
  await paciente.save();
}

// Ruta de inicio
app.get('/', (req, res) => {
  res.send(`
    <h1>🚀 API de Radiografías</h1>
    <p>Endpoints disponibles:</p>
    <ul>
      <li><strong>POST</strong> /api/pacientes - Crear paciente</li>
      <li><strong>PUT</strong> /api/pacientes/:id/radiografias/:idRad - Actualizar estado</li>
      <li><strong>GET</strong> /api/pacientes - Listar todos los pacientes</li>
    </ul>
  `);
});

// Crear paciente
app.post('/api/pacientes', async (req, res) => {
  try {
    const paciente = new Paciente(req.body);
    await paciente.save();
    res.status(201).json(paciente);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Actualizar radiografía
app.put('/api/pacientes/:id/radiografias/:idRad', async (req, res) => {
  try {
    const paciente = await Paciente.findById(req.params.id);
    const radiografia = paciente.radiografias.id(req.params.idRad);
    
    radiografia.estado = req.body.estado;
    
    if (radiografia.estado === 'lista') {
      await notificarPaciente(paciente, radiografia);
    }

    await paciente.save();
    res.json(paciente);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Listar pacientes (nuevo endpoint)
app.get('/api/pacientes', async (req, res) => {
  try {
    const pacientes = await Paciente.find();
    res.json(pacientes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🖥️ Servidor corriendo en puerto ${PORT}`));