# Usamos una imagen base de Node.js
FROM node:20-alpine

# Establecemos el directorio de trabajo
WORKDIR /app

# Copiamos los archivos package.json y package-lock.json
COPY package*.json ./

# Instalamos las dependencias del proyecto
RUN npm install

# Copiamos el resto de los archivos del proyecto
COPY . .

# Exponemos el puerto de la aplicación
EXPOSE 8000

# Comando para ejecutar la aplicación
CMD ["node", "index.js"]