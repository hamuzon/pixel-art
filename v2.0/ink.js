body {
  background: #008080;
  margin: 0;
  padding: 10px;
  display: flex;
  justify-content: center;
  touch-action: pan-x pan-y;
}

.window { width: 100%; max-width: 500px; }

#app-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

/* キャンバスのレスポンス向上 */
#canvas {
  display: grid;
  grid-template-columns: repeat(16, 1fr);
  width: 100%;
  max-width: 400px;
  aspect-ratio: 1 / 1;
  border: 2px inset;
  background: #fff;
  touch-action: none; /* スマホのスクロールを無効化して描画に専念 */
  user-select: none;
}

.pixel {
  width: 100%;
  height: 100%;
  border: 0.1px solid #ddd;
  box-sizing: border-box;
}

/* パレット */
#palette {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 5px;
  background: #eee;
  border: 2px inset;
  min-height: 40px;
}

.color-btn {
  width: 30px;
  height: 30px;
  border: 2px outset;
  cursor: pointer;
  position: relative;
}

.color-btn.selected { border: 2px inset; outline: 2px solid #000; }

.color-btn.transparent {
  background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), 
                    linear-gradient(-45deg, #ccc 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #ccc 75%),
                    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 10px 10px;
  background-position: 0 0, 0 5px, 5px 5px, 5px 0;
}

/* 操作系 */
.palette-controls, #controls {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 5px;
  width: 100%;
}

button { flex: 1; min-width: 80px; padding: 5px; }