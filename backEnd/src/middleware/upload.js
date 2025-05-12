const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../utils/helpers');

// Configurar almacenamiento para Multer
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../../public/uploads/avatars');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Generar un nombre único para el archivo
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    
    cb(null, uniqueFilename);
  }
});

// Configurar filtro para archivos
const fileFilter = (req, file, cb) => {
  // Solo permitir imágenes
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no soportado. Solo se permiten imágenes (jpeg, jpg, png, gif).'), false);
  }
};

// Crear middleware para subida de avatares
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  }
});

// Middleware para manejar la subida de avatares
exports.handleAvatarUpload = (req, res, next) => {
  // Usar multer para procesar un solo archivo con el nombre 'avatar'
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        // Error de Multer (tamaño, etc)
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            status: 'error',
            message: 'El archivo es demasiado grande. El tamaño máximo es 5MB.'
          });
        }
        return res.status(400).json({
          status: 'error',
          message: `Error de subida: ${err.message}`
        });
      } else {
        // Error personalizado del filtro o cualquier otro error
        return res.status(400).json({
          status: 'error',
          message: err.message
        });
      }
    }
    
    // Si hay un archivo subido exitosamente, añadir la ruta a req
    if (req.file) {
      // Guardamos la ruta relativa en req para usarla en el controlador
      req.avatarUrl = `/uploads/avatars/${req.file.filename}`;
    }
    
    next();
  });
};