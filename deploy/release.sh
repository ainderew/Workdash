#!/bin/sh
# RELEASE_IMAGE is an immutable digest; RELEASE_SHA must match its OCI label.
set -eu
umask 077
trap 'docker logout ghcr.io >/dev/null 2>&1 || true' EXIT
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
for attempt in 1 2 3 4; do
  docker pull "$RELEASE_IMAGE" && break
  [ "$attempt" -lt 4 ] || exit 1
  sleep "$((attempt * 10))"
done
revision=$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$RELEASE_IMAGE")
[ "$revision" = "$RELEASE_SHA" ] || { echo 'Image revision mismatch' >&2; exit 1; }
test -s /root/workdash/.env.frontend
rollback="workdash-frontend-rollback-$(date -u +%Y%m%dT%H%M%SZ)"
had_previous=false
if docker inspect workdash-frontend >/dev/null 2>&1; then
  previous=$(docker inspect --format '{{.Image}}' workdash-frontend)
  docker tag "$previous" "workdash-frontend:$rollback"
  docker stop --time 60 workdash-frontend
  docker rename workdash-frontend "$rollback"
  docker update --restart=no "$rollback" >/dev/null
  had_previous=true
fi
restore() {
  docker rm -f workdash-frontend >/dev/null 2>&1 || true
  if [ "$had_previous" = true ]; then
    docker rename "$rollback" workdash-frontend
    docker update --restart=unless-stopped workdash-frontend >/dev/null
    docker start workdash-frontend
  fi
}
if ! docker run -d --name workdash-frontend --network host --restart unless-stopped \
  --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 \
  -e GIT_SHA="$RELEASE_SHA" --env-file /root/workdash/.env.frontend \
  -e PORT=8080 -e HOSTNAME=127.0.0.1 \
  "$RELEASE_IMAGE"; then
  restore; exit 1
fi
ready=false
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 3 http://127.0.0.1:8080/ >/dev/null; then ready=true; break; fi
  sleep 2
done
if [ "$ready" != true ]; then
  echo 'Release health check failed; restoring previous container' >&2
  restore; exit 1
fi
mkdir -p /root/workdash/releases
printf '%s\n%s\n%s\n' "$RELEASE_SHA" "$RELEASE_IMAGE" "$rollback" > /root/workdash/releases/frontend-current.txt
# Retain rollback images and containers. Prune only after release acceptance.
