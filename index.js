import { promises as fs } from 'fs'
import path from 'path'
import { visit } from 'unist-util-visit'
import DeclarativeComponent from './processors/declarative-component.js'
import ScriptComponent from './processors/script-component.js'

const createComponent = filePath => {
  const type = path.extname(filePath).slice(1)
  const Component = {
    html: DeclarativeComponent,
    js: ScriptComponent,
  }[type]

  return new Component(filePath)
}

const indexComponents = async (...paths) => {
  const files = (await Promise.all(paths.map(async dirPath => {
    const fileNames = await fs.readdir(dirPath)
    const fileList = fileNames
      .filter(fileName => /\.(html|js)$/.test(fileName))
      .map(fileName => path.join(dirPath, fileName))
    return fileList
  }))).flat()

  const indexEntries = files.map(filePath => {
    const name = path.basename(filePath).replace(/\.(html|js)$/, '')
    const component = createComponent(path.resolve(filePath))
    return [name, component]
  })

  return new Map(indexEntries)
}

const attach = (options = {}) => {
  const {
    loadPaths = [],
  } = options

  const transform = async (tree, file) => {
    const componentsIndex = await indexComponents(...loadPaths)

    const asyncUpdates = []

    const test = node => componentsIndex.has(node.tagName)

    const visitor = (node, index, parent) => {
      const component = componentsIndex.get(node.tagName)
      const update = component.render(node, file)
        .then(replacement => {
          const replacementNodes = Array.isArray(replacement)
            ? replacement
            : [replacement]

          parent.children.splice(index, 1, ...replacementNodes)
        })

      asyncUpdates.push(update)
    }

    do {
      asyncUpdates.length = 0
      visit(tree, test, visitor)
      await Promise.all(asyncUpdates)
    } while (asyncUpdates.length > 0)
  }

  return transform
}

export default attach
