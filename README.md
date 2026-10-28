# Bidwell Trail Checker

Email and text alerts when the Upper Bidwell Park trails in Chico, California open or close.

Live at [chicomtb.com](https://chicomtb.com).

## Features

- Checks the [City of Chico trail status page](https://chico.ca.us/Our-Community/Parks-Recreation-and-Experience-the-Outdoors/Park-Trails/Trail-Gate--Facility-Status-and-Hours/index.html) every 15 minutes
- Email and text alerts when the status changes
- Status history
- Trail map, including trails that stay open during closures

## Tech

- **Server:** Node 22, Express 5, TypeScript, [lowdb](https://github.com/typicode/lowdb) JSON files for storage, nodemailer (Gmail) and Twilio
- **Client:** React 19, MUI, Vite, Leaflet

## Setup

1. Install dependencies:

    ```sh
    npm install
    npm --prefix client install
    ```

2. Copy `.env.example` to `.env` and fill it in (see [Configuration](#configuration)).

## Development

Run the API and the Vite dev server in two terminals:

```sh
npx tsc && PORT=5050 node dist/index.js
```

```sh
API_URL=http://localhost:5050 npm --prefix client start
```

Open the URL Vite prints. The dev server proxies `/api` to `API_URL`, which defaults to port 5000. On macOS that port is taken by AirPlay, so use another one as above.

Run the server tests:

```sh
npm test
```

## Production

Build the client first, since the server build copies it into `dist`:

```sh
npm --prefix client run build
npm run build
npm start
```

Run `npm start` from the project root: the data files below are read from and written to the current directory.

The server listens on `PORT` over plain HTTP. Put a reverse proxy such as [Caddy](https://caddyserver.com) in front of it for HTTPS. The app already trusts `X-Forwarded-For` from a proxy on the same machine.

### Data files

All are created on first use and are not in git. Back them up.

| File | Contents |
|---|---|
| `db.json` | Subscribers (email, phone) |
| `history.json` | Every open/closed status change |

## Configuration

Set in `.env`:

| Variable | Description |
|---|---|
| `PORT` | Port the server listens on (default 5000) |
| `APP_URL` | Public URL of the site, used for links in emails, e.g. `https://chicomtb.com` |
| `TRAIL_STATUS_URL` | City trail status page to check |
| `SMTP_USER`, `SMTP_PWD` | Gmail account and [app password](https://support.google.com/accounts/answer/185833) used to send email |
| `SMTP_FROM_EMAIL` | From address on alerts |
| `SMS_SID`, `SMS_TOKEN`, `SMS_FROM` | Twilio account SID, auth token and sending number (10 digits, no +1) |

`SMTP_HOST` and `SMTP_PORT` are in `.env.example` but not used yet: email currently always goes through Gmail.

## Updating the trail map

- **Trail lines:** `client/public/trails.geojson`, exported from OpenStreetMap with [overpass turbo](https://overpass-turbo.eu). Each feature's `id` is its OSM way id, e.g. `way/421270614`.
- **Names and always-open trails:** `client/src/App/data/trailInfo.ts`, keyed by OSM way id. Tap a trail on the map to see its id.

Trail data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, available under the ODbL.

## Project layout

| Path | Purpose |
|---|---|
| `index.ts` | Express server and public API routes |
| `checker.ts` | Scheduled status checks and notifications |
| `status-parser.ts` | Reads the trail status from the city page |
| `history.ts` | Status change history |
| `email-templates.ts` | HTML and plain-text alert emails |
| `unsubscribe.ts` | Signed unsubscribe links |
| `db.ts` | Subscriber storage |
| `client/` | React front end |

## License

[MIT](LICENSE)
