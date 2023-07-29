// eslint-disable-next-line import/no-unresolved
import ava from 'ava'
import fs from 'fs'
import { EnsurePathCached } from '../ensure-path-cached.mjs'

const test = ava.serial

const ensurePath = new EnsurePathCached()

const cwd = process.cwd()

const testDirPrefix = `${cwd}/__tests__`

const testCreateDir = 'testCreateDir'
const testCreatePath = `${testDirPrefix}/${testCreateDir}`

const pathPrefixToCreate = '/pathPrefixToCreate'
const testDate = new Date(2020, 0, 1, 0, 0, 0)
const testDateDirString = '20200101'

test.beforeEach(async (t) => {
  await cleanup(t)
})

test.afterEach(async (t) => {
  await cleanup(t)
})

async function cleanup() {
  try {
    await fs.promises.rm(testCreatePath)
  } catch (e) {
    /* ignore, probably already removed */
  }
  try {
    await ensurePath.checkPreExistingPathExists(testCreatePath)
    throw new Error(`failed to clean up ${testCreatePath}`)
  } catch (e) {
    /* expected, ignore */
  }
  try {
    await fs.promises.rm(`${testDirPrefix}${pathPrefixToCreate}`, { recursive: true })
  } catch (e) {
    /* ignore, probably already removed */
  }
  try {
    await fs.promises.rm(`${testDirPrefix}/${testCreateDir}`, { recursive: true })
  } catch (e) {
    /* ignore, probably already removed */
  }
  ensurePath.resetStats()
  ensurePath.clearCache()
}

test('preexisting path', async (t) => {
  t.truthy(await ensurePath.checkPreExistingPathExists(`${process.cwd()}/__tests__`))
  t.truthy(await ensurePath.checkPreExistingPathExists(`${process.cwd()}/__tests__`))
})

test('missing preexisting path', async (t) => {
  const error = await t.throwsAsync(ensurePath.checkPreExistingPathExists(`${process.cwd()}/NOT_EXISTS`))
  t.truthy(error.message.includes('preExistingPath'))
  t.truthy(error.message.includes('did not exist'))
})

test('ensurePathExists', async (t) => {
  const preExistingPathPrefix = `${process.cwd()}/__tests__`
  await ensurePath.ensurePathExists(testCreateDir, preExistingPathPrefix)
  // throws error if dir wasn't created
  await fs.promises.access(`${preExistingPathPrefix}/${testCreateDir}`)

  t.is(ensurePath.getCacheStats().hits, 0)
  t.is(ensurePath.getCacheStats().misses, 2)

  // try again to ensure cache is working
  await ensurePath.ensurePathExists(testCreateDir, preExistingPathPrefix)

  t.is(ensurePath.getCacheStats().hits, 2)
  t.is(ensurePath.getCacheStats().misses, 2)
})

test('ensurePathExists pathToCreate null', async (t) => {
  const preExistingPathPrefix = `${process.cwd()}/__tests__`
  await ensurePath.ensurePathExists(null, preExistingPathPrefix)
  // throws error if dir wasn't created
  await fs.promises.access(`${preExistingPathPrefix}`)

  t.is(ensurePath.getCacheStats().hits, 0)
  t.is(ensurePath.getCacheStats().misses, 1)
})

test('ensurePathExists pathToCreate undefined', async (t) => {
  const preExistingPathPrefix = `${process.cwd()}/__tests__`
  await ensurePath.ensurePathExists(undefined, preExistingPathPrefix)
  // throws error if dir wasn't created
  await fs.promises.access(`${preExistingPathPrefix}`)

  t.is(ensurePath.getCacheStats().hits, 0)
  t.is(ensurePath.getCacheStats().misses, 1)
})

test('ensurePathExists pathToCreate \'\'', async (t) => {
  const preExistingPathPrefix = `${process.cwd()}/__tests__`
  await ensurePath.ensurePathExists('', preExistingPathPrefix)
  // throws error if dir wasn't created
  await fs.promises.access(`${preExistingPathPrefix}`)

  t.is(ensurePath.getCacheStats().hits, 0)
  t.is(ensurePath.getCacheStats().misses, 1)
})

test('ensurePathExists not allowed', async (t) => {
  const preExistingPathPrefix = '/dev/null'
  const error = await t.throwsAsync(ensurePath.ensurePathExists(testCreateDir, preExistingPathPrefix))
  t.truthy(error.message.includes('Failed to create path'))
  t.truthy(error.message.includes(', error.message:'))
})

test('ensurePathExists missing preexistingPathPrefix', async (t) => {
  const preExistingPathPrefix = `${cwd}/NOT_EXISTS`
  const error = await t.throwsAsync(ensurePath.ensurePathExists(testCreateDir, preExistingPathPrefix))
  t.truthy(error.message.includes('preExistingPath'))
  t.truthy(error.message.includes('did not exist'))
})

test('ensurePeriodicDirAtPathExists pathPrefixToCreate and test date', async (t) => {
  const props = {
    preExistingPathPrefix: testDirPrefix,
    pathPrefixToCreate,
    date: testDate,
  }

  const expectedCompletePath = `${testDirPrefix}${pathPrefixToCreate}/${testDateDirString}`

  let completePath = await ensurePath.ensurePeriodicDirAtPathExists(props)

  // throws error if dir wasn't created
  await fs.promises.access(expectedCompletePath)

  t.is(completePath, expectedCompletePath)
  t.is(ensurePath.getCacheStats().hits, 0)
  t.is(ensurePath.getCacheStats().misses, 3)

  completePath = await ensurePath.ensurePeriodicDirAtPathExists(props)

  t.is(completePath, expectedCompletePath)
  t.is(ensurePath.getCacheStats().hits, 1)
  t.is(ensurePath.getCacheStats().misses, 3)
})

test('preExisting bad /NON_EXISTENT', async (t) => {
  const props = {
    preExistingPathPrefix: '/NON_EXISTENT',
  }

  const error = await t.throwsAsync(ensurePath.ensurePeriodicDirAtPathExists(props))
  t.truthy(error.message.includes('preExistingPath'))
  t.truthy(error.message.includes('did not exist'))
  t.is(ensurePath.getCacheStats().hits, 0)
  t.is(ensurePath.getCacheStats().misses, 2)
})

// Manually tested, leaves unpredictable file in root dir due to potential date rollover
test.skip('preExisting none, pathPrefixToCreate none and no date', async (t) => {
  const props = {}

  await ensurePath.ensurePeriodicDirAtPathExists(props)

  // throws error if dir wasn't created
  await fs.promises.access(`${testDirPrefix}`)

  t.is(ensurePath.getCacheStats().hits, 0)
  t.is(ensurePath.getCacheStats().misses, 3) // final, preExisting, prefix

  await ensurePath.ensurePeriodicDirAtPathExists(props)

  t.is(ensurePath.getCacheStats().hits, 1)
  t.is(ensurePath.getCacheStats().misses, 3) // final, preExisting, prefix
})

test('create in non-existing location and non-writable dir /dev/SHOULD_FAIL', async (t) => {
  const props = {
    preExistingPathPrefix: '/dev',
    pathPrefixToCreate: '/SHOULD_FAIL',
  }

  const error = await t.throwsAsync(ensurePath.ensurePeriodicDirAtPathExists(props))
  t.truthy(error.message.includes('Failed to create path'))
  t.truthy(error.message.includes('permission denied'))
  t.is(ensurePath.getCacheStats().hits, 0)
  t.is(ensurePath.getCacheStats().misses, 3) // final, preExisting, prefix
})

test('dateTimeStringFormat changed', async (t) => {
  const props = {
    preExistingPathPrefix: testDirPrefix,
    pathPrefixToCreate,
    date: testDate,
    dateTimeFormatString: 'yyyyMM',
  }

  await ensurePath.ensurePeriodicDirAtPathExists(props)

  // throws error if dir wasn't created
  await fs.promises.access(`${testDirPrefix}${pathPrefixToCreate}/202001`)

  t.is(ensurePath.getCacheStats().hits, 0)
  t.is(ensurePath.getCacheStats().misses, 3)
})

// TODO
//       if (props.pathPrefixToCreate.endsWith('/')) throw new Error('pathPrefixToCreate must not end with /')
//     }

test('preExistingPathPrefix must not end in /', async (t) => {
  const props = {
    preExistingPathPrefix: '/dev/',
  }

  const error = await t.throwsAsync(ensurePath.ensurePeriodicDirAtPathExists(props))
  t.truthy(error.message.includes('preExistingPathPrefix must not end in /'))
  t.is(ensurePath.getCacheStats().hits, 0)
  t.is(ensurePath.getCacheStats().misses, 0)
})

test('pathPrefixToCreate must start with /', async (t) => {
  const props = {
    preExistingPathPrefix: '/dev',
    pathPrefixToCreate: 'should_start_with_foreslash',
  }

  const error = await t.throwsAsync(ensurePath.ensurePeriodicDirAtPathExists(props))
  t.truthy(error.message.includes('pathPrefixToCreate must start with /'))
  t.is(ensurePath.getCacheStats().hits, 0)
  t.is(ensurePath.getCacheStats().misses, 0)
})

test('pathPrefixToCreate must not end with /', async (t) => {
  const props = {
    preExistingPathPrefix: '/dev',
    pathPrefixToCreate: '/should_start_end_with_foreslash/',
  }

  const error = await t.throwsAsync(ensurePath.ensurePeriodicDirAtPathExists(props))
  t.truthy(error.message.includes('pathPrefixToCreate must not end with /'))
  t.is(ensurePath.getCacheStats().hits, 0)
  t.is(ensurePath.getCacheStats().misses, 0)
})
