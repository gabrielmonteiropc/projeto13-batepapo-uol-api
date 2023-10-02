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

const mensagemEsquema = Joi.object({

    from: Joi.string().required(),
    to: Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.required().valid("message", "private_message")

})


// Rotas
app.post("/participants", async (req, res) => {

    const { name } = req.body;

    const validacao = participantesEsquema.validate(req.body, { abortEarly: false });

    if (validacao.error) {
        const erros = validacao.error.details.map(detail => detail.message)
        return res.status(422).send(erros)
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

app.get("/participants", async (req, res) => {
    try {
        const participantes = await db.collection("participants").find().toArray()
        res.send(participantes)
    } catch (err) {
        res.status(500).send(err.message)
    }
})

app.post("/messages", async (req, res) => {

    //const { to, text, type } = req.body

    const { user } = req.headers

    const validacao = mensagemEsquema.validate({ ...req.body, from: user }, { abortEarly: false });

    if (validacao.error) {
        const erros = validacao.error.details.map(detail => detail.message)
        return res.status(422).send(erros)
    }

    try {

        const participante = await db.collection("participants").findOne({ name: user })

        if (!participante) return res.status(422).send("precisa entrar na sala para enviar uma mensagem")

        const mensagem = {
            ...req.body,
            from: user,
            time: dayjs().format("HH:mm:ss")
        }

        await db.collection("messages").insertOne(mensagem)

        res.sendStatus(201)

    } catch (err) {
        res.status(500).send(err.message)
    }
})

app.get("/messages", async (req, res) => {

    const { user } = req.headers

    const { limit } = req.query

    const numeroLimite = Number(limit)

    if (limit !== undefined && (numeroLimite <= 0 || isNaN(numeroLimite))) {
        return res.status(422).send("Insira um limite que seja válido")
    }

    try {
        const messages = await db.collection("messages")
            .find({ $or: [{ from: user }, { to: user }, { to: "Todos" }, { type: "message" }] })
            .sort({ time: -1 })
            .limit(limit === undefined ? 0 : numeroLimite)
            .toArray()

        res.send(messages)

    } catch (err) {
        res.status(500).send(err.message)
    }

})

app.post("/status"), async (req, res) => {

    const { user } = req.headers

    if (!user) return res.status(404).send("Informe um usuário")

    try {

        const participante = await db.collection("participants").findOne({ name: user })

        if (!participante) return res.status(404).send("Informe um usuário válido")

        await db.collection("participants").updateOne(
            { name: user }, { $set: { lastStatus: Date.now() } }
        )

        res.sendStatus(200)

    } catch (err) {
        res.status(500).send(err.message)
    }
}

// Escutando requisições
const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));