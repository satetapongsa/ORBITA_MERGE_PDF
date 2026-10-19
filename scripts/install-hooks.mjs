// Installs the pre-commit secret check into .git/hooks (runs on `npm install`).
import fs from 'node:fs';

if (fs.existsSync('.git/hooks')) {
  fs.writeFileSync('.git/hooks/pre-commit', '#!/bin/sh\nnode scripts/check-secrets.mjs\n', { mode: 0o755 });
}
