import { promises as fs } from 'fs'
import path from 'path'
import clone from 'lodash.clonedeep'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import parser from 'rehype-parse'
import formatter from 'rehype-format'
import stringifier from 'rehype-stringify'
import Template from './template.js'

const DEFAULT_SLOT = Symbol('default')

const split = nodeList => {
  const sortedNodes = [[], [], []]

  nodeList.forEach(node => {
    const listIndex = (['script', 'style'].indexOf(node.tagName) + 3) % 3
    const targetList = sortedNodes[listIndex]
    targetList.push(node)
  })

  const [scriptNodes, styleNodes, templateNodes] = sortedNodes

  // TODO: Subject of discussion
  // It's supposed to be a custom hook before template substitution
  // but this is different from what Vue or Svelte does
  const setupScript = scriptNodes
    .reverse()
    .find(({ properties }) => properties.setup != null)

  return {
    setupScript,
    scriptNodes,
    styleNodes,
    templateNodes,
  }
}

const parse = text => {
  const componentTree = unified()
    .use(parser, { fragment: true })
    .parse(text)

  return split(componentTree.children)
}

const load = async (filePath) => {
  const fileContents = await fs.readFile(filePath)
  const { templateNodes } = parse(fileContents)

  const template = new Template(templateNodes)

  const component = async (hostTree, index, parent) => {
    const shadowTree = await template.render(hostTree)
    return shadowTree.children
  }

  return component
}

export default load
