// Title rules as chips: clicking the word moves it to the next kind, the cross removes it.
import { esc } from "../core/safe.js";

const $ = s => document.querySelector(s);
export const LABELS = { exclude: "hide", prioritise: "first", require: "must have" };

export const rulesHtml = rules => rules.map(({ word, kind }) =>
  `<li class="rule ${kind}"><button class="rule-kind" data-word="${esc(word)}" title="Change the rule">${esc(word)}<small>${LABELS[kind]}</small></button><button class="rule-remove" data-word="${esc(word)}" aria-label="Remove ${esc(word)}">×</button></li>`).join("");

export const renderRules = state => { $("#rules").innerHTML = rulesHtml(state.rules); };
