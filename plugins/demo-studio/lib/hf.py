#!/usr/bin/env python3
"""One Higgsfield generation, priced first, logged, downloaded.

    hf.py <out-file> <job_type> [--param value | --image path]... [--log CREDITS.md] [--max N]

Runs `higgsfield generate cost` with the same arguments, refuses when the price is above --max
(default: no limit) or above the account balance, then `higgsfield generate create … --wait
--json`, downloads `result_url` to <out-file> and appends one row to the credit log (default
`CREDITS.md` beside <out-file>'s folder). Prints the out-file path and the credits spent.
Arguments after <job_type> are passed to the CLI as they are: check them with
`higgsfield model get <job_type>` first.
"""
import json, os, re, subprocess, sys, urllib.request, datetime


def cli(args, timeout=180):
    try:
        p = subprocess.run(['higgsfield', *args], capture_output=True, text=True, stdin=subprocess.DEVNULL, timeout=timeout)
    except subprocess.TimeoutExpired:
        sys.exit(f'higgsfield {" ".join(args[:3])}… timed out after {timeout}s')
    if p.returncode:
        sys.exit(f'higgsfield {" ".join(args[:3])}… failed:\n{p.stderr.strip() or p.stdout.strip()}')
    return p.stdout


def balance():
    m = re.search(r'([\d.]+) credits', cli(['account', 'status']))
    return float(m.group(1)) if m else None


def main():
    a = sys.argv[1:]
    log, cap = None, None
    if '--log' in a:
        i = a.index('--log'); log = a[i + 1]; del a[i:i + 2]
    if '--max' in a:
        i = a.index('--max'); cap = float(a[i + 1]); del a[i:i + 2]
    if len(a) < 2:
        sys.exit(__doc__)
    out, job, rest = a[0], a[1], a[2:]
    out = os.path.abspath(out)
    log = log or os.path.join(os.path.dirname(os.path.dirname(out)), 'CREDITS.md')

    m = re.search(r'([\d.]+) credits', cli(['generate', 'cost', job, *rest]))
    price = float(m.group(1)) if m else None
    have = balance()
    if price is None:
        sys.exit('could not read the price; check the arguments with `higgsfield model get`')
    if cap is not None and price > cap:
        sys.exit(f'{job} costs {price}, above --max {cap}')
    if have is not None and price > have:
        sys.exit(f'{job} costs {price}, the balance is {have}: stop here')

    res = json.loads(cli(['generate', 'create', job, *rest, '--wait', '--wait-timeout', '20m', '--json'], timeout=1500))
    jobr = res[0] if isinstance(res, list) else res
    if jobr.get('status') != 'completed' or not jobr.get('result_url'):
        sys.exit(f'job {jobr.get("id")} ended {jobr.get("status")}')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    urllib.request.urlretrieve(jobr['result_url'], out)
    after = balance()

    new = not os.path.exists(log)
    with open(log, 'a') as f:
        if new:
            f.write('# Higgsfield credits\n\n| when | job | output | credits | balance after |\n|---|---|---|---|---|\n')
        when = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
        f.write(f'| {when} | {job} | {os.path.relpath(out, os.path.dirname(log))} | {price:g} | {after if after is not None else "?"} |\n')
    print(out, price, 'credits; balance', after)


if __name__ == '__main__':
    main()
