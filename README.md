# Melody It

**Melody It** é um jogo de ritmo dinâmico para navegador, inspirado em clássicos como Guitar Hero. A principal característica do jogo é sua capacidade de analisar qualquer arquivo de áudio em tempo real usando a Web Audio API e gerar notas musicais que caem pela tela, sincronizadas com a música.

## ✨ Funcionalidades

- **Geração de Notas em Tempo Real**: Carregue qualquer música do seu computador (MP3, WAV, etc.) e o jogo criará um nível jogável na hora.
- **Jogabilidade Estilo Guitar Hero**: As notas caem em quatro trilhas, e o jogador deve pressionar as teclas correspondentes ('1', '2', '3', '4') no momento certo.
- **Níveis de Dificuldade**: Escolha entre os modos Fácil, Normal e Difícil para ajustar a densidade das notas e a sensibilidade da detecção musical.
- **Notas Sustentadas (Hold Notes)**: Além das notas normais, algumas notas exigem que você pressione, segure e solte a tecla no tempo certo para ganhar pontos extras.
- **Sistema de Pontuação e Combo**: Acerte notas consecutivas para aumentar seu combo e ganhar mais pontos. Erre uma nota e seu combo é zerado!
- **Controles de Jogo**: Pause, retome ou reinicie a música a qualquer momento.
- **Feedback Visual**: Efeitos de partículas e animações vibrantes para acertos de notas, criando uma experiência visualmente gratificante.

## 🚀 Como Jogar

1.  Abra o arquivo `index.html` no seu navegador de preferência (Chrome, Firefox, etc.).
2.  Use o menu para selecionar um nível de dificuldade.
3.  Clique em **"Escolher arquivo"** e selecione uma música do seu computador.
4.  Clique no botão **"Play"** para iniciar a música e o jogo.
5.  À medida que as notas descem pelas trilhas, pressione a tecla correspondente (`1`, `2`, `3` ou `4`) quando a nota estiver sobre a linha de alvo na parte inferior da tela.
6.  Para **notas sustentadas** (com um corpo longo), pressione e segure a tecla na cabeça da nota e solte-a no final do corpo para maximizar sua pontuação.
6.  Divirta-se e tente alcançar a maior pontuação!

## 🛠️ Tecnologias Utilizadas

- **HTML5**: Estrutura da página.
- **CSS3**: Estilização, layout e animações.
  - Uso de Variáveis CSS para fácil customização do tema.
  - Keyframes para animações de acerto e combo.
- **JavaScript (ES6+)**: Toda a lógica do jogo.
- **Web Audio API**: O coração do projeto, usada para:
  - Analisar o espectro de frequência da música em tempo real (`AnalyserNode`).
  - Detectar picos em frequências graves, médias e agudas para gerar os três tipos de notas.

## 📂 Estrutura dos Arquivos

```
Melody It .js/
├── index.html       # A página principal do jogo
├── style.css        # Todos os estilos visuais
├── script.js        # Lógica do jogo, análise de áudio e interações
└── README.md        # Este arquivo
```

## 🔮 Possíveis Melhorias Futuras

- Adicionar um ranking de pontuações (usando `localStorage`).
- Implementar feedback visual para notas perdidas.
- Criar diferentes "skins" para as notas e a interface.
- Adicionar suporte para notas longas (sustenidas).