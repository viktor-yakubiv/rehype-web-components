import { promises as fs } from 'fs'
import path from 'path'
import clone from 'lodash.clonedeep'
import memoize from 'lodash.memoize'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import parser from 'rehype-parse'
import formatter from 'rehype-format'
import stringifier from 'rehype-stringify'
import { html as loadHtmlComponent } from './loaders/index.js'

const loadComponent = memoize(loadHtmlComponent)

const indexComponents = async (...paths) => {
  const files = (await Promise.all(paths.map(async dirPath => {
    const fileNames = await fs.readdir(dirPath)
    const fileList = fileNames
      .filter(fileName => /\.html$/.test(fileName))
      .map(fileName => path.join(dirPath, fileName))
    return fileList
  }))).flat()

  const indexEntries = files.map(filePath => {
    const name = path.basename(filePath, '.html')
    return [name, filePath]
  })

  return new Map(indexEntries)
}

const attach = (options = {}) => {
  const {
    loadPaths = [],
  } = options

  const transform = async tree => {
    const componentsIndex = await indexComponents(...loadPaths)
    const asyncUpdates = []

    const test = node => componentsIndex.has(node.tagName)

    const visitor = (node, index, parent) => {
      const componentPath = componentsIndex.get(node.tagName)
      const update = loadComponent(componentPath)
        .then(component => component(node, index, parent))
        .then(replacement => {
          const replacementNodes = Array.isArray(replacement)
            ? replacement
            : [replacement]

          parent.children.splice(index, 1, ...replacementNodes)
        })

      asyncUpdates.push(update)
    }

    visit(tree, test, visitor)

    await Promise.all(asyncUpdates)
  }

  return transform
}

export default attach
