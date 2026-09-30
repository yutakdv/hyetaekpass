"""Generate a private local DB secret. Never overwrite an existing secret."""
from pathlib import Path
import os, secrets

path = Path(__file__).with_name('.env')
try:
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
except FileExistsError:
    print('Existing local .env retained')
else:
    with os.fdopen(fd, 'w') as f: f.write('DB_PASSWORD=' + secrets.token_urlsafe(32) + '\n')
    print('Created private local .env')
