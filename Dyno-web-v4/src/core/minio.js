const Minio = require('minio');
const config = require('./config');

const minioClient = new Minio.Client({
    endPoint: 's.dyno.gg',
    port: 443,
    useSSL: true,
    accessKey: config.minio.access_key,
    secretKey: config.minio.secret_key,
});

module.exports = minioClient;
