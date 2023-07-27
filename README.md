# ensure-dir-cached

  * native ESM, type: module (.mjs)
  * Ensures pre-existing dirs already exists
  * Ensures path to create exists or creates it
  * Periodic dir specified with Luxon format string
  * Caches path:dir with TTL and maxEntries avoiding unnecessarily filesystem access

# Usage

```javascript
import EnsureDirCached from 'ensure-path-cached.mjs'

const ensureDirCached = new EnsureDirCached()

try {
  // preExistingPath is optional and defaults to process.cwd()
  await ensureDirCached.ensurePathExists(pathPrefixToCreate, preExistingPath)
  /*
   * OR
   * 
   * <pre>
   * properties = {
   *   preExistingPathPrefix: <String>, // optional path prefix must exist and must not end with / or throws Error, default process.cwd()
   *   pathPrefixToCreate: '/fubar', // optional path relative to preExistingPath must start with /, default ''
   *   date: <Date>, // optional date for computing periodic dir, default now in UTC
   *   dateTimeFormatString: 'yyyyMMdd', // optional luxon format string, default yyyyMMdd
   * }
   * </pre>
   */
  await ensureDirCached.ensurePeriodicDirAtPathExists(properties)
} catch (e) {
  // handle error
}
```

[Periodic date time string format](https://moment.github.io/luxon/#/formatting?id=table-of-tokens)


