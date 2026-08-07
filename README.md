# A GitHub Odyssey 🗡️☁️

> Um experimento para estudar os limites do **Vibe Code**, entregando um projeto de jogo web robusto e totalmente *serverless* hospedado diretamente no GitHub.

---

## 🌐 Visão Geral e Identidade do Projeto

* **Nome do Projeto:** A GitHub Odyssey.
* **Gênero:** Roguelike 3D com elementos de sobrevivência, gestão de base (*base-building*) e progressão por maestria.
* **Filosofia de Desenvolvimento:** Concebido como um experimento de "Vibe code" focado em explorar os limites do desenvolvimento ágil, limpo e intuitivo, integrado com assistentes de IA (**Jules**) e documentado de forma centralizada.

---

## ⚙️ Stack Tecnológica e Infraestrutura

* **Tecnologias Core:** Vanilla JavaScript e Three.js (carregado via CDN / import maps).
* **Execução Client-Side Pura (Zero-Server):** O projeto foi desenhado para rodar de forma totalmente independente no navegador, sem exigir servidores locais ou ferramentas complexas de build. Basta abrir o arquivo `index.html` para que o jogo seja iniciado instantaneamente.
* **Hospedagem e Acessibilidade:** Utiliza o GitHub Pages como infraestrutura principal de hospedagem e execução. Isso dispensa backends complexos e permite que a experiência seja compartilhada de forma imediata e responsiva em computadores, tablets ou smartphones.

---

## 📂 Arquitetura e Organização de Diretórios

A estrutura de pastas do projeto é modular e organizada da seguinte forma:

* `index.html` -> Arquivo raiz, ponto de entrada principal, loop do jogo e hub visual/portfólio.
* `/assets` (ou `/Assets`) -> Repositório de mídias, vídeos, imagens estáticas, sprites, texturas e arquivos de áudio.
* `/config` -> Centraliza os parâmetros de equilíbrio (balanceamento), constantes do sistema, níveis de dificuldade e o gerenciamento de persistência local (*Save/Load*).
* `/world_builder` (ou `/WorldGenerator`) -> Configurações de renderização, biomas e lógica de geração procedural dos mapas e cenários.
* `/characters` -> Gestão do avatar, rigging, movimentação e lógica de inteligência artificial de inimigos e NPCs.
* `/items` -> Banco de dados de inventário, gerenciando itens consumíveis, espólio e receitas de crafting.
* `/constructions` -> Arquivos de layout e especificações técnicas de edifícios e estruturas do mundo.
* `conceito_inicial/` -> Serve como um dicionário prático com as ideias originais do projeto e deve ser preservado.

---

## 🧹 Boas Práticas e Regras do Repositório

Para manter a organização e a limpeza do projeto:
* **Arquivos Temporários e Testes:** Arquivos de scripts utilitários avulsos (como scripts em Python, Node.js soltos, ou atualizadores de código), arquivos de testes temporários e artefatos não essenciais ao funcionamento pleno do jogo **NÃO** devem ser adicionados ou mantidos no repositório.

---

## 🛠️ Metodologia de Operação

O fluxo de trabalho e operação do projeto baseia-se em uma integração direta com o ambiente do GitHub:

1. **Esboços Iniciais:** Criação prévia de esboços em HTML do formato desejado para implementação no jogo.
2. **Desenvolvimento Guiado por IA:** Utilização do assistente **Jules** para trabalhar diretamente no diretório do GitHub, implementando corretamente os códigos a partir dos esboços fornecidos.
