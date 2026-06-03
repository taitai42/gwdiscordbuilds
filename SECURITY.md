# Security Policy

## Reporting a vulnerability

If you believe you've found a security issue in GW Discord Builds — for
example a way to access another guild's saved builds, an injection in the
template decoder, or a way to make the bot crash a host — please report it
**privately** so we can fix it before disclosure.

Preferred channel:

* GitHub Security Advisories:
  <https://github.com/taitai42/gwdiscordbuilds/security/advisories/new>

Please include:

* A description of the issue and its impact.
* Steps to reproduce (a minimal proof of concept is ideal).
* The version / commit hash of the bot you tested against.

We'll acknowledge receipt within a few days and aim to release a fix or
mitigation in a reasonable timeframe before any public disclosure.

## Scope

In scope:

* The bot source code in this repository.
* The default `docker-compose.yml` setup (bot + MySQL).

Out of scope:

* Discord platform vulnerabilities (report those to Discord directly).
* Issues that require an attacker to already be an instance operator with
  shell access to the host.
* Vulnerabilities in the Guild Wars Wiki or other third-party services.
