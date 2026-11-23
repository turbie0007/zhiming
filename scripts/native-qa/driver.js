(() => {
  const SAMPLE = {
    name: '示例甲', gender: 'male', calendar: 'solar',
    solar: { y: 1990, m: 1, d: 1 },
    lunar: null, time: { h: 12, min: 0 },
    trueSolar: false, city: '北京', lateZi: true, shareHideName: true,
  };
  const RECORDS = [
    { id: 'store-demo-a', input: SAMPLE, tags: ['四柱研習'], folder: '研習示例', note: '虛構資料，用於四柱與十神研習。', createdAt: '2026-11-20T09:00:00Z' },
    { id: 'store-demo-b', input: { ...SAMPLE, name: '示例乙', gender: 'female', solar: { y: 1994, m: 8, d: 18 }, time: { h: 9, min: 20 } }, tags: ['合參練習'], folder: '研習示例', note: '虛構資料，用於雙盤對照練習。', createdAt: '2026-11-19T09:00:00Z' },
    { id: 'store-demo-c', input: { ...SAMPLE, name: '示例丙', solar: { y: 1988, m: 3, d: 6 }, time: null }, tags: ['時辰未知'], folder: '研習示例', note: '虛構資料，示範時辰未知的排盤方式。', createdAt: '2026-11-18T09:00:00Z' },
  ];
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const on = (selector) => document.querySelector(selector);
  async function until(target, ms = 15000) {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      const value = typeof target === 'string' ? on(target) : target();
      if (value) return value;
      await sleep(50);
    }
    throw new Error('Timed out waiting for ' + (typeof target === 'string' ? target : 'condition'));
  }
  window.qaSeedSync = (cmd) => {
    if (!cmd.seed) return 'skip';
    if (localStorage.getItem('zhiming.qa.seeded')) return 'have';
    localStorage.setItem('zhiming.theme.v1', 'light');
    localStorage.setItem('zhiming.lastInput.v2', JSON.stringify(SAMPLE));
    localStorage.setItem('zhiming.records.v3', JSON.stringify(RECORDS));
    localStorage.setItem('zhiming.backup.v1', JSON.stringify({ lastExport: new Date().toISOString() }));
    localStorage.setItem('zhiming.qa.seeded', '1');
    return 'seeded';
  };
  window.qaRun = async (cmd) => {
    const ops = {
      wait: async (selector) => { await until(selector); },
      click: async (selector) => { (await until(selector)).click(); },
      fill: async ([selector, value]) => {
        const node = await until(selector);
        node.value = value;
        node.dispatchEvent(new Event('input', { bubbles: true }));
        node.dispatchEvent(new Event('change', { bubbles: true }));
      },
      submit: async (selector) => { (await until(selector)).requestSubmit(); },
      hash: async (value) => { location.hash = value; },
      align: async (selector) => {
        const node = await until(selector);
        const header = document.querySelector('.site-header')?.getBoundingClientRect().height || 0;
        window.scrollTo({ top: node.getBoundingClientRect().top + scrollY - header - 14, behavior: 'instant' });
      },
      centerX: async (selector) => { (await until(selector)).scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' }); },
      theme: async (want) => {
        if (document.documentElement.dataset.theme !== want) {
          on('[data-action=theme]').click();
          await until(() => document.documentElement.dataset.theme === want);
        }
      },
    };
    await until('#chart-form');
    const steps = [];
    for (const step of cmd.steps) {
      const [op, arg] = Object.entries(step)[0];
      await ops[op](arg);
      steps.push(op + ':' + (typeof arg === 'string' ? arg : JSON.stringify(arg)));
    }
    await sleep(400);
    await until(() => !document.querySelector('#toast.is-visible'), 12000);
    await sleep(300);
    return {
      scene: cmd.scene,
      steps,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      theme: document.documentElement.dataset.theme,
      href: location.href,
      title: document.title,
    };
  };
})();
