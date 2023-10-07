const Mutex = require('async-mutex').Mutex
const fs = require('fs-extra')
const path = require('path')

const contexts = new Map()

const storageDir = process.env.STORAGE_DIR

const loadContexts = () => {
  if (!storageDir) throw new Error('Storage directory not specified')
  const files = fs.readdirSync(storageDir)
  const fileRegex = /^(?<chatId>-?[0-9]+)\.json$/
  for (const file of files) {
    try {
      const found = file.match(fileRegex)
      if (!found) continue
      const context = fs.readJsonSync(path.join(storageDir, file))
      if (context?.chatId !== Number(found.groups.chatId)) continue
      context.mutex = new Mutex()
      contexts.set(context.chatId, context)
    } catch (err) {
      console.log('Unable to load context:', err.message)
    }
  }
  console.log('Contexts loaded:', contexts.size)
}

const pushContext = (context) => {
  fs.ensureDirSync(storageDir)
  const { mutex, ...strippedContext } = context
  fs.writeJSONSync(path.join(storageDir, `${context.chatId}.json`), strippedContext)
  if (!context.mutex) context.mutex = new Mutex()
  contexts.set(context.chatId, context)
  return context
}

const pullContext = (chatId) => {
  return contexts.get(chatId)
}

const findContexts = (condition) => {
  const results = []
  if (typeof condition !== 'function') return results
  for (const context of contexts.values()) {
    if (condition(context)) results.push(context)
  }
  return results
}

const deleteContext = ({ chatId }) => {
  fs.removeSync(path.join(storageDir, `${chatId}.json`))
  contexts.delete(chatId)
}

module.exports = {
  loadContexts,
  pushContext,
  pullContext,
  findContexts,
  deleteContext
}
