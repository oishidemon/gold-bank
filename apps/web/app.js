// Pure helpers: used by the browser (window.GB) and by unit tests (require).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GB = factory();
})(this, function () {
  function g(n) { return Math.round(n).toLocaleString("en-US"); }
  function m(n) {
    return "$" + (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function mp(n) {
    var s = n.toFixed(6).replace(/0+$/, "");
    if ((s.split(".")[1] || "").length < 2) s = n.toFixed(2);
    return "$" + s;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  // "150" -> 150, "1.5k" -> 1500, "2m" -> 2000000, garbage -> NaN
  function pg(s) {
    var x = /^\s*([\d.,]+)\s*([kKmM]?)\s*$/.exec(s);
    if (!x) return NaN;
    return Math.round(parseFloat(x[1].replace(/,/g, "")) * { "": 1, k: 1e3, m: 1e6 }[x[2].toLowerCase()]);
  }
  // payout for a sale row: sold gold / price unit * price
  function amt(r) { return (r.sold / r.unit) * r.price; }
  function unitLbl(u) { return u >= 1e6 ? "/ 1M" : u >= 1e3 ? "/ 1k" : "/ 1"; }
  return { g: g, m: m, mp: mp, esc: esc, pg: pg, amt: amt, unitLbl: unitLbl };
});

var S = { owners: [], rows: [] }, TOK = "";
try { TOK = localStorage.getItem("gold-bank-token") || ""; } catch { /* storage unavailable */ }

function $(i) { return document.getElementById(i); }
var g = GB.g, m = GB.m, mp = GB.mp, esc = GB.esc, pg = GB.pg, amt = GB.amt, unitLbl = GB.unitLbl;
function sum(a, f) { return a.reduce(function (t, x) { return t + f(x); }, 0); }
function stockRow(o) { return S.rows.filter(function (r) { return r.owner === o && r.stock > 0; })[0]; }
function stockOf(o) { var r = stockRow(o); return r ? r.stock : 0; }
function sales(o) { return S.rows.filter(function (r) { return r.sold > 0 && (!o || r.owner === o); }); }

// ---- API ----
async function api(method, path, body) {
  for (var i = 0; i < 2; i++) {
    var r = await fetch("/api" + path, {
      method: method,
      headers: Object.assign({ "Content-Type": "application/json" }, TOK ? { Authorization: "Bearer " + TOK } : {}),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 401) {
      TOK = prompt("Password") || "";
      try { localStorage.setItem("gold-bank-token", TOK); } catch { /* storage unavailable */ }
      continue;
    }
    if (!r.ok) {
      var e = await r.json().catch(function () { return {}; });
      throw new Error(Array.isArray(e.message) ? e.message.join(", ") : e.message || r.statusText);
    }
    return r.status === 204 ? null : r.json();
  }
  throw new Error("Wrong password");
}
async function load() { S = await api("GET", "/state"); render(); }
async function act(fn) {
  try { await fn(); await load(); } catch (e) { alert(e.message); try { await load(); } catch { /* keep going */ } }
}

// ---- UI ----
function fillSel(id, all) {
  var el = $(id), v = el.value;
  el.innerHTML = (all ? '<option value="">All members</option>' : "") +
    S.owners.map(function (o) { return '<option value="' + esc(o) + '">' + esc(o) + "</option>"; }).join("");
  if (S.owners.indexOf(v) > -1 || (all && !v)) el.value = v;
}
function hint() {
  var o = $("so").value;
  $("sh").textContent = o ? o + " has " + g(stockOf(o)) + " gold in stock. The price is locked once the sale is recorded." : "Add a member first.";
}
function render() {
  var st = sum(S.rows, function (r) { return r.stock; }), sd = sum(sales(), function (r) { return r.sold; });
  var un = sum(sales().filter(function (r) { return !r.paid; }), amt), pd = sum(sales().filter(function (r) { return r.paid; }), amt);
  $("tot").innerHTML = '<div><b class="go">' + g(st) + '</b><span>in stock GOLD</span></div><div><b class="go">' + g(sd) + "</b><span>sold GOLD</span></div><div><b>" + m(un) + "</b><span>unpaid</span></div><div><b>" + m(pd) + "</b><span>paid</span></div>";
  fillSel("am"); fillSel("so"); fillSel("fo", true); hint();
  $("mem").innerHTML = S.owners.length ? S.owners.map(function (o) {
    var a = sales(o);
    return "<tr><td>" + esc(o) + '</td><td class="n go">' + g(stockOf(o)) + '</td><td class="n go">' + g(sum(a, function (r) { return r.sold; })) +
      '</td><td class="n pn">' + m(sum(a.filter(function (r) { return !r.paid; }), amt)) + '</td><td class="n pd">' + m(sum(a.filter(function (r) { return r.paid; }), amt)) +
      '</td><td><button class="s g" data-delo="' + esc(o) + '" aria-label="Delete member">×</button></td></tr>';
  }).join("") : '<tr><td colspan="6" class="empty">Add your first member to get started.</td></tr>';
  var fo = $("fo").value;
  var list = S.rows.filter(function (r) { return !fo || r.owner === fo; })
    .sort(function (a, b) { return (b.stock > 0) - (a.stock > 0) || (b.t || 0) - (a.t || 0); });
  $("lg").innerHTML = list.length ? list.map(function (r) {
    if (r.stock > 0)
      return "<tr><td>" + esc(r.owner) + '</td><td class="n go">' + g(r.stock) + '</td><td class="n mu">—</td><td class="n mu">—</td><td class="n mu">—</td><td class="mu">—</td><td><button class="s" data-sell="' + esc(r.owner) + '">Sell</button> <button class="s g" data-delst="' + r.id + '" aria-label="Delete stock">×</button></td></tr>';
    return "<tr><td>" + esc(r.owner) + '</td><td class="n mu">—</td><td class="n go">' + g(r.sold) + '</td><td class="n ' + (r.paid ? "pd" : "pn") + '">' + m(amt(r)) +
      '</td><td class="n">' + mp(r.price) + " " + unitLbl(r.unit) + '</td><td><button class="s t ' + (r.paid ? "on" : "off") + '" data-pay="' + r.id + '">' + (r.paid ? "PAID OUT" : "REFUND") +
      '</button></td><td><button class="s g" data-undo="' + r.id + '">Undo sale</button></td></tr>';
  }).join("") : '<tr><td colspan="7" class="empty">No records yet. Add gold to a member\'s stock first.</td></tr>';
}

$("ao").onclick = function () {
  var n = $("on").value.trim();
  if (!n) return;
  act(function () { return api("POST", "/members", { name: n }); }).then(function () { $("on").value = ""; });
};
$("aa").onclick = function () {
  var o = $("am").value, n = pg($("ag").value);
  if (!o || !(n > 0)) return alert("Pick a member and enter a gold amount, e.g. 150.");
  act(function () { return api("POST", "/stock", { owner: o, gold: n }); }).then(function () { $("ag").value = ""; });
};
$("as").onclick = function () {
  var o = $("so").value, n = pg($("sg").value), p = parseFloat($("sp").value), u = +$("su").value;
  if (!o || !(n > 0) || !(p > 0)) return alert("Pick a member, then enter gold sold and the gold price.");
  if (n > stockOf(o)) return alert(o + " only has " + g(stockOf(o)) + " gold in stock.");
  act(function () { return api("POST", "/sales", { owner: o, gold: n, price: p, unit: u }); })
    .then(function () { $("sg").value = ""; $("sp").value = ""; });
};
$("so").onchange = hint;
$("fo").onchange = render;
document.addEventListener("click", function (e) {
  var d = e.target.dataset;
  if (!d) return;
  if (d.sell) { $("so").value = d.sell; hint(); $("sg").value = String(stockOf(d.sell)); $("sg").focus(); $("sg").select(); }
  else if (d.pay) act(function () { return api("PATCH", "/sales/" + d.pay + "/paid"); });
  else if (d.delst) { if (confirm("Delete this stock?")) act(function () { return api("DELETE", "/stock/" + d.delst); }); }
  else if (d.undo) {
    var r = S.rows.filter(function (x) { return x.id === d.undo; })[0];
    if (!r || !r.paid || confirm("This sale is marked as paid out. Undo it anyway?")) act(function () { return api("DELETE", "/sales/" + d.undo); });
  }
  else if (d.delo) { if (confirm("Delete this member and all their records?")) act(function () { return api("DELETE", "/members/" + encodeURIComponent(d.delo)); }); }
});
load().catch(function (e) { alert(e.message); });
