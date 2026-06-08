# Deployment & Server Setup (internal)

This document contains the technical steps and examples required to deploy
the Genepedia API endpoints and make the GitHub OAuth login flow work in
production. Keep these details out of the public-facing `README.md`.

Overview
 - Deploy the PHP files from the sibling `API` repository to a web host
   that serves them under a dedicated host or path (the sites expect endpoints like
   `/genepedia/github-session.php`).
 - Provide a `GITHUB_CLIENT_SECRET` (server-only secret) and any optional
   environment overrides described below.
 - Ensure the API host runs over HTTPS and that the webserver correctly
   passes `.php` requests to PHP-FPM (or use FrankenPHP if you prefer a
   single binary for simple deployments).

Prerequisites
 - PHP 8.1+ with `curl`, `json`, and `session` extensions available.
 - A running PHP-FPM instance (or a FrankenPHP binary for ad-hoc hosts).
 - HTTPS (Let's Encrypt or equivalent) for the API host; cookies with
   `SameSite=None` require `Secure` and thus HTTPS.

Environment variables
Required
 - `GITHUB_CLIENT_SECRET` — the GitHub OAuth app secret (server-side only).

Optional (recommended)
 - `GITHUB_API_TOKEN` — personal access token with read access to the Genepedia
   repository. Used by `github-file-commits.php` for server-side commit history
   (5,000 requests/hour instead of the unauthenticated 60/hour browser limit).
 - `GITHUB_REPO` — repository slug for commit history (default `Genepedia/Genepedia`).
 - `GITHUB_CLIENT_ID` — override the built-in default client ID if needed.
 - `GITHUB_ALLOWED_RETURN_ORIGINS` — comma-separated allowed origins that
   may be passed as `return_to` in the login flow. Example:
  `https://genepedia.org,https://www.genepedia.org,https://api.shaunroselt.com`
 - `GITHUB_ALLOWED_CORS_ORIGINS` — comma-separated CORS origins allowed to
   call the API from the browser (must match front-end origin).
 - `GITHUB_DEFAULT_RETURN_TO` — the default page to land on after login.
 - `GITHUB_SESSION_SAMESITE` — `None|Lax|Strict` to override cookie SameSite.

Files to deploy from `/home/deck/Documents/Development/Genepedia/API`
 - `github-auth.php`
 - `github-login.php`
 - `github-callback.php`
 - `github-session.php`
 - `github-logout.php`
 - `github-file-commits.php`
 - `github-file-commit-diff.php`

Recommended deployment layout
 - Copy the contents of the `API` repository to `/var/www/genepedia/`
   on the API host. The API endpoints should be
  reachable at `https://api.shaunroselt.com/genepedia/{file}.php`.

Nginx example (serve API files under `/genepedia`)

Place the API files at `/var/www/genepedia` (so `github-session.php`
is at `/var/www/genepedia/github-session.php`) and use an Nginx server
block like this (adapt `fastcgi_pass` to your PHP-FPM socket):

```nginx
server {
  listen 80;
  server_name api.shaunroselt.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl;
  server_name api.shaunroselt.com;

  ssl_certificate /etc/letsencrypt/live/api.shaunroselt.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.shaunroselt.com/privkey.pem;

    root /var/www/genepedia;
    index index.php index.html;

    location /genepedia/ {
        try_files $uri $uri/ =404;
    }

    location ~ ^/genepedia/.*\.php$ {
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        include fastcgi_params;
        fastcgi_pass unix:/run/php/php8.1-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;
    }

    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

GitHub OAuth app settings
 - Homepage URL: `https://www.genepedia.org/` (matching the live public site)
 - Authorization callback URL: `https://api.shaunroselt.com/genepedia/github-callback.php`

Verification checklist
 - Ensure `GITHUB_CLIENT_SECRET` is set in the environment and visible
   to the PHP process (systemd units, process manager, or exported in the
   shell that launches FrankenPHP/PHP-FPM).
 - Visit `https://api.shaunroselt.com/genepedia/github-session.php`
   — it should return JSON with `"configured": true` when the secret
   is present.
 - From your public site (`https://genepedia.org`) click the login
   button and complete the OAuth approval; confirm the header updates
   to show the logged-in user avatar and name.

Troubleshooting
 - If cookies don't persist after the redirect, confirm:
   - The API host is HTTPS and `GITHUB_SESSION_SAMESITE=None` is set.
   - `Access-Control-Allow-Origin` is echoing the requesting origin and
     `Access-Control-Allow-Credentials: true` is present (the backend's
     `github_apply_cors()` handles this when `GITHUB_ALLOWED_CORS_ORIGINS`
     contains the front-end origin).

 - If `token` exchange fails, check that the `GITHUB_CLIENT_SECRET` is
   correct and that the server can make outbound HTTPS requests to
   `https://github.com/login/oauth/access_token`.

If you'd like, I can also provide a systemd unit for running FrankenPHP
on the API host for a simple single-binary deployment.
