import fs from 'fs'
import merge from 'lodash.merge'
import { LruCache } from '@tcollinsworth/lrucache'
import { DateTime } from 'luxon'

// example cwd: '/home/username/ensure-path-cached'
const cwd = process.cwd()

const defaultOptions = {
  cacheName: 'ensureDirCache',
  maxEntries: 100,
  ttlMs: 86400000, // 1 day
}

const defaultPeriodicDirProperties = {
  preExistingPathPrefix: cwd,
  pathPrefixToCreate: '',
  date: new Date(),
  dateTimeFormatString: 'yyyyMMdd',
}

export class EnsurePathCached {
  /**
   * Defaults:
   * <pre>
   *   {
   *     maxEntries: 100,
   *     ttlMs: 86400000 // 24 hours
   *   }
   * </pre>
   * @param options
   */
  constructor(optionOverrides = defaultOptions) {
    this.options = JSON.parse(JSON.stringify(defaultOptions))
    this.options = merge(this.options, optionOverrides)

    const nativeCacheOptions = {
      max: this.options.maxEntries,
      ttl: this.options.ttlMs,
      updateAgeOnGet: true,
    }

    this.cache = new LruCache(this.options.cacheName, { nativeCacheOptions })
  }

  /**
   *
   * @param pathToCreate - attempts to create all directories that are missing, default ''
   * @param preExistingPathPrefix - if specified, path must exist or throws Error, default process.cwd()
   * @returns {Promise<boolean>}
   */
  async ensurePathExists(pathToCreate = '', preExistingPathPrefix = cwd) {
    await this.checkPreExistingPathExists(preExistingPathPrefix)
    try {
      if (pathToCreate == null || pathToCreate == '') return true
      const _pathToCreate = `${preExistingPathPrefix}/${pathToCreate}`
      if (this.cache.get(_pathToCreate)) return true
      await fs.promises.mkdir(_pathToCreate, { recursive: true })
      this.cache.put(_pathToCreate, true)
      return true
    } catch (e) {
      throw new Error(`Failed to create path '${pathToCreate}', error.message: ${e.message}`)
    }
  }

  /**
   * properties
   * <pre>
   *   {
   *     preExistingPathPrefix: <String>, // optional path prefix must exist and must not end with / or throws Error, default process.cwd()
   *     pathPrefixToCreate: '/fubar', // optional path relative to preExistingPath must start with /, default ''
   *     date: <Date>, // date for computing periodic dir, default now in UTC
   *     dateTimeFormatString: 'yyyyMMdd', // luxon format string, default yyyyMMdd
   *   }
   * </pre>
   *
   * [Periodic date time format](https://moment.github.io/luxon/#/formatting?id=table-of-tokens)
   *
   * @param properties - attempts to create all directories that are missing, default none
   * @returns {Promise<boolean>}
   */
  async ensurePeriodicDirAtPathExists(properties) {
    const props = merge(defaultPeriodicDirProperties, properties)

    if (props.preExistingPathPrefix.endsWith('/')) throw new Error('preExistingPathPrefix must not end in /')
    if (properties != null && properties.pathPrefixToCreate != null) {
      if (!props.pathPrefixToCreate.startsWith('/')) throw new Error('pathPrefixToCreate must start with /')
      if (props.pathPrefixToCreate.endsWith('/')) throw new Error('pathPrefixToCreate must not end with /')
    }

    const formattedDateString = getFormattedDateString(props.date, props.dateTimeFormatString)

    const completePath = `${props.preExistingPathPrefix}${props.pathPrefixToCreate}/${formattedDateString}`
    if (this.cache.get(completePath)) return true

    const pathToCreate = `${props.pathPrefixToCreate}/${formattedDateString}`
    await this.ensurePathExists(pathToCreate, props.preExistingPathPrefix)

    this.cache.put(completePath, true)
    return true
  }

  /**
   * [Periodic date time format](https://moment.github.io/luxon/#/formatting?id=table-of-tokens)
   * @param preExistingPath - path to check for existence, does not attempt to create
   * @returns {Promise<boolean>} - true if preExistingPath exists, or the passed in preExistingPath is undefined, null or empty
   * @throws Error - if preExistingPath does not exist
   */
  async checkPreExistingPathExists(preExistingPath) {
    try {
      if (preExistingPath == null || preExistingPath === '' || this.cache.get(preExistingPath)) return true
      await fs.promises.access(preExistingPath)
      this.cache.put(preExistingPath, true)
      return true
    } catch (e) {
      throw new Error(`preExistingPath '${preExistingPath}' did not exist, error.message: ${e.message}`)
    }
  }

  /**
   * @returns {*} cache stats
   */
  getCacheStats() {
    return this.cache.getStats(this.options.cacheName)
  }

  /**
   * Clears the caches stats
   */
  resetStats() {
    this.cache.resetStats()
  }

  /**
   * Clear all cache entries
   */
  clearCache() {
    this.cache.clearCache()
  }
}

/**
 * [Periodic date time format](https://moment.github.io/luxon/#/formatting?id=table-of-tokens)
 *
 * @param date - Javascript Date
 * @param formatString - Luxon format string
 * @returns {string}
 */
export function getFormattedDateString(date, formatString) {
  const luxonDate = DateTime.fromJSDate(date).toUTC()
  const formattedDateString = luxonDate.toFormat(formatString)
  return formattedDateString
}
