# Gold Bank Helm chart

Same app as the lab 3 manifests: API deployment + service, Postgres deployment + service + PVC,
ConfigMap, Secret, optional Ingress. Plus a pre-upgrade hook and a `helm test` pod.

## version vs appVersion
- `version` (0.1.0) is the version of the **chart** (templates, values structure). Bump it when the chart changes.
- `appVersion` (1.0.0) is the version of the **application image** the chart deploys (`gold-bank:1.0.0`).
  A new image with the same templates changes `appVersion`/`image.tag`, not necessarily `version`.

## Install (namespace is created by Helm, it is not a template)
    minikube image load gold-bank:1.0.0      # and gold-bank:1.1.0 for prod
    helm install gb ./chart -n gold-bank --create-namespace -f chart/values-dev.yaml
    helm install gb ./chart -n gold-bank --create-namespace -f chart/values-prod.yaml \
         --set secret.APP_PASSWORD=<password> --set secret.POSTGRES_PASSWORD=<password>

## Values
| Key | Default | Meaning |
|---|---|---|
| `image.repository` / `image.tag` / `image.pullPolicy` | gold-bank / 1.0.0 / IfNotPresent | app image |
| `app.replicaCount` | 2 | app replicas |
| `app.resources` | 100m/128Mi req, 500m/256Mi lim | app requests and limits |
| `service.type` / `service.port` / `service.nodePort` | NodePort / 3000 / "" (auto) | app service |
| `ingress.enabled` / `ingress.className` / `ingress.host` | false / nginx / gold-bank.local | optional Ingress |
| `config.*` | PORT, NODE_ENV, POSTGRES_USER, POSTGRES_DB | ConfigMap entries |
| `secret.POSTGRES_PASSWORD` / `secret.APP_PASSWORD` | demo values | Secret entries (override with `--set`) |
| `db.image` / `db.replicaCount` / `db.resources` | postgres:16-alpine / 1 | database |
| `persistence.enabled` / `size` / `storageClass` | true / 1Gi / "" | PVC for Postgres (off = emptyDir) |
| `waitImage` | busybox:1.36 | init container, hook and test image |

## Values priority (lowest to highest)
`values.yaml` -> files passed with `-f` (later file wins) -> `--set` flags.

## Test and hook
`helm test gb -n gold-bank` runs a pod that requests the app service.
A `pre-upgrade` Job checks that the db service is reachable before every `helm upgrade`.
