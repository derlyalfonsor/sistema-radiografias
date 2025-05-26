require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error de conexión:', err));

// Modelo de Paciente
const pacienteSchema = new mongoose.Schema({
  idPaciente: String,
  nombre: String,
  radiografias: [{
    idRadiografia: String,
    tipo: String,
    estado: { type: String, enum: ['pendiente', 'lista', 'revisada'] }
  }]
});

const Paciente = mongoose.model('Paciente', pacienteSchema);

// Función de notificación SIMPLIFICADA (solo consola)
async function notificarPaciente(paciente, radiografia) {
  console.log(`[Notificación] Radiografía de ${radiografia.tipo} lista para ${paciente.nombre}`);
}

// Rutas
app.post('/api/pacientes', async (req, res) => {
  try {
    const paciente = new Paciente(req.body);
    await paciente.save();
    res.status(201).json(paciente);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/pacientes/:id/radiografias/:idRad', async (req, res) => {
  try {
    const paciente = await Paciente.findById(req.params.id);
    const radiografia = paciente.radiografias.id(req.params.idRad);
    
    radiografia.estado = req.body.estado;
    
    if (radiografia.estado === 'lista') {
      await notificarPaciente(paciente, radiografia); // Notificación en consola
    }

    await paciente.save();
    res.json(paciente);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));