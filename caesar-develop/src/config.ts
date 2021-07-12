import * as configLoader from 'node-yaml-config';
const config = configLoader.load('./config/config.yml');

export default config;