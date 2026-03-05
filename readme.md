# Substitute File Hashes

GitHub Action to replace `${{ hashFile('filepath') }}` with actual file hashes in files matching a glob pattern.

**Use cases**

You have a configuration file or a Kubernetes manifest where you need to embed the hash of another file (like a ConfigMap or Secret data file) to trigger rollouts when the file changes.

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        config-hash: ${{ hashFile('config/settings.json') }}
```

After running this action, it will be transformed to:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        config-hash: 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
```

**Workflow YAML**

```yaml
- name: Substitute File Hashes
  uses: faradaytrs/substitute-file-hashes@v1.0.0
  with:
    # Glob pattern for files to process
    files: '**/*.yaml'

    # (Optional) Hashing algorithm from Node.js crypto API. Default is sha256.
    algorithm: sha256
```
