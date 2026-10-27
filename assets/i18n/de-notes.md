# German (de) translation notes

## Voice and form
- She addresses the player with "du". Sentence starts stay lowercase like the English; nouns keep German capitals ("Endnote.", "noch keine Punkte.").
- Victory titles about her use feminine forms (Klassensprecherin, Kammerjägerin, Laborpartnerin, Spindsammlerin, Platzwartin, Restaurantkritikerin, Schlangenbeschwörerin, Mannschaftskapitänin, Verteidigerin des Heftrands). "paperboy of the month" stays "Zeitungsjunge des Monats" (the game's boy).
- Cheat sheet lines: key word, then a short infinitive ("Leertaste feuern", "Links+Rechts lenken"). Where the key already names the direction, the repeated direction is dropped ("Left+Right aim left and right" = "Links+Rechts zielen").

## Puns and school adaptations
- final grade. = Endnote. / class dismissed. = Unterricht vorbei. / pencils down. = Stifte weg. / detention. = Nachsitzen.
- tardy slip. = Klassenbucheintrag. (German schools have no tardy slips; the class register entry is the equivalent).
- insert pencil = Stift einwerfen (after "Münze einwerfen").
- photo retake. = Foto, die Zweite. / say cheese. = bitte lächeln.
- just another brick. = nur ein Stein in der Mauer. (the Pink Floyd line as Germans know it).
- watch your step = Vorsicht, Stufe (the German sign).
- time served = Strafe abgesessen; sent to the office = ins Rektorat geschickt; see the principal = ab zum Rektor.
- straight A's = lauter Einsen; top marks = Bestnote; varsity letter = Sportabzeichen (no varsity in Germany); shutout = zu null.
- ink thousand = Tintentausend (no clean German pun; reviewer may prefer another).
- chef's special = Tagesgericht; brain freeze = Hirnfrost; hot air = heiße Luft.
- PE got competitive. = Im Sport wird's jetzt ernst.

## Terms (see glossary in de.json)
- coach stays "Coach" (short for the Pong HUD; German schools would say Sportlehrer).
- Term Paperboy throws "Zeitungen" (the Paperboy idea reads better than "Hausarbeiten"); reviewer may want "Hausarbeiten" to keep the term paper joke.
- desk = Tisch everywhere (Spitball Command desks and her desk); bench = Bank; ruler = Lineal.
- quarter = Münze; saucer and UFO = Ufo; fuel = Sprit; smart bomb = Smartbomb; Hyperraum, Superzapper kept.
- Joust enemy names Bounder, Hunter, Shadow Lord kept as in the original cabinet.
- tab = Reiter (the notebook's index tabs); score/points/scores = Punkte; high scores = Highscores.
- Mixtape titles (After Hours, BUS BEATS, LOUD, NEW WAVE, Extra Life) are kept in English.

## Lines left unchanged on purpose
- CSS, class names and code fragments: "(prefers-reduced-motion: reduce)", "px ...", "achievement-list trophy-list", "tb tb-", "use strict", "Notebook close:" (console), and the "s ..." fragments the collector cut at an apostrophe.
- Names (Ruby Ann Delgado and the others), REZ, LB, RB, Esc, Enter.

## Extras beyond the source table
- Exact: "written up. thanks! it goes on the game's GitHub page within the hour." (the collector only caught its tail, "s GitHub page within the hour.").
- Exact: the seven Term Paperboy day names (with and without a full stop).
- Patterns: Hall Patrol HUD for the champion course and any checkpoint letter; Term Paperboy HUD for every day and for the training course ("papers plenty   time N").

## Engine issues found (src/shell/i18n.js), affect all languages
1. Captured numbers carry the punctuation that follows them ("15,000." or "10,000,"), so num() does not reformat them and German shows "Extraleben bei 10,000," instead of "10.000,". Fix idea: split off a trailing [.,] before formatting and append it again.
2. The replacement only reads one digit ($10 becomes $1 followed by 0). Pattern 17 (Q*Nerd scoring) has 11 groups, so its end renders wrong until the replace regex is /\$(\d+)/.
3. "lives N   papers plenty   time N   day" (Term Paperboy course) and the non-Monday days had no source pattern; added here, but fr/es need them too.
