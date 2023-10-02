import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { MongoClient } from 'mongodb';
import Joi from 'joi';
import dayjs from 'dayjs';

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

// Esquemas
const participantesEsquema = Joi.object({ name: Joi.string().required() })


// Rotas
app.post("/participants", async (req, res) => {

    const { name } = req.body;

    const validacao = participantesEsquema.validate(req.body, { abortEarly: false });

    if (validacao.error) {
        const erros = validacao.error.details.map(detail => detail.message)
        res.status(422).send(erros)
    }

    try {
        const participante = await db.collection("participants").findOne({ name })
        if (participante) return res.status(409).send("Nome de usuário já cadastrado")

        const timesTamp = Date.now()
        await db.collection("participants").insertOne({ name, lastStatus: timesTamp })

        const mensagem = {
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs(timesTamp).format("HH:mm:ss")
        }

        await db.collection("messages").insertOne(mensagem)

        res.sendStatus(201)

    } catch (err) {
        res.status(500).send(err.message)
    }

})


// Escutando requisições
const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));