require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Joi = require('joi');
const { sendSMS, sendEmail } = require('./notificaciones');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error conectando a MongoDB:', err));

// Esquema y modelo de Mongoose
const pacienteSchema = new mongoose.Schema({
  idPaciente: String,
  nombre: String,
  fechaNacimiento: Date,
  telefono: String,
  email: String,
  radiografias: [{
    idRadiografia: String,
    tipo: String,
    fechaRealizacion: Date,
    estado: { type: String, enum: ['pendiente', 'procesando', 'lista', 'revisada'] },
    urlImagen: String,
    notificado: Boolean
  }],
  preferenciaNotificacion: { type: String, enum: ['sms', 'email', 'ambos'] }
});

const Paciente = mongoose.model('Paciente', pacienteSchema);

// Esquema de validación Joi
const radiografiaSchema = Joi.object({
  idRadiografia: Joi.string().required(),
  tipo: Joi.string().required(),
  fechaRealizacion: Joi.date().required(),
  estado: Joi.string().valid('pendiente', 'procesando', 'lista', 'revisada').required(),
  urlImagen: Joi.string().uri(),
  notificado: Joi.boolean()
});

const pacienteSchemaJoi = Joi.object({
  idPaciente: Joi.string().required(),
  nombre: Joi.string().required(),
  fechaNacimiento: Joi.date(),
  telefono: Joi.string(),
  email: Joi.string().email(),
  radiografias: Joi.array().items(radiografiaSchema).required(),
  preferenciaNotificacion: Joi.string().valid('sms', 'email', 'ambos')
});

// Rutas
app.get('/api/pacientes', async (req, res) => {
  try {
    const pacientes = await Paciente.find();
    res.json(pacientes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/pacientes/:id', async (req, res) => {
  try {
    const paciente = await Paciente.findById(req.params.id);
    if (!paciente) return res.status(404).json({ message: 'Paciente no encontrado' });
    res.json(paciente);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/pacientes', async (req, res) => {
  const { error } = pacienteSchemaJoi.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const paciente = new Paciente(req.body);
  try {
    const nuevoPaciente = await paciente.save();
    res.status(201).json(nuevoPaciente);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/pacientes/:id/radiografias/:idRad', async (req, res) => {
  try {
    const { estado } = req.body;
    const paciente = await Paciente.findById(req.params.id);
    if (!paciente) return res.status(404).json({ message: 'Paciente no encontrado' });

    const radiografia = paciente.radiografias.id(req.params.idRad);
    if (!radiografia) return res.status(404).json({ message: 'Radiografía no encontrada' });

    radiografia.estado = estado;
    
    // Si el estado cambia a "lista" y no ha sido notificado
    if (estado === 'lista' && !radiografia.notificado) {
      await notificarPaciente(paciente, radiografia);
      radiografia.notificado = true;
    }

    await paciente.save();
    res.json(paciente);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

async function notificarPaciente(paciente, radiografia) {
  const mensaje = `Estimado ${paciente.nombre}, su radiografía de ${radiografia.tipo} está lista para revisión.`;

  try {
    if (paciente.preferenciaNotificacion === 'sms' || paciente.preferenciaNotificacion === 'ambos') {
      await sendSMS(paciente.telefono, mensaje);
    }
    
    if (paciente.preferenciaNotificacion === 'email' || paciente.preferenciaNotificacion === 'ambos') {
      await sendEmail(paciente.email, 'Radiografía lista', mensaje);
    }
  } catch (err) {
    console.error('Error enviando notificación:', err);
    // Podrías implementar un sistema de reintentos aquí
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));