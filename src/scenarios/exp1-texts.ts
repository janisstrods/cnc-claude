// Briefing texts of the 24 Expansion #1 battles (Greece & Eastern Kingdoms, 101-124): original summaries of the
// historical battles and plain-language paraphrases of their special rules. The setups are in data/101.json-124.json.

export interface ScenarioTexts {
  /** Short original summary of the historical battle. */
  blurb: string;
  /** Plain-language special rules shown in the briefing. */
  specialText?: string[];
  /** One-line hint shown in the battle list. */
  hint: string;
}

export const EXTRA_EXP1: Record<string, ScenarioTexts> = {
  '101': {
    blurb: "A Persian expedition under Datis and Artaphernes lands on the plain of Marathon, a day's march from Athens. The Athenians and a small Plataean contingent, led by the polemarch Callimachus with Miltiades urging attack, cross the last stretch at a run to blunt the Persian archery. By tradition they thin their centre to strengthen the wings, then fold both flanks in on the enemy.",
    specialText: [
      'The stream is fordable everywhere.',
      'The sea along the left edge (including the hex where the stream reaches it) and the hills along the right edge are impassable.',
    ],
    hint: 'Greek hoplites against Persian archers.',
  },
  '102': {
    blurb: "Gelon of Syracuse marches to relieve Himera, besieged on Sicily's northern coast by Hamilcar's Carthaginians, whose army sits behind a palisaded camp beside the shore. Tradition places the battle on the same day as Salamis. By one ancient account, Syracusan horsemen pass themselves off as expected allied cavalry, ride into the camp and kill Hamilcar while the main armies grind together.",
    specialText: [
      "Rampart hexes shelter the Carthaginian line. A foot unit standing on a rampart ignores the first sword and may ignore 1 extra flag when attacked from across the rampart's front edge (the side facing the enemy), and may ignore 1 flag from missile fire across it. Mounted units gain nothing.",
      'The three Carthaginian camps are fortified: a unit in one rolls 1 fewer die when it battles, and a foot unit there ignores 1 sword and may ignore 1 flag. Camps carry no banner.',
      'Hamilcar starts alone in his hex, without a unit, and the Syracusan cavalry with Eumachus starts already inside the Carthaginian position. The sea on the right edge is impassable.',
    ],
    hint: 'Ramparts, camps; kill Hamilcar.',
  },
  '103': {
    blurb: "A year after Salamis, Mardonius still holds central Greece with a Persian army. Pausanias leads the largest Greek alliance yet assembled, and when he shifts position in the foothills of Mount Cithaeron it looks like a retreat. Mardonius orders a pursuit and runs onto the Spartan phalanx. He is killed and his army breaks.",
    hint: 'Greek hoplites vs Persian light troops.',
  },
  '104': {
    blurb: "Cleombrotos' Spartans, long thought unbeatable, meet Epaminondas' Thebans on a Boeotian plain. Epaminondas breaks with custom: he piles his left wing many ranks deep, with the Sacred Band and cavalry in front, and holds back his weaker right. The Spartan king falls in the crush on his own right wing, and Sparta's aura of invincibility never recovers.",
    specialText: [
      'The Theban Sacred Band (the marked medium infantry unit) scores a hit with every helmet in close combat and may ignore one flag.',
    ],
    hint: 'Deep Theban left vs Spartan line.',
  },
  '105': {
    blurb: "Epaminondas leads his last campaign into the Peloponnese and meets the Spartans and their allies near Mantinea. He feigns a halt, then drives a deep column at the strongest point of the enemy line, which gives way. At the moment of triumph he is struck down by a spear, and Theban supremacy dies with him.",
    hint: 'Theban column against hill-flanked Spartans.',
  },
  '106': {
    blurb: "Philip II of Macedon marches into Thessaly to confront Onomarchus of Phocis, whose army is paid for with treasure taken from Delphi. Philip's men go into battle wearing laurel wreaths, as if avenging the god Apollo. The Phocians are driven back against the Gulf of Pagasae, and Onomarchus is killed in the rout.",
    specialText: ['The Pagasaean Gulf along the bottom edge is impassable.'],
    hint: 'Pin the Phocians against the sea.',
  },
  '107': {
    blurb: "On his first great day in Asia, Alexander finds the satraps of Asia Minor drawn up behind the steep-banked Granicus. Rather than wait for morning, he plunges across at once, leading the Companions at the Persian cavalry. Alexander is nearly killed when the satrap Spithridates splits his helmet, but the Persian line collapses and the road into Asia lies open.",
    specialText: [
      'The Granicus is fordable everywhere.',
      'Alexander: the unit he is attached to rolls 1 extra die in close combat.',
      'The Companions (the medium cavalry with Alexander) ignore the first sword rolled against them and may ignore 1 flag.',
      "Poor Persian leadership: a satrap's helmets count only for the unit he is attached to, and a Leadership card played on a satrap orders only him and his own unit. He still lets his unit ignore a flag.",
    ],
    hint: 'Alexander charges across a ford.',
  },
  '108': {
    blurb: "Darius III marches behind Alexander and cuts his supply line; the Macedonians turn about and meet him on a narrow coastal plain behind the Pinarus, squeezed between the sea and the mountains. Alexander leads the Companions across the river, aiming straight for the Great King. Darius's nerve fails, his chariot turns away, and the Persian host dissolves.",
    specialText: [
      'The Pinarus is fordable without the usual dice caps: units still stop on entering it, but they fight with their full dice from the river. The Persians start with units standing in it.',
      'The sea on the right edge is impassable. The Amanus hills on the left are ordinary, passable hills.',
      'Alexander: the unit he is attached to rolls 1 extra die in close combat. The Companions (the medium cavalry with Alexander) ignore the first sword rolled against them and may ignore 1 flag.',
      'The Persian Immortals (the marked medium infantry with Darius) carry bows: they may fire up to 3 hexes, 2 dice if they did not move or 1 if they moved, but never fire and fight in close combat in the same turn.',
    ],
    hint: 'Cross the river, strike Darius.',
  },
  '109': {
    blurb: "Darius picks a broad plain near Gaugamela, levelled for his scythed chariots, and masses a huge host from across the empire. Alexander advances obliquely to drag the Persian left out of position, then leads the Companions through the gap that opens toward Darius. For a second time the Great King flees, and Persia's fate is sealed.",
    specialText: [
      'Alexander: the unit he is attached to rolls 1 extra die in close combat.',
      'The Companions (the medium cavalry with Alexander) ignore the first sword rolled against them and may ignore 1 flag.',
      'The Persian chariots are ordinary heavy chariots; there is no special scythed-chariot rule.',
    ],
    hint: 'Open plain; Alexander seeks Darius.',
  },
  '110': {
    blurb: "Alexander is founding a new city on the Jaxartes when Scythian horsemen mass on the far bank. Macedonian catapults sweep the opposite shore to cover the crossing, and light troops and cavalry cross to meet the wheeling horse archers. A combined charge breaks the nomads' circling and drives them off into the open steppe.",
    specialText: [
      'The Jaxartes is fordable everywhere.',
      'Alexander: the unit he is attached to rolls 1 extra die in close combat. The Companions (the medium cavalry with Alexander) ignore the first sword rolled against them and may ignore 1 flag.',
      'The Macedonian catapults (heavy war machines) move 1 hex and cannot fire or fight after moving; they fire up to 6 hexes with 2 dice, but never at an adjacent enemy.',
      'The Scythian horse archers (light bow cavalry) shoot up to 3 hexes, with 2 dice if they did not move and 1 if they did, and can always evade.',
    ],
    hint: 'Catapults cover a river crossing.',
  },
  '111': {
    blurb: "Porus waits with chariots and war elephants on the far bank of the swollen Hydaspes. Alexander feints at the main ford, then slips upstream by night and crosses in a storm with the better part of his cavalry. Porus turns to meet him, but the elephants, boxed in and harried by archers and javelins, trample their own side. Alexander, impressed by his foe, lets him keep his kingdom.",
    specialText: [
      'The river down the left edge is impassable.',
      'Alexander: the unit he is attached to rolls 1 extra die in close combat.',
      'Two Companion units: the cavalry with Alexander and the cavalry with Coenus each ignore the first sword rolled against them and may ignore 1 flag.',
    ],
    hint: 'Elephants and chariots against Alexander.',
  },
  '112': {
    blurb: "Alexander is dead, and his generals have begun to fight over the empire. Craterus, a revered veteran, and Neoptolemus advance on Eumenes, Alexander's former secretary, whose strength lies in his cavalry. In the clash both Macedonian commanders fall: Neoptolemus, by tradition, to Eumenes in single combat, and Craterus trampled when thrown from his horse.",
    specialText: [
      "Every leader counts. Each leader killed permanently lowers his side's Command (hand size) by 1. If it happens on his owner's own turn, the owner skips the draw at the end of that turn; if it happens on the enemy's turn, a random card from his hand is discarded at once.",
      'If a side loses every leader it started with (two each), the other side wins at once.',
    ],
    hint: 'Leader losses shrink your hand.',
  },
  '113': {
    blurb: "Two of Alexander's former officers, Eumenes and Antigonus, fight for control of Asia in the highlands of Persia. Eumenes' veteran Silver Shields rip through the enemy phalanx, while Antigonus' stronger cavalry presses on the flank. Neither commander wins a clean victory, and the war grinds on toward a final showdown a year later.",
    specialText: [
      'The hills down the left edge are impassable.',
      'The Silver Shields (the marked heavy infantry with Eumenes) score a hit with every helmet in close combat and may ignore one flag.',
    ],
    hint: "Silver Shields against Antigonus' cavalry.",
  },
  '114': {
    blurb: "In the dust of the Persian desert, Eumenes' veterans again outfight Antigonus' infantry, but a cavalry raid slips round the battle and seizes the baggage camp, with the Silver Shields' families and plunder inside. The Shields, fighting for their possessions, hand Eumenes over, and Antigonus becomes master of the Persian east.",
    specialText: [
      'The Silver Shields (the marked heavy infantry with Eumenes) score a hit with every helmet in close combat and may ignore one flag.',
      "Camp capture: the first time a unit of Antigonus' army ends its move on Eumenes' camp (the bottom-right corner), Antigonus gains 1 banner. Only once, and it can never be lost; passing through is not enough, and Eumenes' units never capture.",
    ],
    hint: 'Race for the baggage camp.',
  },
  '115': {
    blurb: "Four successors fight for Alexander's empire. Antigonus, old and one-eyed, holds the centre while his son Demetrius leads a victorious cavalry charge on the left, and chases the fugitives too far. Seleucus parks a screen of elephants across the way back, leaving Antigonus' phalanx exposed. The old king falls under a hail of missiles, and the empire is carved up for good.",
    hint: 'Cavalry pursuit versus elephant screen.',
  },
  '116': {
    blurb: "Pyrrhus of Epirus, invited by Tarentum, faces his first Roman army on the Siris river. The Romans cross to fight, and for hours phalanx and legion trade blows. Then Pyrrhus unleashes his elephants, beasts the Romans have never seen; the Roman horses bolt in terror and the legions break. It is a victory, but the Epirote veterans fall in great numbers.",
    specialText: [
      'The River Siris can be crossed only at its bends (shallow fords); every other river hex is impassable.',
      'Fright at First Sight: Roman foot units cannot ignore any flag rolled by an elephant, whether from a leader, from support or from any other source. This holds when the elephant attacks and when it battles back. Roman cavalry are unaffected.',
    ],
    hint: 'Elephants terrify the Roman infantry.',
  },
  '117': {
    blurb: "Pyrrhus faces the Romans again, now at Asculum in Apulia. On the first day, rough and wooded ground hampers his phalanx and elephants; on the second he gets the open ground he wants, and the Romans give way. Pyrrhus holds the field but loses so many of his best men that he is said to have remarked that one more such victory would ruin him.",
    specialText: [
      'Leader placement: after both sides have seen their hands, and before the first turn, the Romans place their 2 leaders one at a time, then the Epirotes place their 2. A leader may join any of his own units that has no leader, or stand alone on an empty passable hex, even next to the enemy. Placing costs no order.',
      'The Romans move first.',
    ],
    hint: 'Place leaders after seeing your hand.',
  },
  '118': {
    blurb: "Pyrrhus tries to catch Manius Curius Dentatus off guard with a night march through the woods around Beneventum. Torches burn low, the column straggles into daylight, and the Romans are waiting among their camps. In the fighting that follows the elephants take fright under a rain of missiles and trample their own lines; Pyrrhus leaves Italy soon afterward.",
    specialText: [
      "Rampart hexes join the Roman camps. A foot unit standing on a rampart ignores the first sword and may ignore 1 extra flag when attacked from across the rampart's front edge (the side facing the enemy), and may ignore 1 flag from missile fire across it. Mounted units gain nothing.",
      'The three Roman camps are fortified: a unit in one rolls 1 fewer die when it battles, and a foot unit there ignores 1 sword and may ignore 1 flag. Camps and ramparts carry no banner.',
      'The two Roman war machines (heavy war machines) fire up to 6 hexes with 2 dice if they have not moved, but never at an adjacent enemy.',
    ],
    hint: 'Ramparts and artillery vs elephants.',
  },
  '119': {
    blurb: "Ptolemy IV of Egypt and Antiochus III of Syria meet on the Gaza frontier with two of the largest elephant forces of the age. Ptolemy's smaller African elephants shy from Antiochus' Indian beasts, and Antiochus' right wing sweeps all before it, but he chases too far while Ptolemy's phalanx, swelled by newly trained Egyptian troops, breaks the Seleucid centre.",
    hint: 'Symmetric Hellenistic clash with elephants.',
  },
  '120': {
    blurb: "Flamininus and Philip V blunder into each other across the low ridges of Thessaly known as the Dog's Heads, in thick mist. Philip's phalanx surges downhill and nearly wins on its right, while its left is still struggling up the slope. A Roman officer wheels free maniples onto the pikemen's rear, and the formation dissolves.",
    specialText: ['Optional: Roman Tactical Flexibility — see Optional rules.'],
    hint: 'Maniples versus phalanx on hills.',
  },
  '121': {
    blurb: "Antiochus III, challenging Rome in Asia Minor, deploys a vast and colourful army beside the Phrygios river: heavy phalanx, scythed chariots, camels with archers, elephants. The Romans and Eumenes of Pergamum answer with archers and slingers who stampede the chariots back into their own lines. Antiochus' cavalry chases off the Roman left, but his packed phalanx, left alone, is cut down.",
    specialText: [
      'The Phrygios river down the left edge is impassable.',
      'The Seleucid camel is a medium mounted unit that startles horses (like elephants: cavalry forced to retreat by its flags retreat 1 hex further per flag) and ignores 1 blue-triangle hit rolled against it by cavalry.',
      'Optional: Roman Tactical Flexibility — see Optional rules.',
    ],
    hint: 'Camels and elephants vs legions.',
  },
  '122': {
    blurb: "Dionysius I, tyrant of Syracuse, carries the war into the Carthaginian west of Sicily and meets their army in the field at Cronium. Both sides field citizen hoplites, mercenaries and horse, and the day goes to whoever holds a line together. In the usual account it ends in a Carthaginian victory, and Leptines, the brother of Dionysius, dies on the field.",
    hint: 'Balanced Sicilian armies on open ground.',
  },
  '123': {
    blurb: "Seleucus, master of Alexander's eastern conquests, marches to the Indus to reclaim lands Alexander once held, and meets the army of Chandragupta Maurya. No ancient source describes a pitched battle here, so this is a plausible encounter rather than a documented one. What is known is the settlement: Seleucus yielded the border provinces and received 500 war elephants, which later served him at Ipsus.",
    specialText: [
      'The winding river in the bottom-left is fordable.',
      'The three Indian auxiliaries marked as bow-armed can shoot up to 3 hexes, with 2 dice if they did not move and 1 if they moved 1 hex; after moving 2 hexes they cannot fire.',
    ],
    hint: 'Plausible clash: bowmen and elephants.',
  },
  '124': {
    blurb: "Aemilius Paullus meets Perseus of Macedon on the plain beside Pydna. At first the Macedonian phalanx drives the Romans back before it. But as the pikemen push across uneven ground their line opens in gaps; Roman maniples work into the gaps and cut the unwieldy formation to pieces. The defeat ends the Macedonian monarchy.",
    specialText: [
      'Optional: Roman Tactical Flexibility — see Optional rules (it does not apply to a Macedonian heavy infantry unit standing on broken ground).',
    ],
    hint: 'Phalanx struggles on broken ground.',
  },
};
