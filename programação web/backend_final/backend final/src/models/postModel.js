/**
 * models/postModel.js
 *
 * Este arquivo contém todas as funções que fazem a comunicação direta com o banco de dados MongoDB.
 * Ele é chamado pelos controllers (como postController.js).
 *
 * Cada função aqui:
 *  - abre a conexão com o banco
 *  - acessa a coleção "posts"
 *  - executa a operação desejada (find, insertOne, updateOne, deleteOne, etc)
 *  - retorna o resultado ao controller
 */

import conectarAoBanco from '../../src/config/dbConfig.js'; // função que faz a conexão (dbConfig.js)
import { ObjectId } from "mongodb"; // necessário para criar/ler IDs no formato do MongoDB

// ==============================
// Conexão inicial com o banco
// ==============================

// Aqui chamamos a função conectarAoBanco passando a string de conexão que está nas variáveis de ambiente (.env)
const conexao = await conectarAoBanco(process.env.STRING_CONEXAO);

// Função auxiliar para acessar a coleção (evita repetir código)
function obterColecao() {
  // Nome do banco de dados que queremos usar
  const db = conexao.db("instavale");
  // Nome da coleção dentro do banco (similar a uma “tabela” em SQL)
  const colecao = db.collection("posts");
  return colecao;
}

/* ========================================================
   1️⃣ getPosts()
   Função: busca e retorna todos os posts.
   Método correspondente no controller: GET /posts
   ======================================================== */
export const getPosts = async () => {
  const colecao = obterColecao();
  // find() sem filtros => retorna todos os documentos da coleção
  return await colecao.find().toArray();
};

/* ========================================================
   2️⃣ getPostById(id)
   Função: busca um único post pelo seu _id (ObjectId).
   Método correspondente no controller: GET /posts/:id
   ======================================================== */
export const getPostById = async (id) => {
  const colecao = obterColecao();

  // converte o id (string) em um ObjectId válido
  const objectId = new ObjectId(id);

  // procura um único documento com esse _id
  const post = await colecao.findOne({ _id: objectId });

  return post; // se não encontrar, retorna null
};

/* ========================================================
   3️⃣ createPost(novoPost)
   Função: insere (cria) um novo post no banco.
   Método correspondente no controller: POST /posts
   ======================================================== */
export const createPost = async (novoPost) => {
  const colecao = obterColecao();

  // insertOne insere um único documento (objeto) no MongoDB
  const resultado = await colecao.insertOne(novoPost);

  // opcionalmente, podemos retornar o documento completo inserido
  return { _id: resultado.insertedId, ...novoPost };
};

/* ========================================================
   4️⃣ updatePost(id, dadosAtualizados)
   Função: atualiza (substitui ou edita parcialmente) um post existente.
   Método correspondente no controller: PUT /posts/:id  ou PATCH /posts/:id
   ======================================================== */
export const updatePost = async (id, dadosAtualizados) => {
  const colecao = obterColecao();
  const objectId = new ObjectId(id);

  // $set = apenas substitui os campos passados, sem apagar os outros
  const resultado = await colecao.updateOne(
    { _id: objectId },      // filtro (quem será atualizado)
    { $set: dadosAtualizados } // valores a atualizar
  );

  // Se nenhum documento foi modificado, significa que o ID não existia
  if (resultado.matchedCount === 0) {
    return null;
  }

  // Retorna o documento atualizado (pegamos novamente do banco)
  const postAtualizado = await colecao.findOne({ _id: objectId });
  return postAtualizado;
};

/* ========================================================
   5️⃣ updateImgUrl(id, imgUrl)
   Função: atualiza apenas o campo imgUrl de um post.
   (usada em uploads ou atualização de imagem)
   ======================================================== */
export const updateImgUrl = async (id, imgUrl) => {
  const colecao = obterColecao();
  const objectId = new ObjectId(id);

  const resultado = await colecao.updateOne(
    { _id: objectId },
    { $set: { imgUrl: imgUrl } }
  );

  // retorna true/false conforme o sucesso
  return resultado.modifiedCount > 0;
};

/* ========================================================
   6️⃣ deletePost(id)
   Função: deleta um post do banco pelo id.
   Método correspondente no controller: DELETE /posts/:id
   ======================================================== */
export const deletePost = async (id) => {
  const colecao = obterColecao();
  const objectId = new ObjectId(id);

  // deleteOne remove o documento com o _id especificado
  const resultado = await colecao.deleteOne({ _id: objectId });

  // se deletedCount for 0, o post não existia
  return resultado.deletedCount > 0;
};

/* ========================================================
   🔧 Extra: função opcional para buscar posts por texto
   Exemplo: busca posts que contenham uma palavra na descrição.
   (você pode criar endpoints para filtros ou buscas personalizadas)
   ======================================================== */
export const searchPostsByDescription = async (texto) => {
  const colecao = obterColecao();

  // expressão regular (regex) -> procura por texto parcial, ignorando maiúsculas/minúsculas
  const posts = await colecao.find({
    descricao: { $regex: texto, $options: "i" }
  }).toArray();

  return posts;
};

/* ========================================================
   🔧 Extra: função para contagem de posts
   ======================================================== */
export const countPosts = async () => {
  const colecao = obterColecao();
  return await colecao.countDocuments(); // retorna o número total de posts
};


// Explicando o fluxo geral
// Função do Model	O que faz	Método HTTP no Controller
// getPosts()	Busca todos os posts	GET /posts
// getPostById(id)	Busca um post específico	GET /posts/:id
// createPost(novoPost)	Cria um novo post	POST /posts
// updatePost(id, dadosAtualizados)	Atualiza campos de um post	PUT ou PATCH /posts/:id
// updateImgUrl(id, imgUrl)	Atualiza só o campo imgUrl	PATCH /posts/:id/image
// deletePost(id)	Deleta um post e retorna sucesso	DELETE /posts/:id
// searchPostsByDescription(texto)	(extra) Busca posts por palavra-chave	GET /posts/search?texto=...
// countPosts()	(extra) Retorna número total de posts	GET /posts/count
//  Entendendo o papel de cada camada:
// [ Navegador / App Frontend ]
//           ↓
// [ Rotas / Endpoints Express ] → chama funções do controller
//           ↓
// [ Controller (postController.js) ] → valida e formata dados
//           ↓
// [ Model (postModel.js) ] → conversa direto com o MongoDB
//           ↓
// [ Banco de Dados (MongoDB Atlas) ]
