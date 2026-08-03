# Muirburn Decision-Support Tool

A geospatial decision-support tool that helps muirburn licence holders in Scotland assess whether a proposed burn site and date comply with the Muirburn Code (Wildlife Management and Muirburn (Scotland) Act 2024).

> **Status:** Early work in progress.

## What this is

A web application that supports practitioners planning to carry out muirburn under Scotland's new licensing system. It combines geospatial analysis with rule-based checks from the Muirburn Code to produce a single compliance checklist before a burn takes place.

The tool helps users:

- Assess whether a proposed burn meets objective requirements in the Muirburn Code.
- Identify remaining manual actions (such as notifications and weather checks).
- Record the evidence used to support operational planning.

## What this is not

This tool does **not** replace official NatureScot guidance, the Muirburn Code, licence conditions, or professional judgement. Users remain responsible for complying with all applicable legislation and official guidance.

## Structure

- `/backend` — FastAPI service providing the rules engine and geospatial analysis.
- `/frontend` — Next.js web application for selecting burn sites and viewing compliance results.

## Rules and Sources

All thresholds and decision rules are sourced from publicly available Muirburn Code and NatureScot guidance.

The backend stores these rules separately from application logic in a versioned YAML ruleset (`/backend/rules/`), making future updates to the Code easier to maintain.

## License

MIT
