# Sistema de RH Reciclar — React + Vite + Firebase

O projeto usa Firebase Authentication para o login e Firebase Realtime Database para os registros em `/colaboradores`.

## 1. Preparar no computador
1. Instale Node.js LTS: https://nodejs.org/
2. Extraia a pasta do projeto e abra-a no VS Code (`Arquivo > Abrir Pasta`).
3. No terminal do VS Code, execute:

   ```bash
   npm install
   ```

4. Copie `.env.example` para `.env` na raiz do projeto. No Windows/PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

5. Confira se os valores `VITE_FIREBASE_*` correspondem ao app Web do projeto Firebase `rh-reciclar`.
6. Coloque a imagem da marca em `public/imagem_2026-10-27_083221970.png` (o nome precisa ser exatamente esse).
7. Execute:

   ```bash
   npm run dev
   ```

8. Para validar a compilação antes de publicar:

   ```bash
   npm run build
   ```

## 2. Configurar autenticação no Firebase — obrigatório
1. Abra https://console.firebase.google.com/ e selecione o projeto `rh-reciclar`.
2. Vá a **Authentication > Sign-in method** e habilite **Email/Password**.
3. Em **Authentication > Users**, crie manualmente cada usuário autorizado. Não há cadastro público de usuários no sistema.
4. Use o e-mail e a senha do usuário criado para entrar no sistema. Não existe mais senha padrão no formulário.
5. Em **Realtime Database > Rules**, publique as regras abaixo (também disponíveis em `database.rules.json`):

   ```json
   {
     "rules": {
       ".read": false,
       ".write": false,
       "colaboradores": {
         ".read": "auth != null",
         ".write": "auth != null"
       }
     }
   }
   ```

**Atenção:** essas regras permitem que qualquer usuário autenticado nesse projeto leia e altere os registros de colaboradores. Crie somente contas autorizadas e não habilite cadastro público. Se houver necessidade de separar permissões (ex.: leitura versus edição), implemente autorização por função antes de liberar o sistema.

## 3. Enviar para o GitHub
Crie um repositório vazio no GitHub e, no terminal do VS Code, execute os comandos abaixo substituindo a URL pelo endereço do seu repositório:

```bash
git init
git add .
git commit -m "Preparar Sistema RH Reciclar"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

O arquivo `.env` está no `.gitignore`; **não o remova nem envie senhas/chaves privadas ao Git**. Se o Git avisar que o repositório já existe, não repita `git init` nem `git remote add`; confira `git remote -v`.

## 4. Publicar na Vercel
1. Entre em https://vercel.com/ e importe o repositório do GitHub.
2. Framework Preset: **Vite**; Build Command: `npm run build`; Output Directory: `dist`.
3. Em **Project Settings > Environment Variables**, cadastre as sete variáveis `VITE_FIREBASE_*` que estão no `.env.example`, com os mesmos valores do `.env` local.
4. Selecione os ambientes necessários (Production, Preview e Development, conforme seu fluxo) e faça o Deploy.
5. No Firebase Authentication, em **Settings / Authorized domains**, adicione o domínio de produção da Vercel (e o domínio próprio, se houver).
6. Depois de cada `git push`, a Vercel fará novo deploy automaticamente se a integração estiver ativa.

## 5. Antes de usar com dados reais
- A configuração do projeto e o deploy precisam ser executados nas suas próprias contas GitHub, Firebase e Vercel; este pacote não consegue publicar por você.
- As variáveis `VITE_*` ficam visíveis no navegador e não são segredos. A proteção real dos dados depende das regras do Realtime Database e da autenticação.
- Como este sistema guarda dados pessoais, bancários e médicos, valide acesso, regras, política interna e requisitos da LGPD com a pessoa responsável antes de cadastrar dados reais.
- A logo não está incluída no pacote; adicione o arquivo indicado à pasta `public/`.
