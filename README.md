# conversor-tiktok-whatsapp
# Conversor de Figurinhas · TikTok para WhatsApp

Site independente para converter figurinhas do TikTok em WebP ou GIF. Aceita endereços diretos de imagens dos CDNs do TikTok e arquivos WebP, AWEBP, GIF, PNG ou JPG. As versões animadas mantêm o movimento, com arredondamento de tempo e redução de cores quando o formato de saída exige.

## GitHub e Netlify

1. Extraia o ZIP e crie um repositório no GitHub.
2. Envie o **conteúdo** da pasta extraída para a raiz do repositório. O arquivo `netlify.toml` deve ficar no mesmo nível de `package.json` e das pastas `public` e `netlify`. Se usar o Explorador de Arquivos, inclua também `.nvmrc` e `.gitignore`.
3. No Netlify, selecione **Add new project → Import an existing project → GitHub** e escolha o repositório.
4. Deixe **Base directory** e **Build command** vazios. O arquivo `netlify.toml` já define `public` como **Publish directory** e `netlify/functions` como pasta de funções. Use as configurações do arquivo e publique. O deploy instala a dependência Sharp automaticamente. Nenhuma variável de ambiente ou chave é necessária.
5. Abra a URL do Netlify e teste **Enviar arquivo → Converter para WebP**. O fluxo de link usa a mesma função do site.

Se quiser disponibilizar o site sem login, verifique se o projeto está público nas configurações de acesso do Netlify.

## Rodar no computador

Com Node.js 24 e npm instalados, execute na raiz do projeto:

```sh
npm install
npm start
```

Abra <http://127.0.0.1:8888>. O servidor local usa a mesma função de conversão e a mesma rota do Netlify.

## Formatos e limites

- **Entrada** de até 4 MB e 120 quadros. Links curtos, links de comentários e links para páginas do TikTok exigem o endereço direto da mídia ou o envio do arquivo. Links assinados podem expirar.
- **WebP** de 512 × 512, com até 100 KB para imagens estáticas e 500 KB para animadas. A imagem é encaixada no quadrado com preenchimento transparente quando necessário. Se a compressão não couber no limite, o site oferece a opção GIF.
- **GIF** de 512 × 512 e até 4 MB. A paleta e a transparência do GIF podem alterar cores e bordas.
- **No iPhone**, o botão **Compartilhar** aparece quando o navegador aceita compartilhar o arquivo. Use **Salvar em Arquivos** no menu do sistema. A importação como figurinha depende do recurso disponível no WhatsApp ou no importador escolhido.
- O arquivo ou link é enviado à função do site durante a conversão. A função retorna a imagem e não usa armazenamento permanente.
