import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { MongoClient } from 'mongodb';

const app = express();

// Configurações
app.use(cors());
app.use(express.json());
dotenv.config();

// Conexão com banco de dados
const mongoClient = new MongoClient(process.env.DATABASE_URL);

try {
    mongoClient.connect();
    console.log('Mongodb conectado');
} catch (err) {
    console.log(err.message);
}

const db = mongoClient.db();

// Rotas


// Escutando requisições
const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));