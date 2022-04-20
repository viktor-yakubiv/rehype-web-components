import { promises as fs } from 'fs'
import path from 'path'
import createDeclarativeComponent from '../loaders/html.js'
import createScriptedComponent from '../loaders/script.js'

const indexComponents = async (options = {}) => {
  const {
    components = {},
    paths = [],
    rules = [
      { test: /\.html$/i, use: createDeclarativeComponent },
      { test: /\.js$/i, use: createScriptedComponent },
    ],
    prefix = '',
  } = options

  const ruleFinder = filePath =>
    rules.find(({ test }) => new RegExp(test).test(filePath))

  const files = (await Promise.all(paths.map(async dirPath => {
    const resolvedDir = path.resolve(dirPath)
    const fileNames = await fs.readdir(resolvedDir)
    const fileList = fileNames
      .map(fileName => path.join(resolvedDir, fileName))
      .filter(ruleFinder)
    return fileList
  }))).flat()

  const indexEntries = files.map(filePath => {
    const rule = ruleFinder.call(null, filePath)
    const createComponent = rule.use

    const componentOptions = Object.assign({ prefix }, rule.options ?? {})
    const component = createComponent(filePath, componentOptions)
    return [component.name, component]
  })

  return new Map([
    ...indexEntries,
    ...Object.entries(components),
  ])
}

export default indexComponents
