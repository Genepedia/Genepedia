# Production hosting and releases

Genepedia and Gravepedia are hosted as static Sites with their custom domains.
Their shared JavaScript API runs as a Worker on ChatGPT Sites at
`https://api.genepedia.org`. GitHub remains the source of record for published
pages, people, memorials, media, and statistics files.

## Production addresses

| Service | URL |
| --- | --- |
| Genepedia | <https://www.genepedia.org/> |
| Gravepedia | <https://www.gravepedia.org/> |
| Genepedia API | <https://api.genepedia.org/v1/genepedia> |
| Gravepedia API | <https://api.genepedia.org/v1/gravepedia> |
| Shared GitHub OAuth callback | <https://api.genepedia.org/v1/auth/github/callback> |

The live API contract is available from [API discovery](https://api.genepedia.org/v1)
and [OpenAPI JSON](https://api.genepedia.org/v1/openapi.json).

## Build and validate

Run the Worker checks from `API/sites-worker`:

```sh
npm run build
npm run validate
```

Build the static frontend assets from each site repository:

```sh
# From the development workspace root containing both repositories:
cd Genepedia
node scripts/build-sites-static.mjs

cd ../Gravepedia
node scripts/build-sites-static.mjs
```

The build scripts exclude secrets and private files. Review the generated
`dist/` directories before publishing them with the matching Sites projects.

## Runtime configuration

The API's runtime secrets are stored in the Sites secret manager, not in Git.
The GitHub App must be installed on the fixed site, database, and media
repositories with the permissions listed in the Worker README. Keep the OAuth
client secret, session-encryption secret, App private key, publish token, and
statistics flush token out of source files, archives, and browser code.

The GitHub OAuth App callback must exactly match
`https://api.genepedia.org/v1/auth/github/callback`. CORS uses the exact
Genepedia and Gravepedia production origins. OAuth `return_to` destinations
must be HTTPS origins on the API allowlist.

## Release checks

After publishing a version, verify the Site's deployment succeeded, then
check both homepages and the corresponding versioned API routes. Exercise
public search and content reads, GitHub sign-in, session restoration and
logout, and the permission gates for edits and review actions. Do not use live
submissions as test data; the Worker validation suite uses mocked GitHub
requests for write-path checks.
