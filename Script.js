// ---------- 1. State ----------
// "expression" is the string we build up as the user types, e.g. "12+7×3"
// "justEvaluated" tracks whether the last action was pressing "=", so that
// typing a new number afterward starts fresh instead of appending.
let expression = "";
let justEvaluated = false;

const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");

// Symbols we display vs. the operators JavaScript actually understands
const OPERATORS = ["+", "−", "×", "÷"];
const toJsOperator = (symbol) => ({
  "−": "-",
  "×": "*",
  "÷": "/",
  "+": "+"
}[symbol]);

// ---------- 2. Safe evaluation ----------
// We never hand raw user text to eval(). Instead we only allow digits,
// decimal points, and the four/five known operators through — anything
// else is rejected before it ever reaches the Function constructor.
function toJsExpression(expr){
  return expr.replace(/[+\-−×÷]/g, (m) => toJsOperator(m));
}

function isSafe(expr){
  return /^[0-9+\-−×÷.\s]*$/.test(expr);
}

function evaluate(expr){
  if (!expr || !isSafe(expr)) return null;
  // Don't try to evaluate an expression that trails off with an operator
  if (OPERATORS.includes(expr.trim().slice(-1))) return null;

  try {
    const jsExpr = toJsExpression(expr);
    // eslint-disable-next-line no-new-func
    const value = Function(`"use strict"; return (${jsExpr})`)();
    if (typeof value !== "number" || !isFinite(value)) return null;
    // round away long floating point tails like 0.1 + 0.2
    return Math.round(value * 1e10) / 1e10;
  } catch (err) {
    return null;
  }
}

// ---------- 3. Rendering ----------
function render(){
  expressionEl.textContent = expression || "\u00a0";

  const preview = evaluate(expression);
  if (expression === ""){
    resultEl.textContent = "0";
    resultEl.classList.remove("error");
  } else if (preview === null){
    // Mid-typing states (like "12+") just hold the last valid result quietly
    // rather than shouting an error at the user while they're still typing.
    resultEl.classList.remove("error");
  } else {
    resultEl.textContent = formatNumber(preview);
    resultEl.classList.remove("error");
  }
}

function formatNumber(n){
  // Keep big numbers readable, avoid endless decimals
  if (Math.abs(n) >= 1e12) return n.toExponential(4);
  return n.toString();
}

function pulseResult(){
  resultEl.classList.add("pulse");
  setTimeout(() => resultEl.classList.remove("pulse"), 120);
}

// ---------- 4. Input handling ----------
function inputDigit(d){
  if (justEvaluated){
    expression = "";
    justEvaluated = false;
  }
  expression += d;
  render();
}

function inputDecimal(){
  if (justEvaluated){
    expression = "";
    justEvaluated = false;
  }
  // find the current number segment (after the last operator)
  const segments = expression.split(/[+\-−×÷]/);
  const currentSegment = segments[segments.length - 1];
  if (currentSegment.includes(".")) return; // no double decimals
  expression += (currentSegment === "" ? "0." : ".");
  render();
}

function inputOperator(op){
  if (expression === "" && op !== "−") return; // can't lead with an operator (minus allowed for negatives... simplified: block anyway for clarity)
  justEvaluated = false;
  const lastChar = expression.trim().slice(-1);
  if (OPERATORS.includes(lastChar)){
    // replace a trailing operator instead of stacking them
    expression = expression.slice(0, -1) + op;
  } else {
    expression += op;
  }
  render();
}

function clearAll(){
  expression = "";
  justEvaluated = false;
  render();
}

function clearEntry(){
  expression = expression.slice(0, -1);
  justEvaluated = false;
  render();
}

function doEquals(){
  const value = evaluate(expression);
  if (value === null){
    resultEl.textContent = "Error";
    resultEl.classList.add("error");
    return;
  }
  expression = formatNumber(value);
  justEvaluated = true;
  pulseResult();
  render();
}

// ---------- 5. Button clicks ----------
document.querySelectorAll(".key").forEach(btn => {
  btn.addEventListener("click", () => {
    flashKey(btn);
    const action = btn.dataset.action;
    const value = btn.dataset.value;

    if (action === "clear-all") return clearAll();
    if (action === "clear-entry") return clearEntry();
    if (action === "equals") return doEquals();
    if (OPERATORS.includes(value)) return inputOperator(value);
    if (value === ".") return inputDecimal();
    return inputDigit(value);
  });
});

function flashKey(btn){
  btn.classList.add("pressed");
  setTimeout(() => btn.classList.remove("pressed"), 100);
}

// Match an on-screen key to a keyboard character, so pressing "+" on the
// keyboard visually flashes the same button the mouse would click.
function findKeyButton({ value, action }){
  if (action) return document.querySelector(`[data-action="${action}"]`);
  return document.querySelector(`[data-value="${CSS.escape(value)}"]`);
}

// ---------- 6. Keyboard support ----------
const KEY_MAP = {
  "+": "+", "-": "−", "*": "×", "/": "÷",
  "0":"0","1":"1","2":"2","3":"3","4":"4","5":"5","6":"6","7":"7","8":"8","9":"9",
  ".": "."
};

document.addEventListener("keydown", (e) => {
  if (e.key in KEY_MAP){
    const symbol = KEY_MAP[e.key];
    const btn = findKeyButton({ value: symbol });
    if (btn) flashKey(btn);

    if (OPERATORS.includes(symbol)) inputOperator(symbol);
    else if (symbol === ".") inputDecimal();
    else inputDigit(symbol);

    e.preventDefault();
    return;
  }

  if (e.key === "Enter" || e.key === "="){
    flashKey(document.querySelector('[data-action="equals"]'));
    doEquals();
    e.preventDefault();
  } else if (e.key === "Backspace"){
    flashKey(document.querySelector('[data-action="clear-entry"]'));
    clearEntry();
    e.preventDefault();
  } else if (e.key === "Escape"){
    flashKey(document.querySelector('[data-action="clear-all"]'));
    clearAll();
    e.preventDefault();
  }
});

// ---------- 7. Start ----------
render();