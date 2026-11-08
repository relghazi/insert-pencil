# Spanish (es) translation notes

Spain Spanish, kept readable for Latin America; "tú" throughout; her lowercase voice and full stops kept.

## Terms
- notebook = cuaderno, locker = taquilla, backpack/bag = mochila, desk = pupitre.
- tiny victories = minivictorias (shorter than "pequeñas victorias"); tiers bronce, plata, oro, platino.
- cheat sheet = chuleta (the Spanish school word for a crib sheet; in Latin America "acordeón" or "torpedo", but chuleta is widely understood).
- high scores = récords; score/points = puntos; score notes = hoja de puntos; my scores / online scores = mis puntos / puntos en línea; mine = míos.
- wave = oleada, level = nivel, round = ronda, stage = fase, lives = vidas, extra life = vida extra, bonus = bonus (the usual arcade word).
- controller = mando (Spain; "control" in Latin America). D-pad = cruceta. Keys: Intro, Espacio, Mayús, Esc, Arriba/Abajo/Izquierda/Derecha.
- On/Off in settings = Sí/No.
- Term Paperboy "papers" = trabajos (term papers), so "lanzar un trabajo".
- Snack-Man "staff" (principal and administrators) = "los de dirección"; "sent to the office" = "a dirección".
- Quiz "claim" = conquistar.
- Hall Patrol / Term Paperboy "course" = recorrido. "buggies" kept (Spanish uses buggy).
- Joust enemy names (Bounder, hunter, shadow lord) kept in English.
- lunchbox = fiambrera (Spain; "lonchera" in Latin America), tacks/pushpin = chinchetas/chincheta, red pen = boli rojo, jump rope = cuerda de saltar (neutral rather than Spain's "comba").
- "coger" avoided everywhere (offensive in parts of Latin America); "recoger", "atrapar" used instead.

## Puns and adaptations
- final grade. = nota final. / class dismissed. = se acabó la clase. / pencils down. = lápices abajo. / detention. = castigo.
- tardy slip. = llegas tarde. ; photo retake. = repetimos la foto. ; say cheese. = di patata. (the Spanish photo word; Latin America says "whisky").
- slow and steady = despacito y buena letra (Spanish school idiom). perfect score = un diez. straight A's = todo sobresalientes. biology honors = matrícula en biología. top marks = nota máxima.
- just another brick. = otro ladrillo en el muro. (the Pink Floyd title as Spanish speakers know it).
- order up = marchando (the kitchen call). touchdown (Lunch Lander) = toma de contacto (landing pun). proof complete = demostrado.
- settings (sharp end) = ajustes (la punta). page jam = atasco de página (paper jam pun). ink thousand = mil de tinta.
- the lockers go deeper = más y más taquillas. varsity letter = insignia del equipo (no Spanish equivalent). brain freeze = cerebro congelado (no common idiom).
- Trophy titles follow the game's hero: "defensora de los márgenes" is hers; the boy heroes' titles are masculine (empollón del año, encantador de serpientes, el último en salir, pillado borrando).

## For the reviewer
- Lettered sheet titles (final grade., the end., pencils down. ...) are Nano Banana art keyed by the English text in src/ui/ink-ui.js; the table translates the text only, so the lettered images will still read in English until Spanish lettering exists.
- Lines kept unchanged on purpose: character names, REZ, CSS/font strings, class names, "use strict", and the "s ..." code-comment fragments (the collector split them at apostrophes). "s GitHub page within the hour." is a fragment of "written up. thanks! it goes on the game's GitHub page within the hour.", which is not in the source table, so it stays untranslated in the game.
- Added beyond the source (shown by the shell but missing from it): the Off/On partners of each settings toggle, "Intro: every launch", and one extra pattern for "<game> scores will go back to zero." (Spanish needs the game name inside the sentence).
- Still missing from the source and so untranslated: "really erase these scores?", "swap a notebook", "sending...", the "written up..." confirmation, weekday sheet titles other than monday, "champion course" HUD, the Paperboy course HUD ("papers plenty   time N"), "enemy to left/rear", Qix "graded: N%", Robotron "saved N classmates".
- Fragments that join with a keycap ("(type, then" + Intro, "press" + key + "to play again") are translated to read in Spanish order: "(escribe y pulsa [Intro])", "pulsa [Espacio] para volver a jugar".
- Uncertain: "Intro: after updates" became "Cómic: tras actualizar" (avoids clashing with the Intro key); the tape titles (After Hours, LOUD, NEW WAVE, BUS BEATS, Extra Life) stay English; "a gym. allegedly." and "this guy again." kept literal.
- Many control lines run past 125% of the English (Spanish verbs and "a la izquierda" are longer); they were kept as short as clear Spanish allows.
