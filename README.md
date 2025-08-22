# Mini Osu Pro Responsivo 🎵

Um protótipo de jogo de ritmo inspirado em **Osu!**, totalmente em HTML, CSS e JavaScript.  
Suporta **beat detection em tempo real**, múltiplos tipos de notas, pontuação precisa e responsividade para desktop e mobile.

---

## 🕹 Funcionalidades

- Beat detection real usando **Web Audio API** (analisando graves/kick drum).  
- Três tipos de notas:
  - **Círculos simples** → clique normal.  
  - **Sliders** → arraste o mouse de um ponto a outro.  
  - **Notas longas** → segure até terminar.  
- Feedback visual:
  - Animações de fade-in/fade-out das notas.  
  - Explosão colorida ao acertar.  
  - Sliders visíveis e dinâmicos.  
- Timing preciso:
  - `Perfect`, `Great`, `Good`, `Miss`.  
  - Pontuação acumulativa.  
- HUD com **pontuação e timing**.  
- Responsivo para **desktop, tablet e mobile**.  
- Suporte a **clique e toque (touch)**.

---

## 🛠 Tecnologias

- **HTML5** → Estrutura da página.  
- **CSS3** → Estilo e responsividade.  
- **JavaScript** → Lógica do jogo e beat detection.  
- **Web Audio API** → Análise de áudio em tempo real.  
- **Canvas API** → Renderização das notas e efeitos visuais.

---

## 📁 Estrutura do Projeto

├─ index.html # Página principal
├─ style.css # Estilos do jogo
├─ script.js # Lógica do jogo e beat detection
└─ README.md # Este arquivo 


---

## 🚀 Como Jogar

1. Abra `index.html` em qualquer navegador moderno.  
2. Clique em **“Escolher arquivo”** e selecione uma música local (mp3, wav, etc.).  
3. Aperte **play** no player de áudio.  
4. Clique/touch nas notas conforme aparecem na tela, seguindo o ritmo da música.  
5. A pontuação e o timing serão exibidos no HUD.

---

## 📱 Responsividade

- O canvas ajusta automaticamente seu tamanho conforme a tela.  
- Suporte completo a **mouse** e **toque em dispositivos móveis**.  
- Notas sempre aparecem proporcionalmente ao canvas.

---

## 🔗 Referências

- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)  
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)  
- Inspirado em: [Osu!](https://osu.ppy.sh/)
