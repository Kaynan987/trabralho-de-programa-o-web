// Importa as funções do controller que tratam as requisições HTTP.
// Essas funções contêm a lógica de comunicação com o banco e manipulação de dados.
import {
  controllerGetPosts,
  controllerPostPost,
  controllerUploadImage,
  controllerUpdatePost
} from "../controllers/postController.js";

// Importa o 'multer', biblioteca usada para lidar com uploads de arquivos (como imagens).
import multer from "multer";

// -----------------------------------------------------------------------------
// Configuração do armazenamento de arquivos (usando multer)
// -----------------------------------------------------------------------------

// 'diskStorage' permite personalizar o local e o nome do arquivo que será salvo.
const storage = multer.diskStorage({
  // 'destination': define onde os arquivos enviados serão salvos.
  destination: function (req, file, cb) {
    // Aqui estamos salvando na pasta 'uploads'.
    // Você pode trocar por outro diretório se quiser.
    cb(null, 'uploads/');
  },

  // 'filename': define o nome que o arquivo terá ao ser salvo.
  filename: function (req, file, cb) {
    // Por simplicidade, mantém o nome original do arquivo.
    // Em um projeto real, é melhor gerar nomes únicos (ex: com ID ou timestamp).
    cb(null, file.originalname);
  }
});

// Cria o middleware do multer com as configurações acima.
// O 'dest' define o caminho base padrão.
const upload = multer({ dest: './uploads', storage });

// -----------------------------------------------------------------------------
// 🚏 Função que define as rotas da aplicação
// -----------------------------------------------------------------------------
const getPostRoutes = (app) => {

  // 🔹 [GET] /posts
  // Retorna todos os posts armazenados no banco.
  app.get("/posts", controllerGetPosts);

  // 🔹 [POST] /post
  // Cria um novo post a partir dos dados enviados no corpo da requisição (req.body).
  app.post("/post", controllerPostPost);

  // 🔹 [POST] /upload
  // Faz o upload de uma imagem e cria automaticamente um post com ela.
  // 'upload.single("image")' indica que só será enviado um arquivo por vez.
  app.post("/upload", upload.single('image'), controllerUploadImage);

  // 🔹 [PUT] /post/:id
  // Atualiza um post existente (por exemplo, descrição ou imagem).
  // O ':id' é um parâmetro de rota que representa o ID do post no banco.
  app.put("/post/:id", controllerUpdatePost);

  // 🔹 [DELETE] /post/:id
  // Remove permanentemente um post do banco de dados.
  app.delete("/post/:id", async (req, res) => {
    try {
      // Importa dinamicamente a função de deletar (para não quebrar o padrão modular)
      const { deletePost } = await import("../models/postModel.js");

      const id = req.params.id;
      const resultado = await deletePost(id);

      // Se o post foi deletado com sucesso
      if (resultado.deletedCount === 1) {
        res.status(200).json({ mensagem: "Post deletado com sucesso!" });
      } else {
        res.status(404).json({ erro: "Post não encontrado!" });
      }
    } catch (erro) {
      console.error(erro.message);
      res.status(500).json({ erro: "Erro ao tentar deletar o post." });
    }
  });
};

// Exporta a função para ser usada no `server.js` ou `app.js` principal.
export default getPostRoutes;

// Explicando em linguagem simples
// 
// Multer:
// É quem lida com o upload de arquivos.
// Ele salva a imagem na pasta uploads/ e permite que você acesse o arquivo com req.file.
// 
// Rotas HTTP:
// 
// GET /posts → pega todos os posts.
// 
// POST /post → cria um novo post (sem imagem).
// 
// POST /upload → faz upload e cria o post com imagem.
// 
// PUT /post/:id → edita um post já existente.
// 
// DELETE /post/:id → apaga o post do banco.
// 
// 📦 Exemplo prático
// Método	Caminho	O que faz	Exemplo
// GET	/posts	Lista todos os posts	Navegador / Postman
// POST	/post	Cria um post novo	Corpo JSON: { "descricao": "Nova foto" }
// POST	/upload	Faz upload de uma imagem e cria o post	FormData com campo image
// PUT	/post/6543...	Atualiza descrição ou imagem	JSON { "descricao": "Atualizado" }
// DELETE	/post/6543...	Apaga o post	—