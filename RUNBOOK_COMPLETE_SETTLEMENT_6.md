# Runbook: Complete settlement 6 forward (dev) — no DB access required


**Approach:** finish the settlement's normal lifecycle via REST (`PS_TRANSFERS_RESERVED` → `PS_TRANSFERS_COMMITTED` → `SETTLED`), with one ops guardrail (pause the central-ledger timeout handler during the run).
**Note:** Please note, this is not abort and redo, but rather complete via API.

---

## 1. Background — read before executing

- On **2026-07-06** settlement 6 was created and advanced to `PS_TRANSFERS_RECORDED`. A subsequent `PUT` tried to jump accounts straight to `PS_TRANSFERS_COMMITTED`, skipping `PS_TRANSFERS_RESERVED`. The state machine rejected every account (error `3000 – State change not allowed`) and **wrote nothing** — the settlement has been parked, healthy but incomplete, at `PS_TRANSFERS_RECORDED` ever since.
- The state ladder is strict and settlement-level: `PENDING_SETTLEMENT → PS_TRANSFERS_RECORDED → PS_TRANSFERS_RESERVED → PS_TRANSFERS_COMMITTED → SETTLED`. Each `PUT` may only request the next rung, and the settlement-level state advances only when **all** accounts reach it — so every payload below includes every account.
- **Why the timeout handler must be paused:** the `RECORDED` step created real ledger transfers with a 5-day expiration that lapsed on ~2026-07-11. The settlement service itself ignores expiry (its queries check which state rows exist, not the latest state or the clock — `src/models/settlement/facade.js:254-276` and `:581-603` — which is why this recovery works at all). But central-ledger's **timeout handler** sweeps any transfer whose *latest* state is `RECEIVED_PREPARE` or `RESERVED` past its expiration. The moment step 3 reserves the transfers, they become sweep-eligible again; a sweep between reserve and commit would fire position reversals against the run. Pausing the handler removes the race entirely. After commit the transfers are terminal (`COMMITTED`) and permanently invisible to the sweep — the handler can then be restored.
- **No hard countdown while the pause holds.** "Back-to-back" execution of steps 3–5 minimizes how long the pause lasts (timeout enforcement is suspended environment-wide while paused) and limits exposure to an accidental un-pause — it is not a deadline. Verify each step properly; do not rush past a failed check.
- **HTTP 200 does not mean success.** This API reports failures per account inside the body. After every `PUT`, success means: `HTTP 200`, no `errorInformation` on any account, **and** the top-level `state` advanced.
- **Retries are safe, including the NDC side effect.** Each `PUT` executes as a single DB transaction (`facade.js:786`) — a thrown error rolls back everything, so a failed step leaves no partial ledger state. On re-run, accounts already at the requested state take a no-op path, and the ledger operations select only transfers that still lack the target state row (`:258-276`, `:585-603`) — so position changes and net-debit-cap adjustments cannot be applied twice.
- **Version pinning:** every behavioral claim above was verified against **central-settlement 17.4.0** (this repo) with bundled **@mojaloop/central-ledger v19.14.0**. Before relying on them, confirm the deployed image matches (Phase 0b). If the environment runs something materially older/newer, stop and re-verify the cited code paths first.

## 2. What you need

- HTTP access to the **central-settlement API** (port `3007`, base path `/v2`). In-cluster: `http://<release>-centralsettlement-service:3007/v2` (or `kubectl port-forward svc/<release>-centralsettlement-service 3007:3007 -n <ns>`). docker-compose: `http://localhost:3007/v2`.
- HTTP access to the **central-ledger admin API** (port `3001`) — read-only use for baseline/reconciliation, plus the optional NDC restore.
- **Auth:** dev deployments are typically unauthenticated. If yours fronts these APIs with a gateway/token/mTLS, add the required auth to every `curl` below before starting — a `401`/`403` on the pre-flight GET is your signal.
- Ops access to stop/start the central-ledger timeout handler (kubectl or docker-compose), including rights to suspend any GitOps auto-sync or HPA that would undo the pause.
- `curl` and `jq`.
- An otherwise **quiet environment**: pause any load generators/TTK test runs for the duration, or the position reconciliation in Phase 3 will be polluted by unrelated traffic.
- **Escalation contact:** `<fill in: settlement owner / team channel>` — required before starting; the failure playbook routes here.

```bash
BASE=http://<central-settlement-host>:3007/v2     # central-settlement API
LEDGER=http://<central-ledger-host>:3001          # central-ledger admin API
```

## 3. Phase 0 — pre-flight (read-only)

### 0a. Settlement state and identity

```bash
curl -s $BASE/settlements/6 | tee preflight.json | jq '{state, accounts: [.participants[].accounts[] | {id, state, amount: .netSettlementAmount.amount}]}'
```

Expected: top-level `state = "PS_TRANSFERS_RECORDED"`, and exactly these 10 accounts, all in `PS_TRANSFERS_RECORDED` (amounts are your cross-check that this is the right settlement — they sum to zero):

| participant | account | net amount (PHP) | direction |
|---|---|---|---|
| 3 | 3 | −14000 | net recipient |
| 5 | 7 | +14000 | net sender |
| 8 | 13 | −5000 | net recipient |
| 9 | 15 | −2700 | net recipient |
| 10 | 18 | −400 | net recipient |
| 11 | 20 | +3000 | net sender |
| 12 | 21 | +4500 | net sender |
| 13 | 23 | +300 | net sender |
| 14 | 25 | +500 | net sender |
| 15 | 27 | −200 | net recipient |

**Decision gate on the observed state:**

| GET shows | Action |
|---|---|
| `PS_TRANSFERS_RECORDED` (all accounts) | Proceed from step 3 |
| `PS_TRANSFERS_RESERVED` (all accounts reserved) | Someone advanced it; proceed from step 4 |
| `PS_TRANSFERS_COMMITTED` | Proceed from step 5 |
| `SETTLED` | Done; skip to Phase 3 |
| Mixed account states within one rung | Re-run the `put` for that rung (safe), verify, continue |
| `ABORTED`, or anything else / accounts don't match the table | **STOP.** Save `preflight.json`, escalate |

**Never abort this settlement once step 3 has succeeded** — aborting from `PS_TRANSFERS_RESERVED` hits a known bug that silently skips reversing position changes. From `RESERVED` onward the only safe direction is forward.

### 0b. Version pin

```bash
# K8s: image tag should correspond to central-settlement 17.x (analysis done on 17.4.0)
kubectl get deploy -n <ns> -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.template.spec.containers[0].image}{"\n"}{end}' | grep -i settlement
# docker-compose:
docker ps --format '{{.Names}}\t{{.Image}}' | grep -i settlement
```

If the deployed version differs materially from 17.x, stop and get the behavioral claims re-verified before proceeding.

### 0c. Service health

```bash
curl -s $BASE/../health | jq .        # central-settlement
curl -s $LEDGER/health | jq .        # central-ledger admin
```

Both must report healthy (central-settlement's health includes its Kafka producer — a broken broker fails step 3 cleanly via rollback, but find out now, not mid-run).

### 0d. Baseline capture — positions and net debit caps

The reserve step adjusts real positions, and if the settlement model has `requireLiquidityCheck` enabled it may **permanently auto-raise** a net recipient's `NET_DEBIT_CAP` (`facade.js:304-330` — nothing in commit/settle restores it). Capture the baseline so Phase 3 can reconcile money, not just states:

```bash
mkdir -p baseline
curl -s $LEDGER/participants | jq '[.[] | {name, id}]' | tee baseline/participants.json
for P in $(jq -r '.[].name' baseline/participants.json); do
  curl -s "$LEDGER/participants/$P/positions?currency=PHP" > "baseline/pos_before_$P.json"
  curl -s "$LEDGER/participants/$P/limits?currency=PHP&type=NET_DEBIT_CAP" > "baseline/ndc_before_$P.json"
done
```

Keep the mapping of participant ids (3, 5, 8, 9, 10, 11, 12, 13, 14, 15) to names from `participants.json` — Phase 3 compares per name.

## 4. Phase 1 — pause the central-ledger timeout handler (and keep it paused)

Pick the variant matching the deployment, and note what you changed:

- **Helm/K8s:** `kubectl get deploy -n <ns> | grep -i timeout` → typically `<release>-centralledger-handler-timeout`, then `kubectl scale deploy <name> --replicas=0 -n <ns>`
- **docker-compose:** if the timeout handler runs as its own container, stop it; if central-ledger runs handlers in one process, restart it with `CLEDG_HANDLERS_TIMEOUT_DISABLED=true`. (This restart does **not** disrupt steps 3–5: the settlement `PUT`s are served by central-settlement, which writes the shared DB directly and produces its own Kafka notifications — central-ledger's process is not in that request path. Still, finish the restart before Phase 2.)

Then make sure the pause **sticks**:

1. **Reconcilers:** if the namespace is managed by Argo CD / Flux with auto-sync, suspend sync for the central-ledger app first (`argocd app set <app> --sync-policy none` / `flux suspend hr <name>`), or the scale-to-zero will be reverted — possibly mid-run.
2. **Autoscalers:** `kubectl get hpa -n <ns> | grep -i timeout` — if an HPA targets the deployment with `minReplicas ≥ 1`, suspend/delete it for the duration.
3. **Verify drained:** `kubectl get pods -n <ns> | grep -i timeout` must return nothing (wait out `Terminating`).
4. **Re-verify** (same pod check) immediately before step 3 and again right after step 4 — if a pod reappeared mid-run, stop after the current step completes and re-pause before continuing.

If no timeout handler runs in this environment at all, note that and proceed — the race it prevents can't occur (and don't start one until Phase 3).

## 5. Phase 2 — walk the settlement forward

Save the payload template and helpers (all 10 accounts; the original incident payload had a duplicate participant-8 entry — this one is already deduplicated):

```bash
cat > /tmp/s6.json <<'EOF'
{ "participants": [
  {"id":3,"accounts":[{"id":3,"state":"__STATE__","reason":"__REASON__"}]},
  {"id":5,"accounts":[{"id":7,"state":"__STATE__","reason":"__REASON__"}]},
  {"id":8,"accounts":[{"id":13,"state":"__STATE__","reason":"__REASON__"}]},
  {"id":9,"accounts":[{"id":15,"state":"__STATE__","reason":"__REASON__"}]},
  {"id":10,"accounts":[{"id":18,"state":"__STATE__","reason":"__REASON__"}]},
  {"id":11,"accounts":[{"id":20,"state":"__STATE__","reason":"__REASON__"}]},
  {"id":12,"accounts":[{"id":21,"state":"__STATE__","reason":"__REASON__"}]},
  {"id":13,"accounts":[{"id":23,"state":"__STATE__","reason":"__REASON__"}]},
  {"id":14,"accounts":[{"id":25,"state":"__STATE__","reason":"__REASON__"}]},
  {"id":15,"accounts":[{"id":27,"state":"__STATE__","reason":"__REASON__"}]}
]}
EOF
put() {  # usage: put STATE "Reason" outfile.json
  sed -e "s/__STATE__/$1/g" -e "s/__REASON__/$2/g" /tmp/s6.json \
  | curl -sS -o "$3" -w "HTTP %{http_code}\n" -X PUT "$BASE/settlements/6" \
      -H 'Content-Type: application/json' -d @- ; }
check() {  # usage: check outfile.json
  jq '{state, errors: [.participants[]?.accounts[]? | select(.errorInformation) | {id, err: .errorInformation.errorDescription}]}' "$1" \
  || { echo '--- non-JSON response body: ---'; cat "$1"; } ; }
```

Every step: expect the `put` to print `HTTP 200` and the `check` to show the advanced `state` with `errors: []`. A non-200 or a raw/HTML body means the request failed as a whole (nothing was applied — see playbook).

### Step 3 — Reserve

```bash
put PS_TRANSFERS_RESERVED "Transfers reserved" step3.json && check step3.json
```

- **Expect:** `HTTP 200`, `state: "PS_TRANSFERS_RESERVED"`, `errors: []`.
- Under the hood: ledger transfers are stamped `RESERVED`; **net recipients'** positions are adjusted; if the settlement model has `requireLiquidityCheck` and a recipient's `NET_DEBIT_CAP` would be exceeded, the service raises the cap automatically (permanent — reconciled in Phase 3; cannot stack on retries); position-change notifications are produced to Kafka.

### Step 4 — Commit (next, without unnecessary delay)

```bash
put PS_TRANSFERS_COMMITTED "Transfers committed" step4.json && check step4.json
```

- **Expect:** `HTTP 200`, `state: "PS_TRANSFERS_COMMITTED"`, `errors: []`.
- The race-sensitive window ends here: transfers are now terminal and the timeout sweep can never match them again. (Re-run the Phase 1 pod check now.) **Net senders'** positions were adjusted in this step.

### Step 5 — Settle

```bash
put SETTLED "Settled" step5.json && check step5.json
```

- **Expect:** `HTTP 200`, `state: "SETTLED"`, `errors: []`. (`SETTLING` means only part of the accounts settled — re-run this step, it's safe.)

## 6. Phase 3 — verify, reconcile, restore

### 6a. States

```bash
curl -s $BASE/settlements/6 | jq '{state, windows: [.settlementWindows[] | {id: .settlementWindowId? // .id, state}]}'
```

Settlement `state = SETTLED`; its settlement windows show `SETTLED` as well.

### 6b. Money — position reconciliation

```bash
for P in $(jq -r '.[].name' baseline/participants.json); do
  curl -s "$LEDGER/participants/$P/positions?currency=PHP" > "baseline/pos_after_$P.json"
done
```

For each of the 10 participants, `PHP position delta (after − before)` must equal **minus the net amount** in the Phase 0 table — i.e. positions move back toward zero by exactly the settled amount:

| participant | expected position delta |
|---|---|
| 3 | +14000 |
| 5 | −14000 |
| 8 | +5000 |
| 9 | +2700 |
| 10 | +400 |
| 11 | −3000 |
| 12 | −4500 |
| 13 | −300 |
| 14 | −500 |
| 15 | +200 |

Participants outside the settlement must show delta 0 (if not, unrelated traffic ran mid-exercise — note it and judge the 10 deltas accordingly). Any mismatch on the 10: **do not "fix" anything** — collect the files and escalate.

### 6c. Net debit caps

Compare `ndc_before_*` with a fresh capture. If any cap was auto-raised: record it in the ops note, and **restore the captured value unless the team explicitly decides to keep the raise** (default: restore, so later test assumptions aren't silently changed):

```bash
curl -sS -X PUT "$LEDGER/participants/<name>/limits" -H 'Content-Type: application/json' \
  -d '{"currency":"PHP","limit":{"type":"NET_DEBIT_CAP","value":<captured-before-value>,"alarmPercentage":<captured-before-alarmPercentage>}}'
```

### 6d. Restore the environment

- Reverse Phase 1: scale the timeout handler back up (or remove the env var and restart), resume GitOps sync / re-enable the HPA, confirm the pod is Running.
- Resume any load generators you paused.
- Keep `preflight.json`, `step3–5.json`, and `baseline/` with the ops note (who/when/what was restored).

## 7. Failure playbook

**Rule: on any unexpected result, stop, keep the response file, escalate to `Juan Correa via Slack`. Do not abort the settlement, do not touch the DB.** Every rung of the ladder is a valid resting point — with the handler paused, the state cannot get messed up.

| Symptom | Meaning / action |
|---|---|
| `put` prints non-200 / `check` shows raw HTML or stack trace | The whole request failed and **nothing was applied** (single-transaction rollback). Inspect central-settlement logs, fix, re-run the same step. |
| Account shows `State change not allowed` | Payload state isn't the settlement's next rung. Re-GET, re-check the decision gate, use the matching step. |
| Account shows `Account already processed once` | Duplicate account entry in payload — should not happen with the template; fix payload, re-run. |
| `Account not found` / `Participant and account mismatch` | Wrong ids — re-derive the payload from the GET response. |
| HTTP 5xx on reserve or commit | Most likely the Kafka producer (notifications are emitted inside the transaction; the step rolled back). Fix broker/service health, re-run the same `put`. |
| `state` didn't advance but `errors: []` | One or more accounts missing from the payload (settlement advances only when *all* accounts reach the rung). Compare GET account list vs payload. |
| Timeout-handler pod reappeared mid-run | Finish the in-flight step, verify its result, re-pause (incl. reconciler/HPA), re-verify drained, continue. |

**If you get stranded at `RESERVED`** (step 4 keeps failing): this state is stable for as long as the pause holds — nothing else advances or reverts it. The cost of holding is environment-wide: transfer-timeout enforcement is suspended while the handler is down, which a dev environment tolerates for hours or days. The exit rules are: (1) never restore the timeout handler while parked at `RESERVED`; (2) fix the blocking dependency and resume step 4 — retries are safe; (3) if forward progress is genuinely impossible, leave the pause in place and hand over to the settlement owner — the last-resort remediation is DB-level and deliberately not part of this runbook.

Fallback if step 3 has **not** yet succeeded and keeps failing (settlement still `PS_TRANSFERS_RECORDED`): contact me.

---

*Code references (verified on central-settlement 17.4.0, bundled @mojaloop/central-ledger v19.14.0): transition validation `src/models/settlement/facade.js:965-969`; single-transaction PUT `:786`; reserve/commit selection `:254-276`, `:581-603`; NDC auto-raise `:304-330` (sole `adjustLimits` call site — never restored by commit/settle); settlement-level state advance `:1174-1198`; timeout sweep criteria `central-ledger src/models/transfer/facade.js:952-967`.*
