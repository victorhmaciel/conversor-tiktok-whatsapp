# conversor-tiktok-whatsapp
# Conversor de Figurinhas · TikTok para WhatsApp

Site independente para converter figurinhas do TikTok em WebP ou GIF. Aceita endereços diretos de imagens dos CDNs do TikTok e arquivos WebP, AWEBP, GIF, PNG ou JPG. As versões animadas mantêm o movimento, com arredondamento de tempo e redução de cores quando o formato de saída exige.

## Site publicado

[Abra o conversor no Netlify](https://conversor-figurinhas-victor.netlify.app/).

## GitHub e Netlify

O Netlify acompanha a branch `main` deste repositório. Commits na `main` iniciam um novo deploy.

Para importar o projeto em outro site no Netlify, selecione **Import an existing project → GitHub**, escolha o repositório e configure:

- **Branch** `main`
- **Base directory** `conversor-tiktok-whatsapp`
- **Build command** vazio
- **Publish directory** `public`
- **Functions directory** `netlify/functions`

O `netlify.toml` já define a pasta pública, a função e a rota de conversão. Nenhuma chave é necessária. Depois de publicar, teste **Enviar arquivo → Converter para WebP**.

## Rodar no computador

Com Node.js 24 e npm instalados, execute dentro da pasta `conversor-tiktok-whatsapp`:

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
