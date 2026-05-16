const bcrypt = require('bcryptjs');

(async () => {
  const passwords = ['DYN#Owner2026', 'DYN#Exec2026', 'DYN#Manager2026', 'DYN#Cashier2026'];
  for (const pass of passwords) {
    const hash = await bcrypt.hash(pass, 10);
    console.log(pass, '=>', hash);
  }
})();
