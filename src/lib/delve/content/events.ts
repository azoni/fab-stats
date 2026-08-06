/**
 * Choice-shrine events. Outcomes are weighted verbs the engine interprets;
 * new events are rows.
 */
import type { EventDef } from "../types";

export const EVENTS: EventDef[] = [
  {
    id: "misfiled_reliquary",
    name: "Misfiled Reliquary",
    prompt:
      "A reliquary sits on the wrong shelf, humming. A brass plate reads DO NOT RESHELVE. The lock looks... negotiable.",
    options: [
      {
        label: "Pick the lock",
        outcomes: [
          { weight: 50, kind: "item", text: "It clicks open. Something glints inside." },
          { weight: 30, kind: "marks", amount: 40, text: "Loose Marks spill out — someone's rainy-day stash." },
          { weight: 20, kind: "damage", amount: 20, text: "The lock bites back. The plate wasn't kidding." },
        ],
      },
      {
        label: "Reshelve it properly",
        outcomes: [
          { weight: 70, kind: "heal", amount: 20, text: "The stacks approve. A warm draft knits your wounds." },
          { weight: 30, kind: "nothing", text: "Nothing happens, but it felt like the right thing to do." },
        ],
      },
      { label: "Leave it", outcomes: [{ weight: 100, kind: "nothing", text: "Not your problem. Not today." }] },
    ],
  },
  {
    id: "ashen_scribe",
    name: "The Ashen Scribe",
    prompt:
      "A burnt figure copies the same line over and over: 'the meta settles, the meta settles.' It offers you its pen without looking up.",
    options: [
      {
        label: "Take the pen",
        outcomes: [
          { weight: 60, kind: "buffAtk", amount: 15, text: "Your grip steadies. Everything looks more solvable. (+15% ATK this run)" },
          { weight: 40, kind: "damage", amount: 15, text: "The pen is scalding. You drop it. The scribe finally laughs." },
        ],
      },
      {
        label: "Read the manuscript",
        outcomes: [
          { weight: 100, kind: "material", materialId: "gloam", amount: 2, text: "Between the lines: pressed Gloam, saved like flowers." },
        ],
      },
      { label: "Back away", outcomes: [{ weight: 100, kind: "nothing", text: "Some homework isn't yours to grade." }] },
    ],
  },
  {
    id: "counterfeit_fountain",
    name: "Counterfeit Fountain",
    prompt:
      "A fountain of ink-dark water. A sign says HEALING SPRING in handwriting that is trying very hard to look official.",
    options: [
      {
        label: "Drink deep",
        outcomes: [
          { weight: 55, kind: "heal", amount: 35, text: "It IS a healing spring. The sign was just badly made." },
          { weight: 25, kind: "damage", amount: 15, text: "It is ink. You feel... annotated." },
          { weight: 20, kind: "flask", amount: 1, text: "Bitter — but your flask fills itself at the rim. +1 charge." },
        ],
      },
      {
        label: "Fill your flask carefully",
        outcomes: [{ weight: 100, kind: "flask", amount: 1, text: "Cautious and correct. +1 flask charge." }],
      },
      { label: "Walk on", outcomes: [{ weight: 100, kind: "nothing", text: "You've been burned by signage before." }] },
    ],
  },
  {
    id: "tally_imps_wager",
    name: "The Tally Imp's Wager",
    prompt:
      "A Tally Imp perches on a broken shelf, jingling a pouch. 'Double or nothing on your pocket Marks. I keep an honest ledger.' It does not keep an honest ledger.",
    options: [
      {
        label: "Take the wager",
        outcomes: [
          { weight: 45, kind: "marks", amount: 60, text: "You win. The imp pays up, muttering about variance." },
          { weight: 55, kind: "marks", amount: -30, text: "'Ledger says you lose.' The ledger is a drawing of a rat." },
        ],
      },
      {
        label: "Flip the shelf instead",
        outcomes: [
          { weight: 50, kind: "marks", amount: 25, text: "Coins rain from the imp's rigged shelf. Justice." },
          { weight: 50, kind: "damage", amount: 10, text: "The shelf lands on your foot. The imp applauds." },
        ],
      },
      { label: "Decline politely", outcomes: [{ weight: 100, kind: "nothing", text: "The imp marks you down as 'coward (fiscally wise).'" }] },
    ],
  },
];

export const EVENT_BY_ID = new Map(EVENTS.map((e) => [e.id, e]));
