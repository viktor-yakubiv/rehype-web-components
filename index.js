import { promises as fs } from 'fs'
import path from 'path'
import clone from 'lodash.clonedeep'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import parser from 'rehype-parse'
import formatter from 'rehype-format'
import stringifier from 'rehype-stringify'

const DEFAULT_SLOT = Symbol('default')

const loadComponents = async (dirPath, cacheMap) => {
  const files = await fs.readdir(dirPath)
  const components = await files
    .filter(fileName => /\.html$/.test(fileName))
    .map(fileName => {
      const componentName = path.basename(fileName, '.html')
      return [componentName, path.join(dirPath, fileName)]
    })
    .map(([componentName, filePath]) => {
      return loadComponentFile(filePath)
        .then(component => cacheMap.set(componentName, component))
    })
  return Promise.allSettled(components)
}

const parseComponent = text => {
  const styleNodes = []
  const templateNodes = []

  const nodeExtractor = () => tree => {
    const styleTest = (node, _, parent) =>
      parent === tree && node.tagName === 'style'
    visit(tree, styleTest, node => styleNodes.push(node))

    const templateTest = (node, _, parent) =>
      parent === tree && !/(style|script)/i.test(node.tagName)
    visit(tree, templateTest, node => templateNodes.push(node))
  }

  unified()
    .use(nodeExtractor)
    .runSync(unified()
      .use(parser, { fragment: true })
      .parse(text)
    )

  return {
    styleNodes,
    templateNodes,
  }
}

const loadComponentFile = async (filePath) => {
  const fileContents = await fs.readFile(filePath)
  const { styleNodes, templateNodes } = parseComponent(fileContents)

  const component = (componentNode, index, parent) => {
    const componentTree = {
      type: 'root',
      children: clone(templateNodes),
      position: componentNode.position,
    }

    const { properties = {} } = componentNode
    const slots = componentNode.children.reduce((map, child) => {
      const name = properties?.slot ?? DEFAULT_SLOT
      if (!map.has(name)) map.set(name, [])
      map.get(name).push(child)
      return map
    }, new Map())

    const transformedTree = unified()
      .use(() => tree => {
        visit(tree, node => node.tagName === 'slot', (slotNode, slotNodeIndex, slotParent) => {
          const name = slotNode.properties?.name ?? DEFAULT_SLOT
          const replacement = slots.get(name) ?? slotNode.children ?? []
          slotParent.children.splice(slotNodeIndex, 1, ...replacement)
        })
      })
      .runSync(componentTree)

    return transformedTree.children
  }

  return component
}

const transform = (tree, componentsCache) => {
  for (const [componentName, component] of componentsCache.entries()) {
    const test = node =>
      node.type === 'element' &&
      node.tagName === componentName

    const visitor = (node, index, parent) => {
      const replacement = component(node, index, parent)
      const replacementNodes = Array.isArray(replacement)
        ? replacement
        : [replacement]

      parent.children.splice(index, 1, ...replacementNodes)
    }

    visit(tree, test, visitor)
  }
}

const plugin = (options = {}) => {
  const {
    loadPaths = [],
  } = options

  const componentsCache = new Map()

  return async tree => {
    // Components must be preloaded and cached because
    // visitors do not support promises
    const componentsLoader = loadPaths
      .map(filePath => path.resolve(filePath))
      .map(filePath => loadComponents(filePath, componentsCache))
    await Promise.allSettled(componentsLoader)

    return transform(tree, componentsCache)
  }
}

export default plugin
