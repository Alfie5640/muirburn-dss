# Muirburn Decision-Support Tool

A geospatial decision-support tool to help muirburn licence holders in Scotland
check whether a proposed burn site and date meet the requirements of the
Muirburn Code (Wildlife Management and Muirburn (Scotland) Act 2024).

**Status:** Early work in progress

## What this is
Web(app) that provides support for people who are planning to carry out muiburn 
to reduce risk of wildfires under the new license. It combines spread out information 
into one checklist and helps users prove compliance with the Muirburn Code.

## What this is not
This tool does not replace official NatureScot guidance, the Muirburn Code
itself, or professional/legal advice. Always refer to the official Code and
NatureScot licensing guidance before making a burn.

## Structure
- `/backend` — FastAPI service running the rules engine and geospatial checks
- `/frontend` — Next.js web app for drawing a site and viewing results

## Rules and sources
All thresholds are sourced directly from the Muirburn Code and NatureScot
guidance. See `/backend/rules/` for the current ruleset and its last
verified date against the live Code

## License
MIT
