# wave-leandrex

Gerador de imagens com **Wave Function Collapse (WFC)** feito em Vue 3. Você desenha um pequeno padrão de entrada, e o algoritmo gera uma imagem maior que segue as mesmas regras de vizinhança, mostrando o colapso passo a passo.

## Como funciona

1. **Desenhe a entrada.** Pinte uma grade pequena (de 5×5 a 24×24) com o lápis, escolhendo as cores no seletor.
2. **O algoritmo aprende as regras.** Ele registra quais cores aparecem ao lado de quais, em cada direção, e com que frequência.
3. **Cada célula da saída começa podendo ser qualquer cor.** A cada passo o WFC escolhe a célula mais decidida (menor entropia), fixa uma cor para ela e propaga a consequência: os vizinhos perdem as cores que nunca apareceram ao lado dela na entrada.
4. **Contradições reiniciam a geração.** Se alguma célula ficar sem opções, o algoritmo recomeça. O número de tentativas aparece na interface.

Na animação, as células indecisas ficam transparentes (quanto menos opções, mais opacas) e a última célula decidida ganha um contorno vermelho. A geração usa uma semente, então a animação repete exatamente a execução que foi calculada.

## Recursos

- Lápis e borracha, com seletor de cor próprio e atalho para as cores já usadas no desenho
- Tamanho do desenho ajustável (5×5 a 24×24), mantendo o que já foi pintado
- Tamanho do resultado ajustável (10×10 a 40×40), regenerando o resultado ao mudar
- Animação do colapso com velocidade ajustável e botão para pular
- Contador de células indecisas e de reinícios durante a geração

## Como usar

1. Desenhe um padrão na grade.
2. Clique em **Finish** para gerar o resultado.
3. Ajuste a velocidade da animação, ou clique em **Skip animation** para ver o resultado direto.
4. Use **Clear** para recomeçar.

Dica: padrões com formas repetidas (linhas, cantos, blocos) funcionam melhor do que desenhos aleatórios, porque dão regras de vizinhança mais claras.

## Rodando localmente

Requer [Node.js](https://nodejs.org/) e [Yarn](https://yarnpkg.com/).

```bash
yarn install   # instala as dependências
yarn serve     # servidor de desenvolvimento com hot-reload
yarn build     # build de produção
yarn lint      # lint e correção automática
```

## Estrutura

```
src/
├── App.vue                    # interface e controle da animação
├── components/
│   ├── ColorPicker.vue        # seletor de cor
│   └── RangeSlider.vue        # slider de tamanho e velocidade
└── utils/
    ├── wfc.js                 # algoritmo Wave Function Collapse
    └── color.js               # conversões de cor
```

## Tecnologias

- [Vue 3](https://vuejs.org/)
- [Vuetify 3](https://vuetifyjs.com/)
- [Vue CLI](https://cli.vuejs.org/)

## Referências

- [Wave Function Collapse, de Maxim Gumin](https://github.com/mxgmn/WaveFunctionCollapse)
