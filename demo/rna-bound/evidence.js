// Selected archive fields and verbatim excerpts from rna-bound-search/run-20261030-a.
const rnaArchive = {
  "baseline": "0.18740125894339238",
  "proofs": {
    "002": {
      "target_id": "52",
      "valid": true,
      "complete": true,
      "probability_upper": "0.187394674945934510160970205464357324627986052364843902975887",
      "certificate_sha256": "0b1ba03d41eaf8388ef0efcde2e449d60ed9b76b6538db4c916e55042d567522",
      "components": [
        {
          "rivals": 11,
          "visited": 84934656,
          "assignment_count": 84934656,
          "upper": "0.18762786339411241510483256005026066032028085018905859665000408694"
        },
        {
          "rivals": 15,
          "visited": 147456,
          "assignment_count": 147456,
          "upper": "0.99958555352636864951873961307637964901584486088876532504900983493"
        },
        {
          "rivals": 15,
          "visited": 147456,
          "assignment_count": 147456,
          "upper": "0.99958555352636864951873961307637964901584486088876532504900983493"
        },
        {
          "rivals": 15,
          "visited": 147456,
          "assignment_count": 147456,
          "upper": "0.99958555352636864951873961307637964901584486088876532504900983493"
        }
      ]
    },
    "003": {
      "target_id": "52",
      "valid": true,
      "complete": true,
      "probability_upper": "0.157789052212349376322719268670872373734460128287750421563689",
      "certificate_sha256": "e0dcd9f2410e27afd6269ec690116eedaa8cba0f31d9d2253b45d1a35e618ba5",
      "components": [
        {
          "rivals": 12,
          "visited": 8153726976,
          "assignment_count": 8153726976,
          "upper": "0.15798540029019884469732638314384857587940195993003648555725225993"
        },
        {
          "rivals": 15,
          "visited": 147456,
          "assignment_count": 147456,
          "upper": "0.99958555352636864951873961307637964901584486088876532504900983493"
        },
        {
          "rivals": 15,
          "visited": 147456,
          "assignment_count": 147456,
          "upper": "0.99958555352636864951873961307637964901584486088876532504900983493"
        },
        {
          "rivals": 15,
          "visited": 147456,
          "assignment_count": 147456,
          "upper": "0.99958555352636864951873961307637964901584486088876532504900983493"
        }
      ]
    },
    "004": {
      "target_id": "52",
      "valid": true,
      "complete": true,
      "probability_upper": "0.157700066923103674259024359201070225352433106646429741132363",
      "certificate_sha256": "be1ba331656eb51d00a82c56e4f9a9f0dd78a888aa172191cad6ed4916d25dd5",
      "components": [
        {
          "rivals": 14,
          "visited": 8153726976,
          "assignment_count": 8153726976,
          "upper": "0.15789630427026393893034191511704884193472852305665652284576830279"
        },
        {
          "rivals": 15,
          "visited": 147456,
          "assignment_count": 147456,
          "upper": "0.99958555352636864951873961307637964901584486088876532504900983493"
        },
        {
          "rivals": 15,
          "visited": 147456,
          "assignment_count": 147456,
          "upper": "0.99958555352636864951873961307637964901584486088876532504900983493"
        },
        {
          "rivals": 15,
          "visited": 147456,
          "assignment_count": 147456,
          "upper": "0.99958555352636864951873961307637964901584486088876532504900983493"
        }
      ]
    },
    "replay": {
      "target_id": "52",
      "valid": true,
      "complete": true,
      "probability_upper": "0.157700066923103674259024359201070225352433106646429741132363",
      "certificate_sha256": "be1ba331656eb51d00a82c56e4f9a9f0dd78a888aa172191cad6ed4916d25dd5",
      "components": [
        {
          "rivals": 14,
          "visited": 8153726976,
          "assignment_count": 8153726976,
          "upper": "0.15789630427026393893034191511704884193472852305665652284576830279"
        },
        {
          "rivals": 15,
          "visited": 147456,
          "assignment_count": 147456,
          "upper": "0.99958555352636864951873961307637964901584486088876532504900983493"
        },
        {
          "rivals": 15,
          "visited": 147456,
          "assignment_count": 147456,
          "upper": "0.99958555352636864951873961307637964901584486088876532504900983493"
        },
        {
          "rivals": 15,
          "visited": 147456,
          "assignment_count": 147456,
          "upper": "0.99958555352636864951873961307637964901584486088876532504900983493"
        }
      ]
    }
  },
  "records": {
    "backupJobStart": {
      "path": "events.jsonl · jobs/186.command.txt",
      "excerpt": "{\"time\":\"2026-10-30T17:47:35.985Z\",\"event\":\"job_started\",\"id\":186}\n/work/search3/checkall.py"
    },
    "backupJob": {
      "path": "events.jsonl",
      "excerpt": "{\"time\":\"2026-10-30T17:51:45.761Z\",\"event\":\"job_finished\",\"id\":186,\"code\":137}"
    },
    "clock": {
      "path": "deadline.json",
      "excerpt": "{\n  \"started_utc\": \"2026-10-30T15:49:33.216Z\",\n  \"deadline_utc\": \"2026-10-30T20:49:33.216Z\"\n}"
    },
    "sql": {
      "path": "run.ts · preflight/check-result.json",
      "excerpt": "select name,usable from tool where name in ('run_command','job_status','verify','submit')\n\n{\n  \"count\": 4,\n  \"rows\": [\n    {\n      \"name\": \"job_status\",\n      \"usable\": 1\n    },\n    {\n      \"name\": \"run_command\",\n      \"usable\": 1\n    },\n    {\n      \"name\": \"submit\",\n      \"usable\": 1\n    },\n    {\n      \"name\": \"verify\",\n      \"usable\": 1\n    }\n  ]\n}"
    },
    "preflight": {
      "path": "preflight/check-result.json",
      "excerpt": "{\n  \"passed\": true,\n  \"model_calls\": 0\n}"
    },
    "targets": {
      "path": "targets-frozen.json",
      "excerpt": "[\n  {\n    \"id\": \"52\",\n    \"name\": \"[RNA] Repetitious Sequences 8/10\",\n    \"length\": 80,\n    \"paper_display_bound\": \"0.1874\",\n    \"author_cache_baseline\": \"0.18740125894339238\"\n  },\n  {\n    \"id\": \"61\",\n    \"name\": \"Chicken feet\",\n    \"length\": 67,\n    \"paper_display_bound\": \"0.1336\",\n    \"author_cache_baseline\": \"0.13368987270026328\"\n  }\n]"
    },
    "load": {
      "path": "jobs/3.command.txt",
      "excerpt": "cat /reference/targets-frozen.json 2>/dev/null | head -200"
    },
    "domain": {
      "path": "work/trial-001/component-0-group-0/input.json",
      "excerpt": "{\n  \"assignment_count\": 8153726976\n}"
    },
    "noReport": {
      "path": "jobs/40.log",
      "excerpt": "---\ntotal 88\ndrwxrwxrwx 1 1000 1000  4096 Oct 30 15:53 .\ndrwxrwxrwx 1 1000 1000  4096 Oct 30 15:53 ..\n-rwxrwxrwx 1 1000 1000 87112 Oct 30 15:53 input.json\n---ps"
    },
    "backup": {
      "path": "jobs/60.log",
      "excerpt": "len 67"
    },
    "began001": {
      "path": "events.jsonl",
      "excerpt": "{\n  \"time\": \"2026-10-30T15:53:30.104Z\",\n  \"event\": \"job_started\",\n  \"id\": 36\n}"
    },
    "began003": {
      "path": "events.jsonl",
      "excerpt": "{\n  \"time\": \"2026-10-30T16:24:52.645Z\",\n  \"event\": \"job_started\",\n  \"id\": 68\n}"
    },
    "began004": {
      "path": "events.jsonl",
      "excerpt": "{\n  \"time\": \"2026-10-30T17:42:00.560Z\",\n  \"event\": \"job_started\",\n  \"id\": 180\n}"
    },
    "phase2": {
      "path": "events.jsonl",
      "excerpt": "{\n  \"time\": \"2026-10-30T16:52:27.964Z\",\n  \"event\": \"task_started\",\n  \"id\": \"rna-bound-search-002\",\n  \"remaining_seconds\": 14225\n}"
    },
    "phase3": {
      "path": "events.jsonl",
      "excerpt": "{\n  \"time\": \"2026-10-30T17:24:44.705Z\",\n  \"event\": \"task_started\",\n  \"id\": \"rna-bound-search-003\",\n  \"remaining_seconds\": 12288\n}"
    },
    "recovery2": {
      "path": "recovery-history/20261030T165225Z/recovery.json",
      "excerpt": "{\n  \"utc\": \"2026-10-30T16:52:25.679769+00:00\",\n  \"reason\": \"ask#113 stuck after transport timeout with no proxy dispatch; no active model request or solver\",\n  \"checker_unchanged\": true,\n  \"old_database_preserved\": \"engine/data/h2h.sqlite and WAL\"\n}"
    },
    "recovery3": {
      "path": "recovery-history/20261030T172437Z/recovery.json",
      "excerpt": "{\n  \"utc\": \"2026-10-30T17:24:37.280004+00:00\",\n  \"reason\": \"After job108 returned, next model call did not reach dispatch; large-request early response/body-drain deadlock suspected. Repeated output degeneration documented in requests 70/75/77.\",\n  \"checker_unchanged\": true,\n  \"all_old_databases_preserved\": true\n}"
    },
    "split": {
      "path": "work/search2/A.log · work/search2/B.log",
      "excerpt": "tag A assign 84934656 nvar 12\ntag A min 1.0035716540285307 ub 0.49910867823934585 sec 3.2\n\nAssertionError: boundary pair removed"
    },
    "guard": {
      "path": "checker/check.py",
      "excerpt": "assert proof['complete'] and proof['visited']==payload['assignment_count']==proof['assignment_count'],'incomplete proof'"
    },
    "round": {
      "path": "checker/check.py",
      "excerpt": "  ctx.prec=60;ctx.rounding=ROUND_CEILING\n  total=Decimal(1)\n  for c in components:total*=Decimal(c['probability_upper'])\n  total=min(total,Decimal(1))"
    },
    "receipt002": {
      "path": "verifier-events.jsonl",
      "excerpt": "{\n  \"checked_utc\": \"2026-10-30T16:19:49.149Z\",\n  \"target_id\": \"52\",\n  \"valid\": true,\n  \"complete\": true,\n  \"probability_upper\": \"0.187394674945934510160970205464357324627986052364843902975887\",\n  \"certificate_sha256\": \"0b1ba03d41eaf8388ef0efcde2e449d60ed9b76b6538db4c916e55042d567522\"\n}"
    },
    "receipt003": {
      "path": "verifier-events.jsonl",
      "excerpt": "{\n  \"checked_utc\": \"2026-10-30T16:43:25.758Z\",\n  \"target_id\": \"52\",\n  \"valid\": true,\n  \"complete\": true,\n  \"probability_upper\": \"0.157789052212349376322719268670872373734460128287750421563689\",\n  \"certificate_sha256\": \"e0dcd9f2410e27afd6269ec690116eedaa8cba0f31d9d2253b45d1a35e618ba5\"\n}"
    },
    "stop": {
      "path": "final/early-stop.json",
      "excerpt": "{\n  \"stopped_utc\": \"2026-10-30T17:56:55.622151+00:00\",\n  \"reason\": \"user_authorized_early_closeout_after_primary_goal_achieved\"\n}"
    },
    "usage": {
      "path": "final/usage-at-stop.json",
      "excerpt": "{\n  \"requests\": 337,\n  \"receipted_requests\": 336,\n  \"recorded_cost_usd\": \"1.017070052\",\n  \"no_cost_receipt_request_ids\": [\n    318\n  ]\n}"
    },
    "finished": {
      "path": "completion.json",
      "excerpt": "{\n  \"final_verification_finished_utc\": \"2026-10-30T18:08:52.261785+00:00\",\n  \"results\": [\n    {\n      \"target_id\": \"52\",\n      \"author_cache_baseline\": \"0.18740125894339238\",\n      \"independently_certified_campaign_bound\": \"0.157700066923103674259024359201070225352433106646429741132363\",\n      \"strict_success_against_both_references\": true\n    },\n    {\n      \"target_id\": \"61\",\n      \"author_cache_baseline\": \"0.13368987270026328\",\n      \"independently_certified_campaign_bound\": null,\n      \"strict_success_against_both_references\": false\n    }\n  ]\n}"
    }
  }
};
