# Placeholders de audio para EMJI

Todavía no hay archivos de sonido. Cuando agregues los assets, registralos al iniciar el juego:

```js
AudioPlayer.register("uiClick", "./Assets/Audio/ui_click.wav");
AudioPlayer.register("blockPick", "./Assets/Audio/block_pick.wav");
AudioPlayer.register("blockDrop", "./Assets/Audio/block_drop.wav");
AudioPlayer.register("blockInvalid", "./Assets/Audio/block_invalid.wav");
AudioPlayer.register("battleStart", "./Assets/Audio/battle_start.wav");
AudioPlayer.register("laser", "./Assets/Audio/laser.wav");
AudioPlayer.register("shield", "./Assets/Audio/shield.wav");
AudioPlayer.register("victory", "./Assets/Audio/victory.wav");
AudioPlayer.register("defeat", "./Assets/Audio/defeat.wav");
```

`AudioPlayer` no intenta reproducir archivos que todavía no fueron registrados.
