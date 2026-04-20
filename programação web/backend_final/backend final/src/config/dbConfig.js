// Arquivo: dbConfig.js
// 
// Esse arquivo serve para conectar o projeto a um banco de dados MongoDB Atlas (ou local).
// Ele é um módulo de configuração, ou seja, algo que você importa em outros arquivos sempre que precisar usar o banco.


// Importa a classe MongoClient da biblioteca 'mongodb'.
// Essa classe é quem sabe como se conectar e conversar com o banco MongoDB.
import { MongoClient } from 'mongodb';

// Exporta uma função assíncrona chamada 'conectarAoBanco'.
// Ela recebe uma string de conexão (um link do MongoDB Atlas).
export default async function conectarAoBanco(stringConexao) {
    let mongoClient; // Variável que vai guardar o cliente de conexão.

    try {
        // Cria um novo cliente (objeto) para o MongoDB usando o link de conexão.
        mongoClient = new MongoClient(stringConexao);

        // Mostra no console que está tentando conectar.
        console.log('Conectando ao cluster do banco de dados...');

        // Espera (await) a conexão acontecer.
        // Essa linha realmente faz o programa se conectar ao banco.
        await mongoClient.connect();

        // Se chegou até aqui, deu certo!
        console.log('Conectado ao MongoDB Atlas com sucesso!');

        // Retorna o cliente conectado para ser usado em outras partes do código.
        return mongoClient;
    } catch (erro) {
        // Se algo der errado na tentativa de conexão, mostra o erro no console.
        console.error('Falha na conexão com o banco!', erro);

        // Encerra o programa, já que sem o banco nada vai funcionar direito.
        process.exit();
    }
}
