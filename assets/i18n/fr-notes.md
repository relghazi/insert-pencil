# French (fr) translation notes for the reviewer

## Conventions
- French typography: a no-break space (U+00A0) before `:` `;` `!` `?` and `%`. Fragments that start with a colon (": back", ": open /") start with that space, so they read "Entrée : retour".
- Player addressed with "tu". Buttons and cheat-sheet actions use the infinitive (continuer, recommencer, tirer, sauter). Touch hints use the imperative (touche, glisse, balaie, pose deux doigts). "hold to X" next to a key is "maintenir pour X"; "hold A / Space to draw" is "maintiens".
- Keys: Échap, Entrée, Espace, Maj, Haut/Bas/Gauche/Droite; D-pad = "croix directionnelle"; stick, LB, RB, Menu, A/B/X/Y unchanged. Settings On/Off = Oui/Non.
- Letter keys stay as printed (W A S D, Z X C, R, H, O, P). The games read the typed character (e.key), so on AZERTY the player presses the key marked W, which sits where QWERTY Z is. WASD is awkward on AZERTY, but saying ZQSD would be wrong because those keys do nothing.
- Code fragments the collector picked up (CSS classes, font strings, "use strict", the "s ..." comment fragments split at apostrophes, "Notebook close:" console text) are left unchanged, and so are character names and REZ.

## School puns adapted
- final grade. = "note finale." / class dismissed = "fin du cours" / pencils down. = "posez les crayons." / detention. = "retenue." / tardy slip. = "billet de retard."
- next semester. = "trimestre suivant." (French lycées use trimesters) / next period. = "cours suivant." / fifth period = "cinquième heure"
- honor roll = "tableau d'honneur" / extra credit = "hors barème" / top marks = "vingt sur vingt" / straight A's = "que des A" (kept as letters because Centigrade's centipede is made of grade letters)
- lab partner = "binôme de TP" / biology honors = "major en SVT" / shop class = "cours de techno" / proof complete = "CQFD" / divide and conquer = "diviser pour régner"
- shutout (win 11 to 0) = "zéro pointé" / caught erasing = "pris la main dans la brosse" (chalkboard eraser = brosse à tableau) / hot air = "du vent" / page jam = "bourrage papier"
- settings (sharp end) = "réglages (côté mine)" (pencil lead) / back of an index card = "dos d'une fiche bristol" / ink thousand = "mille-feuille" (1,000 points; feuille = sheet)
- score notes = "relevé de notes" (school report) / high scores = "records" / new high score! = "nouveau record !"
- space, but on squared paper. = "l'espace, version petits carreaux." / please stay inside the lines. = "merci de ne pas dépasser."
- say cheese. = "dis ouistiti." / just another brick. = "juste une brique de plus." (The Wall, the song is known in English in France)
- insert pencil = "insère un crayon" (with tu, not the arcade's "insérez")
- Term Paperboy's papers = "copies" (also student essays); the HUD reads "vies 0   copies 10   lundi".

## Terms
- Principal = "proviseur" (lycée), used the same way in Snack-Man, Robotron and Locker Gauntlet. Staff = "personnel". Substitutes = "remplaçants". Cafeteria chefs (Mystery Meat Time) = "cuistots"; the BurgerTime chef stays "chef".
- Spitball Command desks = "pupitres"; her own desk (locker, backpack) = "bureau". Spitballs = "boulettes".
- Thumbtacks (Dunce Kong) and pushpin (Centigrade) are both "punaise(s)"; pattern 15's "shield bug" is "punaise bouclier" (a real insect).
- tank/supertank, superzapper, buggies, lunchbox and the Joust names (Bounder, hunter, shadow lord) are kept. smart bomb = "bombe intelligente", hyperspace = "hyperespace", flagship = "vaisseau amiral".
- mixtapes = "compiles", song = "morceau", now playing = "en écoute". Tape titles (LOUD, NEW WAVE, BUS BEATS, After Hours, Extra Life) and the genre labels (heavy metal, hip hop, new wave) are unchanged.

## Uncertain, please check
- "reverse" on its own is used both by Scribble Defender (R: turn the ship round) and by Recess Zone (Down: drive backwards). It is "demi-tour", which suits Defender. The combined "Down reverse" is "Bas marche arrière". If the Recess Zone sheet shows the word on its own, it will say "demi-tour".
- "ready!" = "prêt !" (masculine, as on the French cabinets).
- "class monitor" = "délégué de classe", "class president" = "chef de classe", "varsity letter" = "titulaire" (France has no varsity letters), "locker collector" = "la collection du casier".
- "change to" (Q*Nerd target cube) = "objectif". "across / down" = "horizontal / vertical" (I could not see where this line appears).
- "scores will go back to zero." is built in code as "<game> scores will go back to zero." in one text node, so the exact line never matches. I added a pattern `^(.+)\ scores\ will\ go\ back\ to\ zero\.$` = "les scores de $1 reviendront à zéro.", plus `^walkman\ with\ (.+)\ inside$` for the other tapes, and the full detention-slip confirmation "written up. thanks! it goes on the game's GitHub page within the hour." (the collector had split it at the apostrophe). These three are additions, not lines from en-source.json.
- The tracing-sheet titles (final grade., the end., lunch is over. ...) are mapped to lettered images by their English text in src/ui/ink-ui.js. If those headings are looked up after translation, French text will fall back until the French lettering is painted.
- Some lines run past 125% of the English length, mostly the direction words (e.g. "hop up-left" = "sauter en haut à gauche", "dig left and right" = "creuser à gauche et à droite") and "croix directionnelle". Check them on the cheat sheets with tools/ui-audit.mjs.
