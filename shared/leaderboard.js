/* Neon Arcade — local top-5 leaderboard (per-device, localStorage). window.Leaderboard */
(function () {
  window.Leaderboard = {
    MAX: 5,
    get(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } },
    save(key, arr) { try { localStorage.setItem(key, JSON.stringify(arr)); } catch (e) {} },
    // lowerBetter = true for lap times, false for scores
    qualifies(key, value, lowerBetter) {
      const a = this.get(key);
      if (a.length < this.MAX) return true;
      const worst = a[a.length - 1].v;
      return lowerBetter ? value < worst : value > worst;
    },
    add(key, initials, value, lowerBetter) {
      const a = this.get(key);
      const name = (initials || 'YOU').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'YOU';
      a.push({ n: name, v: value });
      a.sort((x, y) => (lowerBetter ? x.v - y.v : y.v - x.v));
      if (a.length > this.MAX) a.length = this.MAX;
      this.save(key, a);
      return a;
    },
    rankOf(key, value, lowerBetter) {
      const a = this.get(key).slice();
      a.push({ v: value, _q: 1 });
      a.sort((x, y) => (lowerBetter ? x.v - y.v : y.v - x.v));
      return a.findIndex((e) => e._q) + 1;
    },
    renderRows(key, lowerBetter, fmt, highlightName) {
      const a = this.get(key);
      if (!a.length) return '<div class="lb-empty">No times yet — set the first!</div>';
      return a.map((e, i) =>
        `<div class="lb-row${e.n === highlightName ? ' lb-hot' : ''}"><span class="lb-rank">${i + 1}</span><span class="lb-name">${e.n}</span><span class="lb-val">${fmt(e.v)}</span></div>`
      ).join('');
    }
  };
})();
