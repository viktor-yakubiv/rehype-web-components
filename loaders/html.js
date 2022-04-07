import { promises as fs } from 'fs'
import path from 'path'
import clone from 'lodash.clonedeep'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import parser from 'rehype-parse'
import formatter from 'rehype-format'
import stringifier from 'rehype-stringify'

const DEFAULT_SLOT = Symbol('default')

const trim = nodeList => {
  const test = ({ type, value }) => type === 'element' || /^\s*$/gi.test(value)
  const start = nodeList.findIndex(test)
  const end = nodeList.findIndexLast(test)
  return nodeList.slice(start, end + 1)
}

const split = nodeList => {
  const sortedNodes = [[], [], []]

  nodeList.forEach(node => {
    const listIndex = (['script', 'style'].indexOf(node.tagName) + 3) % 3
    const targetList = sortedNodes[listIndex]
    targetList.push(node)
  })

  const [scriptNodes, styleNodes] = sortedNodes
  const templateNodes = trim(sortedNodes[2])

  // const setupScript = scriptNodes.findLast()
  return {
    scriptNodes,
    styleNodes,
    templateNodes,
  }
}

const parse = text => {
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

const load = async (filePath) => {
  const fileContents = await fs.readFile(filePath)
  const { styleNodes, templateNodes } = parse(fileContents)

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

export default load
