/**
 * controllers/postController.js
 *
 * Controller responsável por receber requisições HTTP relacionadas a "posts"
 * e encaminhá-las para o model (que fala com o banco).
 *
 * Aqui temos funções para:
 * - Buscar todos os posts
 * - Buscar post por id
 * - Criar post (sem imagem)
 * - Criar post com upload de imagem
 * - Substituir/atualizar post (PUT)
 * - Atualizar parcialmente um post (PATCH)
 * - Atualizar somente a imagem de um post (upload/replace)
 * - Deletar um post
 *
 * Observações:
 * - Este controller assume que existe um middleware de upload (ex: multer)
 *   que popula `req.file` quando enviado arquivo.
 * - As funções do model importadas abaixo (getPosts, getPostById, createPost,
 *   updatePost, deletePost) devem existir em ../models/postModel.js.
 * - Usamos `ObjectId` para garantir ids no formato do MongoDB.
 * - Usamos `fs.promises` para operações assíncronas com arquivos.
 */

import { getPosts, getPostById, createPost, updatePost, deletePost } from "../models/postModel.js";
// importa ObjectId para validar/gerar ids compatíveis com MongoDB
import { ObjectId } from "mongodb";
// fs.promises é a versão assíncrona do file system — preferível a sync em servidores
import fs from "fs/promises";

/* =========================
   Função: controllerGetPosts
   Método: GET /posts
   O que faz: busca todos os posts e retorna como JSON.
   ========================= */
export const controllerGetPosts = async (req, res) => {
  try {
    // chama o model que busca todos os posts no banco
    const posts = await getPosts();
    // responde com status 200 (OK) e o array de posts
    return res.status(200).json(posts);
  } catch (erro) {
    // log para o servidor/developer
    console.error("Erro em controllerGetPosts:", erro.message);
    // status 500 -> erro interno do servidor
    return res.status(500).json({ erro: "Falha ao buscar posts." });
  }
};

/* =========================
   Função: controllerGetPostById
   Método: GET /posts/:id
   O que faz: busca um post específico pelo id.
   ========================= */
export const controllerGetPostById = async (req, res) => {
  const { id } = req.params;

  // validação básica do id (se não for um ObjectId válido, retornamos 400)
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ erro: "ID inválido." });
  }

  try {
    // pede ao model para retornar o post pelo id
    const post = await getPostById(id);

    // se não existir, devolve 404 (não encontrado)
    if (!post) {
      return res.status(404).json({ erro: "Post não encontrado." });
    }

    // se achou, retorna o post
    return res.status(200).json(post);
  } catch (erro) {
    console.error("Erro em controllerGetPostById:", erro.message);
    return res.status(500).json({ erro: "Falha ao buscar o post." });
  }
};

/* =========================
   Função: controllerPostPost
   Método: POST /posts
   O que faz: cria um post com dados do corpo da requisição (sem imagem).
   ========================= */
export const controllerPostPost = async (req, res) => {
  // req.body vem do cliente (por exemplo: { descricao: "...", titulo: "...", ... })
  const postReq = req.body;

  // validações mínimas (exemplo): checar campos obrigatórios
  if (!postReq || !postReq.descricao) {
    return res.status(400).json({ erro: "Dados inválidos. 'descricao' é obrigatório." });
  }

  try {
    // chama o model que insere no banco
    const postCriado = await createPost(postReq);
    // status 201 (Created) é mais semântico quando algo é criado
    return res.status(201).json(postCriado);
  } catch (erro) {
    console.error("Erro em controllerPostPost:", erro.message);
    return res.status(500).json({ erro: "Falha na criação do post." });
  }
};

/* =========================
   Função: controllerUploadImage
   Método: POST /posts/upload  (ou outro endpoint que você definir)
   O que faz: recebe arquivo enviado (req.file) + dados (req.body), cria post
            e armazena imagem na pasta `uploads/` com nome baseado em ObjectId.
   Observação: requer middleware de upload (ex: multer) que popula req.file.
   ========================= */
export const controllerUploadImage = async (req, res) => {
  try {
    // valida se o arquivo foi enviado pelo middleware
    if (!req.file) {
      return res.status(400).json({ erro: "Arquivo de imagem não enviado." });
    }

    // gera um novo ObjectId para nomear o arquivo e também usar como _id do post
    const _id = new ObjectId();

    // cria o link público da imagem — ajuste o host/porta conforme seu servidor
    // se usará um domínio real em produção, troque isso.
    const imgUrl = `http://localhost:3000/uploads/${_id}.png`;

    // pega campos adicionais do body (ex: descricao)
    const descricao = req.body.descricao || "";

    // cria o objeto do post que será salvo no banco
    const post = {
      _id, // armazena o ObjectId para facilitar referência (alguns preferem deixar que o DB gere)
      descricao,
      imgUrl,
      criadoEm: new Date()
    };

    // primeiro salva os dados do post no banco (se preferir, salve depois de mover a imagem)
    const postCriado = await createPost(post);

    // caminho de destino na pasta uploads (atenção: a pasta deve existir ou crie dinamicamente)
    const destino = `uploads/${_id}.png`;

    // move/renomeia o arquivo do temp (req.file.path) para a pasta uploads com o nome escolhido
    // usamos fs.promises.rename para não bloquear o event loop
    await fs.rename(req.file.path, destino);

    // retorna o post criado
    return res.status(201).json(postCriado);
  } catch (erro) {
    console.error("Erro em controllerUploadImage:", erro.message);
    // Se o arquivo temporário existir e ocorreu erro, ideal seria tentar remover o temp — mas aqui apenas retornamos erro.
    return res.status(500).json({ erro: "Falha ao fazer upload da imagem." });
  }
};

/* =========================
   Função: controllerUpdatePost
   Método: PUT /posts/:id
   O que faz: substitui/atualiza totalmente os campos do post indicado por id.
             PUT costuma representar uma substituição completa (enviar todos os campos).
   ========================= */
export const controllerUpdatePost = async (req, res) => {
  const { id } = req.params;
  const payload = req.body; // dados enviados para atualizar o post

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ erro: "ID inválido." });
  }

  // validação mínima: garantir que payload não esteja vazio
  if (!payload || Object.keys(payload).length === 0) {
    return res.status(400).json({ erro: "Nenhum dado fornecido para atualização." });
  }

  try {
    // cria um objeto que será enviado ao model — aqui assumimos que updatePost 
    // recebe (id, dados) e faz a substituição/atualização no banco.
    const atualizado = await updatePost(id, payload);

    // se updatePost retornar null/undefined -> não encontrado
    if (!atualizado) {
      return res.status(404).json({ erro: "Post não encontrado para atualizar." });
    }

    return res.status(200).json(atualizado);
  } catch (erro) {
    console.error("Erro em controllerUpdatePost:", erro.message);
    return res.status(500).json({ erro: "Falha ao atualizar o post." });
  }
};

/* =========================
   Função: controllerPatchPost
   Método: PATCH /posts/:id
   O que faz: atualiza parcialmente o post (apenas os campos enviados).
   ========================= */
export const controllerPatchPost = async (req, res) => {
  const { id } = req.params;
  const campos = req.body; // só os campos que o cliente quer alterar

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ erro: "ID inválido." });
  }

  if (!campos || Object.keys(campos).length === 0) {
    return res.status(400).json({ erro: "Nenhum campo para atualizar." });
  }

  try {
    // reutilizamos updatePost do model — depende de como ele foi implementado.
    // Aqui supomos que updatePost faz atualização parcial quando recebe um objeto com campos.
    const atualizado = await updatePost(id, campos);

    if (!atualizado) {
      return res.status(404).json({ erro: "Post não encontrado para atualizar." });
    }

    return res.status(200).json(atualizado);
  } catch (erro) {
    console.error("Erro em controllerPatchPost:", erro.message);
    return res.status(500).json({ erro: "Falha ao atualizar parcialmente o post." });
  }
};

/* =========================
   Função: controllerUpdatePostImage
   Método: POST /posts/:id/image  (ou PUT, conforme sua API)
   O que faz: atualiza somente a imagem de um post já existente.
             Recebe req.file com o novo arquivo e substitui o arquivo antigo.
   ========================= */
export const controllerUpdatePostImage = async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ erro: "ID inválido." });
  }

  // checa se enviaram arquivo
  if (!req.file) {
    return res.status(400).json({ erro: "Arquivo de imagem não enviado." });
  }

  try {
    // busca o post atual para saber se existe
    const postExistente = await getPostById(id);
    if (!postExistente) {
      // se não existe, remove o arquivo temporário e retorna 404
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ erro: "Post não encontrado." });
    }

    // define novo caminho da imagem (mesmo padrão usado para uploads)
    const destino = `uploads/${id}.png`;
    const novoImgUrl = `http://localhost:3000/uploads/${id}.png`;

    // move o novo arquivo para a pasta uploads e substitui o anterior
    await fs.rename(req.file.path, destino);

    // atualiza o campo imgUrl no banco (assumimos que updatePost faz isso)
    const atualizado = await updatePost(id, { imgUrl: novoImgUrl });

    return res.status(200).json(atualizado);
  } catch (erro) {
    console.error("Erro em controllerUpdatePostImage:", erro.message);
    return res.status(500).json({ erro: "Falha ao atualizar imagem do post." });
  }
};

/* =========================
   Função: controllerDeletePost
   Método: DELETE /posts/:id
   O que faz: remove o post do banco e também tenta remover a imagem relacionada.
   ========================= */
export const controllerDeletePost = async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ erro: "ID inválido." });
  }

  try {
    // tenta deletar no banco
    const removido = await deletePost(id);

    // se nada foi removido (post não existe)
    if (!removido) {
      return res.status(404).json({ erro: "Post não encontrado para remoção." });
    }

    // tenta deletar a imagem associada (se existir)
    const caminhoImg = `uploads/${id}.png`;
    await fs.unlink(caminhoImg).catch((err) => {
      // se erro, logamos mas não falhamos a requisição — talvez o post não tinha imagem
      if (err.code !== "ENOENT") {
        console.warn("Falha ao remover imagem do post:", err.message);
      }
    });

    // 204 No Content é apropriado para DELETE bem-sucedido sem corpo
    return res.status(204).end();
  } catch (erro) {
    console.error("Erro em controllerDeletePost:", erro.message);
    return res.status(500).json({ erro: "Falha ao deletar o post." });
  }
};

/* =========================
   Export padrão (opcional)
   - Você pode exportar cada função separadamente como já feito.
   - Se preferir, pode exportar um objeto default com todas as funções.
   ========================= */

//Exemplo opcional:
//export default {
//   controllerGetPosts,
//   controllerGetPostById,
//   controllerPostPost,
//   controllerUploadImage,
//   controllerUpdatePost,
//   controllerPatchPost,
//   controllerUpdatePostImage,
//   controllerDeletePost
// };
//Observações finais e dicas rápidas
//Garanta que ../models/postModel.js exponha as funções: getPosts, getPostById, createPost, updatePost, deletePost. Se seus nomes forem diferentes, ajuste as importações.
//
//Para upload de arquivo recomendo usar multer (middleware) configurado para salvar arquivos temporários (ex: dest: "temp/") e então mover com fs.rename para uploads/.
//
//Certifique-se de que a pasta uploads/ exista e esteja servida estaticamente pelo Express (por exemplo app.use('/uploads', express.static('uploads'))) para que http://localhost:3000/uploads/ID.png funcione.
//
//Em produção, ajuste os links http://localhost:3000 para o domínio real e cuide de segurança (validação de tipos de arquivo, tamanho máximo, autenticação/autorização para criar/deletar posts, etc.).